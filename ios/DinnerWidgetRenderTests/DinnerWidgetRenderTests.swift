import SwiftUI
import WidgetKit
import XCTest

final class DinnerWidgetRenderTests: XCTestCase {
    // Native view renders with explicit WidgetKit-sized content margins. This does
    // not run the WidgetKit host, timeline scheduler, or SpringBoard tap handling.
    @MainActor func testSmallAndMediumStatesInBothLanguages() throws {
        let now = Date()
        let day = DinnerDates.key(now)
        for language in ["en", "da"] {
            for state in ["planned", "empty", "completed", "unknown", "long-name"] {
                let name = state == "long-name"
                    ? (language == "da" ? "Ovnbagte grøntsager med citron og sprøde kikærter" : "Roasted vegetables with lemon and crispy chickpeas")
                    : (language == "da" ? "Grøntsagssuppe" : "Tomato pasta")
                let data: DinnerWidgetData? = state == "unknown" ? nil : .init(startDay: day, endDay: day,
                    dinners: state == "empty" ? [] : [.init(day: day, name: name, completed: state == "completed")])
                let entry = DinnerEntry(date: now, data: data, language: language)
                let view = HStack(alignment: .top, spacing: 20) {
                    card(entry, width: 170)
                    card(entry, width: 364)
                }.padding(20).background(Color.white)
                let renderer = ImageRenderer(content: view)
                renderer.scale = 3
                let image = try XCTUnwrap(renderer.uiImage)
                XCTAssertEqual(image.size.width, 594)
                XCTAssertEqual(image.size.height, 210)
                let attachment = XCTAttachment(image: image)
                attachment.name = "widget-\(state)-\(language)-small-medium"
                attachment.lifetime = .keepAlways
                add(attachment)
            }
        }
    }

    private func card(_ entry: DinnerEntry, width: CGFloat) -> some View {
        DinnerWidgetView(entry: entry)
            .environment(\.locale, Locale(identifier: entry.language))
            .environment(\.colorScheme, .light)
            .padding(16)
            .frame(width: width, height: 170)
            .background(Color(red: 1, green: 0.976, blue: 0.914), in: RoundedRectangle(cornerRadius: 24))
    }
}
