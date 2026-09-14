#if DEBUG
import Foundation

/// Opt-in, read-only fixtures for native simulator UI tests. Never bundled in Release.
enum SimulatorFixture: String {
    case populated, member, empty, completed, error, loading, signedOut, restoring

    static var current: Self? {
        let arguments = ProcessInfo.processInfo.arguments
        guard let index = arguments.firstIndex(of: "--fixture"), arguments.indices.contains(index + 1) else { return nil }
        return Self(rawValue: arguments[index + 1])
    }

    static let configuration = Configuration(convexURL: "https://fixture.invalid",
        workosClientID: "fixture", webURL: URL(string: "https://fixture.invalid")!,
        redirectURI: "loopdish://auth/callback")

    @MainActor func populate(_ store: Store) {
        let date = DinnerDates.calendar().date(from: DateComponents(year: 2026, month: 9, day: 11, hour: 12))!
        store.selectedDate = date
        store.weekAnchor = date
        store.restoring = self == .restoring
        store.signedIn = self != .signedOut
        guard self != .signedOut && self != .loading && self != .restoring else { return }
        let home = Household(id: "home", name: "Our kitchen")
        store.dashboard = Dashboard(household: self == .empty ? nil : home,
            dishes: self == .empty ? [] : [
                Dish(_id: "d1", name: "Roasted tomato pasta", notes: "Basil, garlic and a little parmesan", lastEatenOn: "2026-09-08", timesEaten: 4),
                Dish(_id: "d2", name: "Crispy chickpea bowls", notes: "Lemon yoghurt and cucumber", lastEatenOn: nil, timesEaten: 0)
            ],
            plannedMeals: self == .empty ? [] : [Meal(_id: "m1", dishId: "d1", dishName: "Roasted tomato pasta", date: "2026-09-11", completedAt: self == .completed ? 1789131600000 : nil)],
            recentMeals: self == .empty ? [] : [DinnerEvent(_id: "e1", dishName: "Roasted tomato pasta", eatenOn: "2026-09-08")])
        store.household = HouseholdDetails(household: self == .empty ? nil : home,
            members: self == .empty ? [] : [
                Member(id: "u1", name: "Alex", email: nil, role: "owner", isCurrentUser: self != .member),
                Member(id: "u2", name: "Sofie Østergaard", email: nil, role: "member", isCurrentUser: self == .member)
            ],
            canManageHousehold: self != .member)
        if self == .error { store.error = "The network connection was lost. Please try again." }
    }
}
#endif
