import Foundation

struct Configuration: Decodable {
    let convexURL: String
    let workosClientID: String
    let webURL: URL
    let redirectURI: String

    static func load() throws -> Configuration {
        guard let url = Bundle.main.url(forResource: "Configuration.local", withExtension: "json") else {
            throw CocoaError(.fileNoSuchFile)
        }
        return try JSONDecoder().decode(Self.self, from: Data(contentsOf: url))
    }
}

struct Household: Decodable { let id: String; let name: String }
struct Dish: Decodable, Identifiable {
    let _id: String
    let name: String
    let notes: String?
    let lastEatenOn: String?
    let timesEaten: Double
    var id: String { _id }
}
struct Meal: Decodable, Identifiable {
    let _id: String
    let dishId: String
    let dishName: String
    let date: String
    let completedAt: Double?
    var id: String { _id }
}
struct DinnerEvent: Decodable, Identifiable {
    let _id: String
    let dishName: String
    let eatenOn: String
    var id: String { _id }
}
struct Dashboard: Decodable {
    let household: Household?
    let dishes: [Dish]
    let plannedMeals: [Meal]
    let recentMeals: [DinnerEvent]
}
struct Member: Decodable {
    let id: String?
    let name: String
    let email: String?
    let role: String
    let isCurrentUser: Bool
}
struct HouseholdDetails: Decodable {
    let household: Household?
    let members: [Member]
    let canManageHousehold: Bool
}
struct Suggestion: Decodable {
    let name: String
    let notes: String
    let reason: String
    let date: String?
}
struct Suggestions: Decodable {
    let kind: String
    let dishes: [Suggestion]?
    let meals: [Suggestion]?
}
struct AppliedWeek: Decodable { let preservedDates: [String] }
struct Invite: Decodable { let householdName: String; let available: Bool }

enum DinnerDates {
    static func calendar(timeZone: TimeZone = .current) -> Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        calendar.firstWeekday = 2
        return calendar
    }

    static func key(_ date: Date, calendar: Calendar = calendar()) -> String {
        let parts = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", parts.year!, parts.month!, parts.day!)
    }

    static func week(containing date: Date, calendar: Calendar = calendar()) -> [Date] {
        let start = calendar.startOfDay(for: date)
        let offset = (calendar.component(.weekday, from: start) + 5) % 7
        let monday = calendar.date(byAdding: .day, value: -offset, to: start)!
        return (0..<7).map { calendar.date(byAdding: .day, value: $0, to: monday)! }
    }

    static func inviteID(_ value: String, webURL: URL) -> String? {
        guard let url = URL(string: value.trimmingCharacters(in: .whitespacesAndNewlines)),
              url.scheme == "https", url.host == webURL.host,
              url.user == nil, url.password == nil else { return nil }
        let parts = url.pathComponents
        guard parts.count == 3, parts[1] == "join", !parts[2].isEmpty else { return nil }
        return parts[2]
    }
}
