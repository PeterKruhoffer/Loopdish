import Foundation

struct DinnerWidgetData: Codable, Equatable {
    struct Dinner: Codable, Equatable {
        let day: String
        let name: String
        let completed: Bool
    }

    let startDay: String
    let endDay: String
    let dinners: [Dinner]

    func contains(_ date: Date, calendar: Calendar = DinnerDates.calendar()) -> Bool {
        let day = DinnerDates.key(date, calendar: calendar)
        return startDay <= day && day <= endDay
    }

    func dinner(on date: Date, calendar: Calendar = DinnerDates.calendar()) -> Dinner? {
        dinners.first { $0.day == DinnerDates.key(date, calendar: calendar) }
    }

    // Calendar arithmetic keeps entries at local midnight across DST changes.
    static func timelineDates(from now: Date, calendar: Calendar = DinnerDates.calendar()) -> [Date] {
        [now] + (1...7).map {
            calendar.date(byAdding: .day, value: $0, to: calendar.startOfDay(for: now))!
        }
    }
}

enum DinnerWidgetCache {
    static let kind = "TodayDinner"
    static let appGroup = "group.com.loopdish.ios"
    static let url = URL(string: "loopdish://dinner/today")!
    static let dataKey = "dinnerWidgetData"
    static var defaults: UserDefaults? { UserDefaults(suiteName: appGroup) }

    static func read(from defaults: UserDefaults? = defaults) -> DinnerWidgetData? {
        guard let data = defaults?.data(forKey: dataKey) else { return nil }
        return try? JSONDecoder().decode(DinnerWidgetData.self, from: data)
    }

    @discardableResult
    static func write(_ data: DinnerWidgetData?, to defaults: UserDefaults? = defaults) -> Bool {
        guard let defaults else { return false }
        if let data {
            guard read(from: defaults) != data else { return false }
            guard let encoded = try? JSONEncoder().encode(data) else { return false }
            defaults.set(encoded, forKey: dataKey)
        } else {
            guard defaults.object(forKey: dataKey) != nil else { return false }
            defaults.removeObject(forKey: dataKey)
        }
        return true
    }

    static func isTodayURL(_ url: URL) -> Bool {
        url.scheme == "loopdish" && url.host == "dinner" && url.path == "/today"
            && url.user == nil && url.password == nil && url.port == nil
            && url.query == nil && url.fragment == nil
    }
}
