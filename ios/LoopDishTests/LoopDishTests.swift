import XCTest
import UIKit
import ConvexMobile
@testable import LoopDish

final class LoopDishTests: XCTestCase {
    func testDuplicateDishErrorDecodesJSONWithoutShowingSDKDetails() throws {
        for name in ["Risengrød", "Soup \"special\"\n🍲"] {
            let data = String(decoding: try JSONEncoder().encode("\(name) is already in your dishes"), as: UTF8.self)
            XCTAssertEqual(ErrorMessage.text(for: ClientError.ConvexError(data: data)),
                           "This dish is already saved. You can choose it from your dishes.")
        }
    }

    func testUnknownErrorsNeverExposeTechnicalDetails() {
        let errors: [Error] = [
            ClientError.ConvexError(data: "not JSON"),
            ClientError.ConvexError(data: #"{"internal":"secret"}"#),
            ClientError.ConvexError(data: #""Database failure: secret""#),
            ClientError.ServerError(msg: "Stack trace: secret"),
            ClientError.InternalError(msg: "Failed to decode: secret"),
            NSError(domain: "secret", code: 123, userInfo: [NSLocalizedDescriptionKey: "secret"]),
        ]
        for error in errors {
            XCTAssertEqual(ErrorMessage.text(for: error), "We couldn't complete that. Please try again.")
        }
        XCTAssertEqual(ErrorMessage.text(for: WorkOSAuthError.oauth("secret")),
                       "Couldn't complete sign-in or sign-out. Please try again.")
        XCTAssertEqual(ErrorMessage.text(for: URLError(.notConnectedToInternet)),
                       "Couldn't connect to LoopDish. Check your internet connection and try again.")
    }

    func testKnownErrorsGiveAnActionAndDanishTranslation() throws {
        let cases = [
            ("Sign in to use LoopDish", "Please sign in to continue.", "Log ind for at fortsætte."),
            ("That invite is no longer available", "This invitation is unavailable or expired. Ask for a new invitation link.", "Invitationen virker ikke længere. Bed om et nyt invitationslink."),
            ("This household has used its five AI suggestions for the last 24 hours", "Your household has used all five suggestions for now. Please try again tomorrow.", "Jeres husstand har brugt alle fem forslag for nu. Prøv igen i morgen."),
            ("Risengrød is already in your dishes", "This dish is already saved. You can choose it from your dishes.", "Retten er allerede gemt. Du kan vælge den under Retter."),
        ]
        let path = try XCTUnwrap(Bundle.main.path(forResource: "da", ofType: "lproj"))
        let danish = try XCTUnwrap(Bundle(path: path))
        for (server, english, translation) in cases {
            let data = String(decoding: try JSONEncoder().encode(server), as: UTF8.self)
            let key = ErrorMessage.text(for: ClientError.ConvexError(data: data))
            XCTAssertEqual(key, english)
            XCTAssertEqual(danish.localizedString(forKey: key, value: nil, table: nil), translation)
        }
    }

    @MainActor func testLaunchStoryboardResourcesLayoutAndBackground() throws {
        XCTAssertEqual(Bundle.main.object(forInfoDictionaryKey: "UILaunchStoryboardName") as? String, "LaunchScreen")
        for size in [CGSize(width: 320, height: 568), CGSize(width: 402, height: 874), CGSize(width: 1024, height: 1366)] {
            let controller = try XCTUnwrap(UIStoryboard(name: "LaunchScreen", bundle: .main).instantiateInitialViewController())
            let view = try XCTUnwrap(controller.view)
            view.frame = CGRect(origin: .zero, size: size)
            view.layoutIfNeeded()
            let brand = try XCTUnwrap(view.subviews.compactMap { $0 as? UIImageView }.first)
            XCTAssertNotNil(brand.image)
            XCTAssertFalse(brand.hasAmbiguousLayout)
            XCTAssertEqual(brand.frame.width, min(size.width * 0.36, 240), accuracy: 0.5)
            XCTAssertEqual(brand.frame.midX, size.width / 2, accuracy: 0.5)
            XCTAssertEqual(brand.frame.midY, size.height * 0.47, accuracy: 0.5)
            XCTAssertEqual(brand.frame.height / brand.frame.width, 510.0 / 450, accuracy: 0.01)
            var red: CGFloat = 0, green: CGFloat = 0, blue: CGFloat = 0, alpha: CGFloat = 0
            XCTAssertTrue(try XCTUnwrap(view.backgroundColor).getRed(&red, green: &green, blue: &blue, alpha: &alpha))
            XCTAssertEqual(red, 1, accuracy: 0.000001)
            XCTAssertEqual(green, 249.0 / 255, accuracy: 0.000001)
            XCTAssertEqual(blue, 237.0 / 255, accuracy: 0.000001)
            XCTAssertEqual(alpha, 1, accuracy: 0.000001)
            let image = UIGraphicsImageRenderer(size: size).image { context in view.layer.render(in: context.cgContext) }
            let attachment = XCTAttachment(image: image)
            attachment.name = "launch-storyboard-\(Int(size.width))x\(Int(size.height))"
            attachment.lifetime = .keepAlways
            add(attachment)
        }
    }

    func testOAuthCallbackValidatesStateAndRedirectBeforeAcceptingCode() throws {
        let redirect = URL(string: "loopdish://auth/callback")!
        let valid = URL(string: "loopdish://auth/callback?code=valid-code&state=expected-state")!
        XCTAssertEqual(try WorkOSAuthProvider.validate(valid, redirect: redirect, state: "expected-state"), "valid-code")
        for invalid in [
            "loopdish://auth/callback?code=valid-code&state=wrong-state",
            "loopdish://auth/callback?code=valid-code",
            "loopdish://auth/callback?code=valid-code&state=expected-state&state=expected-state",
            "loopdish://other/callback?code=valid-code&state=expected-state",
            "loopdish://auth/other?code=valid-code&state=expected-state",
            "other://auth/callback?code=valid-code&state=expected-state",
            "loopdish://auth/callback?code=one&code=two&state=expected-state",
        ] {
            XCTAssertThrowsError(try WorkOSAuthProvider.validate(URL(string: invalid)!, redirect: redirect, state: "expected-state"), invalid)
        }
    }

    func testWeekAcrossYearBoundaryStartsMonday() throws {
        let calendar = DinnerDates.calendar(timeZone: TimeZone(identifier: "Europe/Copenhagen")!)
        let date = try XCTUnwrap(ISO8601DateFormatter().date(from: "2026-01-01T12:00:00Z"))
        XCTAssertEqual(DinnerDates.week(containing: date, calendar: calendar).map { DinnerDates.key($0, calendar: calendar) },
                       ["2025-12-29", "2025-12-30", "2025-12-31", "2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"])
    }

    func testDinnerDateUsesLocalDayNotUTC() throws {
        let calendar = DinnerDates.calendar(timeZone: TimeZone(identifier: "Europe/Copenhagen")!)
        let date = try XCTUnwrap(ISO8601DateFormatter().date(from: "2026-03-28T23:30:00Z"))
        XCTAssertEqual(DinnerDates.key(date, calendar: calendar), "2026-03-29")
        let days = DinnerDates.week(containing: date, calendar: calendar)
        XCTAssertEqual(DinnerDates.key(days[0], calendar: calendar), "2026-03-23")
        XCTAssertEqual(DinnerDates.key(days[6], calendar: calendar), "2026-03-29")
        let monday = calendar.date(byAdding: .day, value: 1, to: days[6])!
        XCTAssertEqual(DinnerDates.key(monday, calendar: calendar), "2026-03-30")
        XCTAssertEqual(monday.timeIntervalSince(days[6]), 23 * 3600)
    }

    func testInviteLinksRequireConfiguredOriginAndExactPath() {
        let origin = URL(string: "https://loopdish.example")!
        XCTAssertEqual(DinnerDates.inviteID("https://loopdish.example/join/abc123", webURL: origin), "abc123")
        for invalid in ["https://other.example/join/abc123", "http://loopdish.example/join/abc123", "https://loopdish.example/join", "https://loopdish.example/join/abc123/extra", "https://loopdish.example@other.example/join/abc123"] {
            XCTAssertNil(DinnerDates.inviteID(invalid, webURL: origin), invalid)
        }
    }

    func testDashboardDecodesOptionalFieldsAndConvexNumbers() throws {
        let json = #"{"household":null,"dishes":[{"_id":"d1","name":"Soup","timesEaten":2}],"plannedMeals":[{"_id":"p1","dishId":"d1","dishName":"Soup","date":"2026-09-11","completedAt":1789131600000}],"recentMeals":[{"_id":"e1","dishName":"Soup","eatenOn":"2026-09-11"}]}"#
        let result = try JSONDecoder().decode(Dashboard.self, from: Data(json.utf8))
        XCTAssertNil(result.household)
        XCTAssertNil(result.dishes[0].notes)
        XCTAssertEqual(result.dishes[0].timesEaten, 2)
        XCTAssertEqual(result.plannedMeals[0].completedAt, 1789131600000)
        XCTAssertEqual(result.recentMeals[0].id, "e1")
    }
}
