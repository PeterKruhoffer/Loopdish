import Combine
import ConvexMobile
import Foundation

@MainActor
final class Store: ObservableObject {
    let configuration: Configuration
    private let authProvider: WorkOSAuthProvider
    private lazy var client = ConvexClientWithAuth(deploymentUrl: configuration.convexURL,
                                                 authProvider: authProvider)
    @Published var signedIn = false
    @Published var restoring = true
    @Published var busy = false
    @Published var error: String?
    @Published var dashboard: Dashboard?
    @Published var household: HouseholdDetails?
    @Published var suggestions: Suggestions?
    @Published var notice: String?
    @Published var selectedDate = Date()
    @Published var weekAnchor = Date()
    private var authSubscription: AnyCancellable?
    private var dashboardSubscription: AnyCancellable?
    private var householdSubscription: AnyCancellable?
    var days: [Date] { DinnerDates.week(containing: weekAnchor) }
    var range: [String: ConvexEncodable?] {
        ["startDate": DinnerDates.key(days[0]), "endDate": DinnerDates.key(days[6])]
    }

    init(configuration: Configuration) {
        self.configuration = configuration
        authProvider = WorkOSAuthProvider(clientID: configuration.workosClientID,
                                          redirectURI: configuration.redirectURI)
        #if DEBUG
        if let fixture = SimulatorFixture.current {
            fixture.populate(self)
            return
        }
        #endif
        authSubscription = client.authState.receive(on: DispatchQueue.main).sink { [weak self] state in
            guard let self else { return }
            switch state {
            case .authenticated:
                self.signedIn = true
                self.subscribe()
            case .unauthenticated:
                self.signedIn = false
                self.clearData()
            case .loading: break
            }
        }
    }

    func restore() async {
        #if DEBUG
        guard SimulatorFixture.current == nil else { return }
        #endif
        let result = await client.loginFromCache()
        if case .failure(let failure) = result {
            if case WorkOSAuthError.noCachedSession = failure {
                restoring = false
                return
            }
            error = failure.localizedDescription
        }
        restoring = false
    }

    func signIn() async {
        #if DEBUG
        guard SimulatorFixture.current == nil else { return }
        #endif
        guard !busy else { return }
        busy = true
        defer { busy = false }
        if case .failure(let failure) = await client.login() { error = failure.localizedDescription }
    }

    func signOut() async {
        await perform {
            // The SDK logs provider logout failures instead of throwing them.
            // Clear credentials explicitly so Keychain errors reach the user.
            try await authProvider.logout()
            await client.logout()
            signedIn = false
            clearData()
        }
    }

    private func clearData() {
        dashboardSubscription = nil
        householdSubscription = nil
        dashboard = nil
        household = nil
        suggestions = nil
        notice = nil
    }

    func subscribe() {
        #if DEBUG
        guard SimulatorFixture.current == nil else { return }
        #endif
        guard signedIn else { return }
        dashboardSubscription = client.subscribe(to: "dashboard:get", with: range, yielding: Dashboard.self)
            .receive(on: DispatchQueue.main)
            .sink(receiveCompletion: { [weak self] completion in
                if case .failure(let failure) = completion { self?.error = failure.localizedDescription }
            }, receiveValue: { [weak self] in self?.dashboard = $0 })
        householdSubscription = client.subscribe(to: "households:get", yielding: HouseholdDetails.self)
            .receive(on: DispatchQueue.main)
            .sink(receiveCompletion: { [weak self] completion in
                if case .failure(let failure) = completion { self?.error = failure.localizedDescription }
            }, receiveValue: { [weak self] in self?.household = $0 })
    }

    func changeWeek(_ offset: Int) {
        weekAnchor = DinnerDates.calendar().date(byAdding: .day, value: offset * 7, to: weekAnchor)!
        selectedDate = days[0]
        dashboard = nil
        suggestions = nil
        subscribe()
    }

    @discardableResult
    func perform(_ operation: () async throws -> Void) async -> Bool {
        #if DEBUG
        guard SimulatorFixture.current == nil else {
            error = "Simulator fixtures are read-only. No request was sent."
            return false
        }
        #endif
        guard !busy else { return false }
        busy = true
        defer { busy = false }
        do { try await operation(); return true }
        catch { self.error = error.localizedDescription; return false }
    }

    func addDish(name: String, notes: String) async -> Bool {
        await perform {
            let _: String = try await client.mutation("dishes:add", with: ["name": name, "notes": notes])
        }
    }

    func plan(_ dish: Dish, date: Date) async -> Bool {
        await perform {
            let _: String = try await client.mutation("mealPlans:plan",
                with: ["dishId": dish.id, "date": DinnerDates.key(date)])
        }
    }

    func updateMeal(_ meal: Meal, eaten: Bool) async {
        await perform {
            try await client.mutation(eaten ? "mealPlans:markEaten" : "mealPlans:remove", with: ["planId": meal.id])
        }
    }

    func rename(_ name: String) async {
        await perform { try await client.mutation("households:rename", with: ["name": name]) }
    }

    func createInvite() async -> URL? {
        var url: URL?
        await perform {
            let id: String = try await client.mutation("households:createInvite")
            url = configuration.webURL.appendingPathComponent("join").appendingPathComponent(id)
        }
        return url
    }

    func inspectInvite(_ id: String) async throws -> Invite? {
        for try await invite in client.subscribe(to: "households:getInvite", with: ["inviteId": id], yielding: Invite?.self).values {
            return invite
        }
        return nil
    }

    func join(_ id: String) async -> Bool {
        await perform { try await client.mutation("households:acceptInvite", with: ["inviteId": id]) }
    }

    func generate(weekly: Bool, language: String) async {
        await perform {
            var arguments = range
            arguments["kind"] = weekly ? "weekly_plan" : "new_dishes"
            arguments["language"] = language
            suggestions = try await client.action("suggestions:generate", with: arguments)
        }
    }

    func applySuggestions() async -> Bool {
        guard let meals = suggestions?.meals else { return false }
        return await perform {
            let values: [ConvexEncodable?] = meals.map { meal in
                ["date": meal.date, "name": meal.name, "notes": meal.notes] as [String: ConvexEncodable?]
            }
            let result: AppliedWeek = try await client.mutation("mealPlans:applySuggestion", with: ["meals": values])
            notice = result.preservedDates.isEmpty ? nil : "Completed dinners were kept: " + result.preservedDates.joined(separator: ", ")
            suggestions = nil
        }
    }
}
