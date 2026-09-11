import AuthenticationServices
import ConvexMobile
import CryptoKit
import Foundation
import Security
import UIKit

public struct NativeSession: Sendable {
    public let accessToken: String

    public init(accessToken: String) {
        self.accessToken = accessToken
    }
}

public enum WorkOSAuthError: Error, LocalizedError {
    case invalidConfiguration
    case noCachedSession
    case invalidCallback
    case stateMismatch
    case invalidResponse
    case oauth(String)
    case keychain(OSStatus)

    public var errorDescription: String? {
        switch self {
        case .invalidConfiguration: return "The WorkOS redirect URI is invalid."
        case .noCachedSession: return "No cached WorkOS session is available."
        case .invalidCallback: return "WorkOS returned an unexpected callback URL."
        case .stateMismatch: return "The OAuth state did not match."
        case .invalidResponse: return "WorkOS returned an invalid response."
        case .oauth(let message): return message
        case .keychain(let status): return "Keychain operation failed (\(status))."
        }
    }
}

/// A native WorkOS AuthKit public-client provider for ConvexMobile 0.8.1.
public final class WorkOSAuthProvider: AuthProvider, @unchecked Sendable {
    public typealias T = NativeSession

    private let lifecycle: SessionLifecycle
    @MainActor private lazy var browser = BrowserPresenter()

    public init(clientID: String, redirectURI: String) {
        lifecycle = SessionLifecycle(clientID: clientID, redirectURI: redirectURI)
    }

    public nonisolated func login(
        onIdToken: @Sendable @escaping (String?) -> Void
    ) async throws -> NativeSession {
        let request = try await lifecycle.beginLogin(callback: onIdToken)
        do {
            let callbackURL = try await browser.open(
                url: request.authorizationURL,
                callbackScheme: request.redirect.scheme!
            )
            let code = try Self.validate(callbackURL, redirect: request.redirect, state: request.state)
            return try await lifecycle.finishLogin(code: code, verifier: request.verifier, generation: request.generation)
        } catch {
            await lifecycle.abortLogin(generation: request.generation)
            throw error
        }
    }

    public nonisolated func loginFromCache(
        onIdToken: @Sendable @escaping (String?) -> Void
    ) async throws -> NativeSession {
        try await lifecycle.restore(callback: onIdToken)
    }

    public nonisolated func logout() async throws {
        await browser.cancel()
        try await lifecycle.logout()
    }

    public nonisolated func extractIdToken(from session: NativeSession) -> String {
        session.accessToken
    }

    nonisolated static func validate(_ callback: URL, redirect: URL, state: String) throws -> String {
        guard callback.scheme?.lowercased() == redirect.scheme?.lowercased(),
              callback.host?.lowercased() == redirect.host?.lowercased(),
              callback.path == redirect.path,
              callback.port == redirect.port,
              callback.user == nil,
              callback.password == nil,
              let components = URLComponents(url: callback, resolvingAgainstBaseURL: false)
        else { throw WorkOSAuthError.invalidCallback }

        let values = Dictionary(grouping: components.queryItems ?? [], by: \.name)
        guard values["state"]?.count == 1,
              values["state"]?.first?.value == state
        else { throw WorkOSAuthError.stateMismatch }
        if let message = values["error_description"]?.first?.value ?? values["error"]?.first?.value {
            throw WorkOSAuthError.oauth(message)
        }
        guard values["code"]?.count == 1, let code = values["code"]?.first?.value, !code.isEmpty else {
            throw WorkOSAuthError.invalidCallback
        }
        return code
    }
}

private struct LoginRequest: Sendable {
    let authorizationURL: URL
    let redirect: URL
    let state: String
    let verifier: String
    let generation: UInt64
}

private struct TokenResponse: Decodable, Sendable {
    let accessToken: String
    let refreshToken: String?

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
    }
}

private struct OAuthErrorResponse: Decodable {
    let error: String?
    let errorDescription: String?

    enum CodingKeys: String, CodingKey {
        case error
        case errorDescription = "error_description"
    }
}

private actor SessionLifecycle {
    private let clientID: String
    private let redirect: URL?
    private let keychain: RefreshTokenStore
    private let urlSession: URLSession
    private var accessToken: String?
    private var callback: (@Sendable (String?) -> Void)?
    private var refreshTask: Task<Void, Never>?
    private var tokenRequest: Task<TokenResponse, Error>?
    private var generation: UInt64 = 0

    init(clientID: String, redirectURI: String) {
        self.clientID = clientID
        redirect = URL(string: redirectURI)
        keychain = RefreshTokenStore(account: clientID + "|" + redirectURI)
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 30
        configuration.timeoutIntervalForResource = 60
        urlSession = URLSession(configuration: configuration)
    }

    func beginLogin(callback: @Sendable @escaping (String?) -> Void) throws -> LoginRequest {
        guard !clientID.isEmpty, let redirect, let scheme = redirect.scheme, !scheme.isEmpty,
              redirect.fragment == nil else { throw WorkOSAuthError.invalidConfiguration }
        generation &+= 1
        refreshTask?.cancel()
        refreshTask = nil
        tokenRequest?.cancel()
        tokenRequest = nil
        self.callback = callback

        let verifier = try Self.randomURLSafe(byteCount: 32)
        let state = try Self.randomURLSafe(byteCount: 32)
        let digest = SHA256.hash(data: Data(verifier.utf8))
        let challenge = Data(digest).base64URLEncodedString()
        var parts = URLComponents(string: "https://api.workos.com/user_management/authorize")!
        parts.queryItems = [
            URLQueryItem(name: "client_id", value: clientID),
            URLQueryItem(name: "redirect_uri", value: redirect.absoluteString),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "provider", value: "authkit"),
            URLQueryItem(name: "code_challenge", value: challenge),
            URLQueryItem(name: "code_challenge_method", value: "S256"),
            URLQueryItem(name: "state", value: state),
        ]
        guard let authorizationURL = parts.url else { throw WorkOSAuthError.invalidConfiguration }
        return LoginRequest(authorizationURL: authorizationURL, redirect: redirect, state: state,
                            verifier: verifier, generation: generation)
    }

    func abortLogin(generation expected: UInt64) {
        if generation == expected { callback = nil }
    }

    func finishLogin(code: String, verifier: String, generation expected: UInt64) async throws -> NativeSession {
        guard generation == expected, let redirect else { throw CancellationError() }
        let tokens = try await authenticate([
            "client_id": clientID,
            "grant_type": "authorization_code",
            "code": code,
            "code_verifier": verifier,
            "redirect_uri": redirect.absoluteString,
        ])
        guard generation == expected else { throw CancellationError() }
        guard let refreshToken = tokens.refreshToken, !refreshToken.isEmpty else {
            throw WorkOSAuthError.invalidResponse
        }
        try keychain.save(refreshToken)
        guard generation == expected else { throw CancellationError() }
        accessToken = tokens.accessToken
        scheduleRefresh(for: tokens.accessToken, generation: expected)
        return NativeSession(accessToken: tokens.accessToken)
    }

    func restore(callback: @Sendable @escaping (String?) -> Void) async throws -> NativeSession {
        generation &+= 1
        let expected = generation
        refreshTask?.cancel()
        refreshTask = nil
        self.callback = callback
        guard let refreshToken = try keychain.load() else { throw WorkOSAuthError.noCachedSession }
        do {
            return try await refresh(refreshToken: refreshToken, generation: expected)
        } catch HTTPFailure.terminal {
            guard generation == expected else { throw CancellationError() }
            accessToken = nil
            self.callback = nil
            try keychain.delete()
            callback(nil)
            throw WorkOSAuthError.noCachedSession
        }
    }

    func logout() throws {
        generation &+= 1
        refreshTask?.cancel()
        refreshTask = nil
        tokenRequest?.cancel()
        tokenRequest = nil
        accessToken = nil
        callback = nil
        try keychain.delete()
    }

    private func refresh(refreshToken: String, generation expected: UInt64) async throws -> NativeSession {
        // Convex may request a refresh while the timer's request is still in flight.
        // Share the exchange so a rotating refresh token is never consumed twice.
        let request: Task<TokenResponse, Error>
        if let tokenRequest {
            request = tokenRequest
        } else {
            request = Task {
                try await self.authenticate([
                    "client_id": self.clientID,
                    "grant_type": "refresh_token",
                    "refresh_token": refreshToken,
                ])
            }
            tokenRequest = request
        }
        defer { if generation == expected { tokenRequest = nil } }
        let tokens = try await request.value
        guard generation == expected else { throw CancellationError() }
        let nextRefreshToken = tokens.refreshToken ?? refreshToken
        try keychain.save(nextRefreshToken)
        guard generation == expected else { throw CancellationError() }
        accessToken = tokens.accessToken
        callback?(tokens.accessToken)
        scheduleRefresh(for: tokens.accessToken, generation: expected)
        return NativeSession(accessToken: tokens.accessToken)
    }

    private func scheduleRefresh(for token: String, generation expected: UInt64) {
        refreshTask?.cancel()
        let expiration = Self.jwtExpiration(token) ?? Date().addingTimeInterval(5 * 60)
        let delay = max(5, expiration.timeIntervalSinceNow - 60)
        refreshTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(delay))
            guard !Task.isCancelled else { return }
            await self?.scheduledRefresh(generation: expected)
        }
    }

    private func scheduledRefresh(generation expected: UInt64) async {
        guard generation == expected else { return }
        do {
            guard let refreshToken = try keychain.load() else { throw WorkOSAuthError.noCachedSession }
            _ = try await refresh(refreshToken: refreshToken, generation: expected)
        } catch is CancellationError {
            return
        } catch HTTPFailure.terminal {
            guard generation == expected else { return }
            accessToken = nil
            try? keychain.delete()
            refreshTask = nil
            callback?(nil)
        } catch {
            // Network failures and 5xx/429 responses retain the session and retry with backoff.
            guard generation == expected else { return }
            refreshTask = Task { [weak self] in
                try? await Task.sleep(for: .seconds(30))
                guard !Task.isCancelled else { return }
                await self?.scheduledRefresh(generation: expected)
            }
        }
    }

    private func authenticate(_ fields: [String: String]) async throws -> TokenResponse {
        var request = URLRequest(url: URL(string: "https://api.workos.com/user_management/authenticate")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.httpBody = try JSONSerialization.data(withJSONObject: fields)
        do {
            let (data, response) = try await urlSession.data(for: request)
            guard let http = response as? HTTPURLResponse else { throw WorkOSAuthError.invalidResponse }
            guard (200..<300).contains(http.statusCode) else {
                let body = try? JSONDecoder().decode(OAuthErrorResponse.self, from: data)
                let message = body?.errorDescription ?? body?.error ?? "WorkOS authentication failed (\(http.statusCode))."
                if http.statusCode == 429 || http.statusCode >= 500 { throw HTTPFailure.transient(message) }
                throw HTTPFailure.terminal(message)
            }
            return try JSONDecoder().decode(TokenResponse.self, from: data)
        } catch let error as HTTPFailure {
            throw error
        } catch let error as URLError {
            throw HTTPFailure.transient(error.localizedDescription)
        }
    }

    private static func randomURLSafe(byteCount: Int) throws -> String {
        var bytes = [UInt8](repeating: 0, count: byteCount)
        let status = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        guard status == errSecSuccess else { throw WorkOSAuthError.keychain(status) }
        return Data(bytes).base64URLEncodedString()
    }

    private static func jwtExpiration(_ token: String) -> Date? {
        let parts = token.split(separator: ".", omittingEmptySubsequences: false)
        guard parts.count == 3,
              let data = Data(base64URL: String(parts[1])),
              let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let seconds = object["exp"] as? NSNumber else { return nil }
        return Date(timeIntervalSince1970: seconds.doubleValue)
    }
}

private enum HTTPFailure: Error, LocalizedError {
    case transient(String)
    case terminal(String)

    var errorDescription: String? {
        switch self {
        case .transient(let message), .terminal(let message): return message
        }
    }
}

@MainActor
private final class BrowserPresenter: NSObject, ASWebAuthenticationPresentationContextProviding {
    private var session: ASWebAuthenticationSession?

    func open(url: URL, callbackScheme: String) async throws -> URL {
        cancel()
        return try await withTaskCancellationHandler {
            try await withCheckedThrowingContinuation { continuation in
                let webSession = ASWebAuthenticationSession(url: url, callbackURLScheme: callbackScheme) {
                    [weak self] callbackURL, error in
                    Task { @MainActor in
                        self?.session = nil
                        if let error { continuation.resume(throwing: error) }
                        else if let callbackURL { continuation.resume(returning: callbackURL) }
                        else { continuation.resume(throwing: WorkOSAuthError.invalidCallback) }
                    }
                }
                webSession.presentationContextProvider = self
                webSession.prefersEphemeralWebBrowserSession = true
                session = webSession
                guard webSession.start() else {
                    session = nil
                    continuation.resume(throwing: WorkOSAuthError.invalidConfiguration)
                    return
                }
            }
        } onCancel: {
            Task { @MainActor [weak self] in self?.cancel() }
        }
    }

    func cancel() {
        session?.cancel()
        session = nil
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        return scenes.flatMap(\.windows).first(where: \.isKeyWindow) ?? ASPresentationAnchor()
    }
}

private struct RefreshTokenStore: Sendable {
    private let service = "com.loopdish.workos.refresh-token"
    private let account: String

    init(account: String) { self.account = account }

    func load() throws -> String? {
        var query = baseQuery
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess else { throw WorkOSAuthError.keychain(status) }
        guard let data = result as? Data, let token = String(data: data, encoding: .utf8) else {
            throw WorkOSAuthError.invalidResponse
        }
        return token
    }

    func save(_ token: String) throws {
        let data = Data(token.utf8)
        let attributes = [kSecValueData as String: data]
        let updateStatus = SecItemUpdate(baseQuery as CFDictionary, attributes as CFDictionary)
        if updateStatus == errSecItemNotFound {
            var item = baseQuery
            item[kSecValueData as String] = data
            item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
            let addStatus = SecItemAdd(item as CFDictionary, nil)
            guard addStatus == errSecSuccess else { throw WorkOSAuthError.keychain(addStatus) }
        } else if updateStatus != errSecSuccess {
            throw WorkOSAuthError.keychain(updateStatus)
        }
    }

    func delete() throws {
        let status = SecItemDelete(baseQuery as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw WorkOSAuthError.keychain(status)
        }
    }

    private var baseQuery: [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
    }
}

private extension Data {
    func base64URLEncodedString() -> String {
        base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    init?(base64URL: String) {
        var value = base64URL.replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        value += String(repeating: "=", count: (4 - value.count % 4) % 4)
        self.init(base64Encoded: value)
    }
}
