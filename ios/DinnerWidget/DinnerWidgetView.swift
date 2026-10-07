import SwiftUI
import WidgetKit

struct DinnerEntry: TimelineEntry {
    let date: Date
    let data: DinnerWidgetData?
    let language: String
}

struct DinnerWidgetView: View {
    let entry: DinnerEntry
    private let ink = Color(red: 0.149, green: 0.208, blue: 0.184)
    private var danish: Bool { entry.language == "da" }
    private var dinner: DinnerWidgetData.Dinner? { entry.data?.dinner(on: entry.date) }
    private var known: Bool { entry.data?.contains(entry.date) == true }

    private var title: String {
        if let dinner { return dinner.name }
        if known { return danish ? "Hvad skal vi spise?" : "What's for dinner?" }
        return danish ? "Åbn LoopDish" : "Open LoopDish"
    }

    private var action: String {
        if dinner?.completed == true { return danish ? "Middagen er nydt" : "Dinner enjoyed" }
        if dinner != nil { return danish ? "Se dagens plan" : "View today's plan" }
        if known { return danish ? "Tryk for at vælge en ret" : "Tap to plan dinner" }
        return danish ? "Synkroniser din madplan" : "Sync your dinner plan"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label(danish ? "Aftensmad i dag" : "Tonight's dinner", systemImage: "fork.knife")
                .font(.caption.weight(.semibold))
            Spacer(minLength: 0)
            Text(title).font(.system(.title2, design: .rounded, weight: .bold))
                .lineLimit(3).minimumScaleFactor(0.8)
            Spacer(minLength: 0)
            Label(action, systemImage: dinner?.completed == true ? "checkmark.circle.fill" : "arrow.up.right")
                .font(.caption).fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .foregroundStyle(ink)
        .containerBackground(Color(red: 1, green: 0.976, blue: 0.914), for: .widget)
        .widgetURL(DinnerWidgetCache.url)
        .privacySensitive()
    }
}
