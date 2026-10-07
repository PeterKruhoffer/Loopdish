import SwiftUI
import WidgetKit

struct DinnerProvider: TimelineProvider {
    func placeholder(in context: Context) -> DinnerEntry {
        let now = Date()
        let day = DinnerDates.key(now)
        return DinnerEntry(date: now, data: DinnerWidgetData(startDay: day, endDay: day,
            dinners: [.init(day: day, name: "Pasta", completed: false)]), language: language)
    }

    private var language: String {
        DinnerWidgetCache.defaults?.string(forKey: "language")
            ?? (Locale.current.language.languageCode?.identifier == "da" ? "da" : "en")
    }

    func getSnapshot(in context: Context, completion: @escaping (DinnerEntry) -> Void) {
        completion(context.isPreview ? placeholder(in: context)
            : DinnerEntry(date: Date(), data: DinnerWidgetCache.read(), language: language))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<DinnerEntry>) -> Void) {
        let data = DinnerWidgetCache.read()
        let entries = DinnerWidgetData.timelineDates(from: Date()).map {
            DinnerEntry(date: $0, data: data, language: language)
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

@main
struct TodayDinnerWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: DinnerWidgetCache.kind, provider: DinnerProvider()) { entry in
            DinnerWidgetView(entry: entry)
        }
        .configurationDisplayName("Tonight's dinner")
        .description("See today's dinner and tap to plan it in LoopDish.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

#if DEBUG
struct DinnerWidgetPreviews: PreviewProvider {
    static var previews: some View {
        let now = Date()
        let day = DinnerDates.key(now)
        let planned = DinnerWidgetData(startDay: day, endDay: day, dinners: [
            .init(day: day, name: "Roasted vegetables with lemon and chickpeas", completed: false),
        ])
        let completed = DinnerWidgetData(startDay: day, endDay: day, dinners: [
            .init(day: day, name: "Grøntsagssuppe", completed: true),
        ])
        Group {
            DinnerWidgetView(entry: .init(date: now, data: planned, language: "en"))
                .previewContext(WidgetPreviewContext(family: .systemSmall))
                .previewDisplayName("Planned, long name")
            DinnerWidgetView(entry: .init(date: now, data: .init(startDay: day, endDay: day, dinners: []), language: "en"))
                .previewContext(WidgetPreviewContext(family: .systemSmall))
                .previewDisplayName("No dinner")
            DinnerWidgetView(entry: .init(date: now, data: completed, language: "da"))
                .previewContext(WidgetPreviewContext(family: .systemMedium))
                .previewDisplayName("Completed, Danish")
            DinnerWidgetView(entry: .init(date: now, data: nil, language: "da"))
                .previewContext(WidgetPreviewContext(family: .systemSmall))
                .previewDisplayName("Needs sync, Danish")
        }
    }
}
#endif
