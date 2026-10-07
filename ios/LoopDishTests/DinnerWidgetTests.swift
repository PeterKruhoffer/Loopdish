import XCTest
@testable import LoopDish

final class DinnerWidgetTests: XCTestCase {
    private let calendar = DinnerDates.calendar(timeZone: TimeZone(identifier: "Europe/Copenhagen")!)

    private func date(_ value: String) -> Date {
        ISO8601DateFormatter().date(from: value)!
    }

    func testLocalDaySelectsDinnerAndDistinguishesEmptyFromUnknown() {
        let data = DinnerWidgetData(startDay: "2026-03-28", endDay: "2026-03-30", dinners: [
            .init(day: "2026-03-28", name: "Soup", completed: false),
            .init(day: "2026-03-29", name: "Pasta", completed: true),
        ])
        let beforeMidnight = date("2026-03-28T22:59:59Z")
        let afterMidnight = date("2026-03-28T23:00:00Z")
        XCTAssertEqual(data.dinner(on: beforeMidnight, calendar: calendar)?.name, "Soup")
        XCTAssertEqual(data.dinner(on: afterMidnight, calendar: calendar)?.name, "Pasta")
        XCTAssertEqual(data.dinner(on: afterMidnight, calendar: calendar)?.completed, true)
        let empty = date("2026-03-30T12:00:00Z")
        XCTAssertTrue(data.contains(empty, calendar: calendar))
        XCTAssertNil(data.dinner(on: empty, calendar: calendar))
        for unknown in ["2026-03-27T12:00:00Z", "2026-03-31T12:00:00Z"] {
            XCTAssertFalse(data.contains(date(unknown), calendar: calendar))
        }
    }

    func testMidnightTimelineCrossesBothDSTChangesAndNewYear() {
        for (start, firstMidnight, secondMidnight) in [
            ("2026-03-28T12:00:00Z", "2026-03-28T23:00:00Z", "2026-03-29T22:00:00Z"),
            ("2026-10-24T12:00:00Z", "2026-10-24T22:00:00Z", "2026-10-25T23:00:00Z"),
            ("2026-12-31T12:00:00Z", "2026-12-31T23:00:00Z", "2027-01-01T23:00:00Z"),
        ] {
            let entries = DinnerWidgetData.timelineDates(from: date(start), calendar: calendar)
            XCTAssertEqual(entries.count, 8)
            XCTAssertEqual(entries[0], date(start))
            XCTAssertEqual(entries[1], date(firstMidnight))
            XCTAssertEqual(entries[2], date(secondMidnight))
            XCTAssertTrue(entries.dropFirst().allSatisfy { calendar.component(.hour, from: $0) == 0 })
        }
    }

    func testCacheRoundTripRemovalAndSignOutClearing() throws {
        let suite = "DinnerWidgetTests.\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        let data = DinnerWidgetData(startDay: "2026-10-06", endDay: "2026-10-12", dinners: [
            .init(day: "2026-10-06", name: "Grøntsagssuppe", completed: false),
        ])
        XCTAssertTrue(DinnerWidgetCache.write(data, to: defaults))
        XCTAssertEqual(DinnerWidgetCache.read(from: defaults), data)
        XCTAssertFalse(DinnerWidgetCache.write(data, to: defaults))
        let removed = DinnerWidgetData(startDay: data.startDay, endDay: data.endDay, dinners: [])
        XCTAssertTrue(DinnerWidgetCache.write(removed, to: defaults))
        XCTAssertEqual(DinnerWidgetCache.read(from: defaults)?.dinners, [])
        XCTAssertTrue(DinnerWidgetCache.write(nil, to: defaults))
        XCTAssertNil(defaults.data(forKey: DinnerWidgetCache.dataKey))
        defaults.set(Data("invalid".utf8), forKey: DinnerWidgetCache.dataKey)
        XCTAssertNil(DinnerWidgetCache.read(from: defaults))
        XCTAssertTrue(DinnerWidgetCache.write(nil, to: defaults))
        XCTAssertNil(defaults.data(forKey: DinnerWidgetCache.dataKey))
    }

    func testWidgetRouteDoesNotHandleAuthOrUnrelatedURLs() {
        XCTAssertTrue(DinnerWidgetCache.isTodayURL(URL(string: "loopdish://dinner/today")!))
        for invalid in ["loopdish://auth/callback", "https://dinner/today", "loopdish://dinner/tomorrow",
                        "loopdish://dinner/today?date=2026-10-05", "loopdish://other/today"] {
            XCTAssertFalse(DinnerWidgetCache.isTodayURL(URL(string: invalid)!))
        }
    }
}
