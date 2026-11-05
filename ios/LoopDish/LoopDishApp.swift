import SwiftUI

@main
struct LoopDishApp: App {
    init() {
        #if DEBUG
        let arguments = ProcessInfo.processInfo.arguments
        if SimulatorFixture.current != nil,
           let index = arguments.firstIndex(of: "--fixture-language"),
           arguments.indices.contains(index + 1), ["en", "da"].contains(arguments[index + 1]) {
            UserDefaults.standard.set(arguments[index + 1], forKey: "language")
        }
        #endif
    }

    private var configuration: Configuration? {
        #if DEBUG
        if SimulatorFixture.current != nil { return SimulatorFixture.configuration }
        #endif
        return try? Configuration.load()
    }
    var body: some Scene {
        WindowGroup {
            if let configuration {
                AppRoot(configuration: configuration)
            } else {
                ContentUnavailableView("Configure LoopDish", systemImage: "gearshape",
                    description: Text("Copy Configuration.example.json to Configuration.local.json and fill in your existing Convex deployment, WorkOS client ID, and website URL. See ios/README.md."))
            }
        }
    }
}

enum Palette {
    static let ink = Color(red: 0.149, green: 0.208, blue: 0.184)
    static let cream = Color(red: 1, green: 0.976, blue: 0.914)
    static let coral = Color(red: 0.957, green: 0.635, blue: 0.561)
    static let mint = Color(red: 0.875, green: 0.925, blue: 0.886)
    static let paper = Color(red: 1, green: 0.996, blue: 0.976)
}

struct AppRoot: View {
    @StateObject private var store: Store
    @AppStorage("language") private var language = Locale.current.language.languageCode?.identifier == "da" ? "da" : "en"
    @Environment(\.scenePhase) private var scenePhase
    @State private var selectedTab = 0
    @State private var widgetNavigationID = UUID()

    init(configuration: Configuration) { _store = StateObject(wrappedValue: Store(configuration: configuration)) }

    var body: some View {
        Group {
            if store.restoring { LaunchSplash().ignoresSafeArea() }
            else if store.signedIn {
                TabView(selection: $selectedTab) {
                    WeekView(initialDay: store.selectedDate).tabItem { Label("Week", systemImage: "calendar") }.tag(0)
                    DishesView().tabItem { Label("Dishes", systemImage: "fork.knife") }.tag(1)
                    HistoryView().tabItem { Label("History", systemImage: "clock") }.tag(2)
                    HouseholdView().tabItem { Label("Household", systemImage: "person.2") }.tag(3)
                }
                .id(widgetNavigationID)
            } else {
                VStack(alignment: .leading, spacing: 24) {
                    Label("LoopDish", systemImage: "fork.knife.circle").font(.title2.bold())
                    Spacer()
                    Image(systemName: "takeoutbag.and.cup.and.straw").font(.system(size: 72)).foregroundStyle(Palette.coral)
                    Text("Dinner, on repeat.").font(.largeTitle.bold())
                    Text("Your regular dishes, weekly plan, and shared dinner history. All in one home.")
                    Button("Sign in") { Task { await store.signIn() } }.buttonStyle(PrimaryButton())
                        .disabled(store.busy)
                    RequestStatus()
                    Spacer()
                }.padding(28).frame(maxWidth: 560).frame(maxWidth: .infinity, maxHeight: .infinity).background(Palette.cream)
            }
        }
        .environmentObject(store)
        .environment(\.locale, Locale(identifier: language))
        .tint(Palette.ink)
        .preferredColorScheme(.light)
        .task { await store.restore() }
        .task(id: language) { store.syncWidgetLanguage(language) }
        .onOpenURL { url in
            guard DinnerWidgetCache.isTodayURL(url) else { return }
            selectedTab = 0
            // Recreate tab content to dismiss any sheet left open for a different day.
            widgetNavigationID = UUID()
            store.openToday()
        }
        .onChange(of: scenePhase) { _, phase in if phase == .active { store.subscribe() } }
    }
}

struct RequestStatus: View {
    @EnvironmentObject private var store: Store
    var body: some View {
        if store.busy { ProgressView() }
        if let error = store.error {
            VStack(alignment: .leading, spacing: 8) {
                Text("Something went wrong").font(.headline)
                Text(LocalizedStringKey(error)).font(.callout)
                Button("OK") { store.error = nil }
            }.padding().frame(maxWidth: .infinity, alignment: .leading)
                .background(Palette.mint, in: RoundedRectangle(cornerRadius: 16))
                .accessibilityElement(children: .contain)
        }
    }
}

struct PrimaryButton: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled
    func makeBody(configuration: ButtonStyleConfiguration) -> some View {
        configuration.label.font(.headline).padding(.horizontal, 22).padding(.vertical, 14)
            .foregroundStyle(Palette.cream).background(Palette.ink.opacity(configuration.isPressed ? 0.7 : 1), in: Capsule())
            .opacity(isEnabled ? 1 : 0.45)
    }
}

struct Page<Content: View>: View {
    let title: LocalizedStringKey
    @ViewBuilder var content: Content
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) { RequestStatus(); content }
                    .padding(20).frame(maxWidth: 720).frame(maxWidth: .infinity)
            }.background(Palette.cream).navigationTitle(title)
        }
    }
}

struct WeekView: View {
    @EnvironmentObject private var store: Store
    @Environment(\.locale) private var locale
    @State private var choosingDish = false
    @State private var showingSuggestions = false
    @State private var removing: Meal?
    /// Offset from carouselOrigin of the card being shown.
    @State private var page: Int?
    /// Centre of the carousel's fixed day range. Swipes never change it, so each card keeps its day across weeks.
    @State private var carouselOrigin: Date
    /// Fractional offset of the card being shown, updated live while swiping.
    @State private var carouselPosition: CGFloat?
    @State private var pageWidth: CGFloat = 1
    private let carouselRadius = 30

    init(initialDay: Date) {
        _carouselOrigin = State(initialValue: initialDay)
        _page = State(initialValue: 0)
    }
    var body: some View {
        Page(title: "This week") {
            HStack {
                Button { store.changeWeek(-1) } label: { Image(systemName: "chevron.left").frame(width: 44, height: 44) }.accessibilityLabel("Previous week")
                Spacer()
                Text(store.days[0], format: .dateTime.month(.abbreviated).day()).font(.headline)
                Text("–")
                Text(store.days[6], format: .dateTime.month(.abbreviated).day()).font(.headline)
                Spacer()
                Button { store.changeWeek(1) } label: { Image(systemName: "chevron.right").frame(width: 44, height: 44) }.accessibilityLabel("Next week")
            }.disabled(store.busy)
            dayStrip
            // Paging carousel over a fixed range of days: the selected day's card slides out as the next one slides in.
            ScrollView(.horizontal) {
                // Not lazy: on iOS 26, LazyHStack ignores accessibilityHidden, which would expose off-screen days.
                HStack(spacing: 0) {
                    ForEach(-carouselRadius...carouselRadius, id: \.self) { offset in
                        let day = carouselDay(at: offset)
                        let hidden = DinnerDates.key(day) != DinnerDates.key(store.selectedDate)
                        // Off-screen cards are hidden, so only the shown day's controls are exposed.
                        card(for: day, animated: abs(offset - (page ?? 0)) <= 1)
                            .padding(.horizontal, 10).containerRelativeFrame(.horizontal)
                            .modifier(HiddenWhen(hidden: hidden))
                    }
                }.scrollTargetLayout()
                    .onGeometryChange(for: CGFloat.self) { $0.frame(in: .scrollView).minX } action: { minX in
                        let position = -minX / pageWidth - CGFloat(carouselRadius)
                        carouselPosition = position
                        // Re-centre only once a swipe has settled on the last card. Re-centring mid-scroll
                        // lets the still-moving scroll view report its old index against the new origin.
                        if let page, abs(page) == carouselRadius, abs(position - CGFloat(page)) < 0.01 {
                            carouselOrigin = carouselDay(at: page)
                            self.page = 0
                        }
                    }
            }
            .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { pageWidth = max($0, 1) }
            // Pages are 20 pt wider than the column so cards keep the column width with a gap between them.
            .padding(.horizontal, -10)
            .scrollIndicators(.hidden).scrollClipDisabled().scrollTargetBehavior(.paging)
            // The origin is the day selected when the view was created, so the centre of the range is the right card.
            .defaultScrollAnchor(.center).scrollPosition(id: $page).scrollDisabled(store.busy)
            .onChange(of: DinnerDates.key(store.selectedDate)) {
                // Strip taps and week arrows jump straight to the card; only swipes animate.
                // A jump outside the range re-centres on the new day.
                guard let offset = carouselOffset(of: store.selectedDate) else {
                    carouselOrigin = store.selectedDate
                    page = 0
                    return
                }
                if page != offset { page = offset }
            }
            .onChange(of: page) { _, offset in
                if let offset, offset != carouselOffset(of: store.selectedDate) { store.select(carouselDay(at: offset)) }
            }
            if let dashboard = store.dashboard {
                Button { showingSuggestions = true } label: { Label("Help plan my week", systemImage: "sparkles") }
                    .disabled(dashboard.dishes.isEmpty || store.busy)
                if let notice = store.notice { Text(notice).font(.footnote) }
            } else {
                Button("Retry") { store.subscribe() }
            }
        }
        .sheet(isPresented: $choosingDish) { DishPicker(date: store.selectedDate) }
        .sheet(isPresented: $showingSuggestions) { SuggestionsView(weekly: true) }
        .confirmationDialog("Remove this dinner?", isPresented: Binding(get: { removing != nil }, set: { if !$0 { removing = nil } })) {
            Button("Remove", role: .destructive) { if let meal = removing { Task { await store.updateMeal(meal, eaten: false) } }; removing = nil }
        }
    }

    /// One ink capsule follows the carousel, stretching and thinning between days like slime, then settling into a pill.
    private var dayStrip: some View {
        let index = pillIndex
        let fraction = index - floor(index)
        let stretch = 0.6 * sin(.pi * fraction)
        return HStack(spacing: 8) {
            ForEach(Array(store.days.enumerated()), id: \.element) { i, day in
                let selected = DinnerDates.key(day) == DinnerDates.key(store.selectedDate)
                Button { store.selectedDate = day } label: {
                    // The label is drawn once and turns cream only where the capsule covers it,
                    // so VoiceOver reads one letter and number.
                    pillLabel(for: day).foregroundStyle(Palette.ink)
                        .overlay { SlimeCapsule(offset: index - CGFloat(i), stretch: stretch).fill(Palette.cream).blendMode(.sourceAtop) }
                        .compositingGroup()
                        .overlay(alignment: .bottom) { plannedDot(for: day) }
                        // Keeps large Dynamic Type inside the pill, as before.
                        .clipShape(RoundedRectangle(cornerRadius: 22))
                }.accessibilityLabel(day.formatted(.dateTime.weekday(.wide).day().month(.wide).year().locale(locale)))
                    .accessibilityIdentifier("week-day-\(DinnerDates.key(day))")
                    .accessibilityAddTraits(selected ? .isSelected : [])
            }
        }
        .background {
            // Drawn once behind the strip so the capsule stays visible in the gaps between pills.
            GeometryReader { proxy in
                SlimeCapsule(offset: index, stretch: stretch).fill(Palette.ink).frame(width: (proxy.size.width + 8) / 7 - 8)
            }
        }
        .background {
            HStack(spacing: 8) { ForEach(0..<7, id: \.self) { _ in RoundedRectangle(cornerRadius: 22).fill(Palette.paper) } }
        }
        // While crossing a week boundary the capsule leaves one edge and enters from the other.
        .clipped()
    }

    /// The capsule's fractional position in this week's pills, following the carousel while it scrolls.
    /// Outside 0...6 while crossing into another week.
    private var pillIndex: CGFloat {
        let calendar = DinnerDates.calendar()
        let weekStart = calendar.startOfDay(for: store.days[0])
        func days(to day: Date) -> CGFloat {
            CGFloat(calendar.dateComponents([.day], from: weekStart, to: calendar.startOfDay(for: day)).day!)
        }
        guard let carouselPosition else { return days(to: store.selectedDate) }
        return days(to: carouselOrigin) + carouselPosition
    }

    private func carouselDay(at offset: Int) -> Date {
        let calendar = DinnerDates.calendar()
        return calendar.date(byAdding: .day, value: offset, to: calendar.startOfDay(for: carouselOrigin))!
    }

    /// The day's offset from carouselOrigin, or nil when it is outside the carousel's range.
    private func carouselOffset(of day: Date) -> Int? {
        let calendar = DinnerDates.calendar()
        let offset = calendar.dateComponents([.day], from: calendar.startOfDay(for: carouselOrigin),
                                             to: calendar.startOfDay(for: day)).day!
        return abs(offset) <= carouselRadius ? offset : nil
    }

    private func pillLabel(for day: Date) -> some View {
        VStack(spacing: 8) {
            Text(day, format: .dateTime.weekday(.narrow)).font(.caption)
            Text(day, format: .dateTime.day()).font(.headline)
            // Room for the planned-dinner dot, drawn on top by plannedDot(for:) so the capsule never tints it.
            Color.clear.frame(width: 5, height: 5)
        }.lineLimit(1).minimumScaleFactor(0.5)
            .frame(minWidth: 0, maxWidth: .infinity).padding(.vertical, 12)
    }

    private func plannedDot(for day: Date) -> some View {
        Circle().fill(store.dashboard?.plannedMeals.contains(where: { $0.date == DinnerDates.key(day) }) == true ? Palette.coral : .clear)
            .frame(width: 5, height: 5).padding(.bottom, 12)
    }

    private func isLoaded(_ day: Date) -> Bool {
        store.days.contains { DinnerDates.key($0) == DinnerDates.key(day) }
    }

    private func card(for day: Date, animated: Bool) -> some View {
        VStack(alignment: .leading, spacing: 24) {
            Text(day, format: .dateTime.weekday(.wide).month(.abbreviated).day()).font(.subheadline.bold())
                .fixedSize(horizontal: false, vertical: true)
            Image(systemName: "takeoutbag.and.cup.and.straw").font(.system(size: 64)).frame(maxWidth: .infinity, alignment: .trailing).accessibilityHidden(true)
            ZStack(alignment: .topLeading) {
                // Reserves the tallest layout, this week's longest planned dinner, so cards keep one height while swiping and loading.
                ZStack(alignment: .topLeading) {
                    ForEach(Set([""] + (store.dashboard?.plannedMeals.map(\.dishName) ?? [])).sorted(), id: \.self) { name in
                        VStack(alignment: .leading, spacing: 24) {
                            Text(verbatim: name.isEmpty ? "Dinner" : name).font(.largeTitle.bold())
                            Button("We ate this") {}.buttonStyle(PrimaryButton())
                            Button("Change dinner") {}
                        }
                    }
                }.hidden().accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 24) {
                    // Days outside the loaded week show a placeholder until a swipe selects them and their week loads.
                    if let dashboard = store.dashboard, isLoaded(day) {
                        let meal = dashboard.plannedMeals.first { $0.date == DinnerDates.key(day) }
                        Group {
                            if let meal { Text(meal.dishName) }
                            else { Text("What's for dinner?") }
                        }.font(.largeTitle.bold())
                        if let meal {
                            if meal.completedAt != nil { Label("Dinner enjoyed", systemImage: "checkmark.circle.fill") }
                            else {
                                Button("We ate this") { Task { await store.updateMeal(meal, eaten: true) } }.buttonStyle(PrimaryButton())
                                HStack {
                                    Button("Change dinner") { choosingDish = true }
                                    Spacer()
                                    Button("Remove", role: .destructive) { removing = meal }
                                }
                            }
                        } else {
                            Text("Choose a dish from your rotation.")
                            Button("Plan dinner") { choosingDish = true }.buttonStyle(PrimaryButton())
                        }
                    } else {
                        VStack(alignment: .leading, spacing: 24) {
                            VStack(alignment: .leading, spacing: 10) {
                                RoundedRectangle(cornerRadius: 8).frame(height: 30)
                                RoundedRectangle(cornerRadius: 8).frame(width: 160, height: 30)
                            }
                            RoundedRectangle(cornerRadius: 6).frame(width: 220, height: 16)
                            Capsule().frame(width: 150, height: 50)
                        }.foregroundStyle(Palette.ink.opacity(0.1))
                            .accessibilityElement(children: .ignore).accessibilityLabel("Loading dinners…")
                    }
                }
            }
        }.padding(24)
            // Content keeps its natural height so titles wrap; the frame then stretches to the tallest card on screen.
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .background(Palette.coral, in: RoundedRectangle(cornerRadius: 28))
            // Only the shown card and its neighbours animate, so off-screen placeholders cost nothing.
            .overlay { if animated && (store.dashboard == nil || !isLoaded(day)) { Shimmer() } }
            .clipShape(RoundedRectangle(cornerRadius: 28)).disabled(store.busy)
    }
}

/// The day strip's ink capsule, in the coordinates of one pill. `offset` is the capsule's distance from
/// that pill in pill steps; `stretch` widens and thins it between days.
private struct SlimeCapsule: Shape {
    var offset: CGFloat
    var stretch: CGFloat

    func path(in rect: CGRect) -> Path {
        let step = rect.width + 8
        let size = CGSize(width: rect.width + stretch * step, height: rect.height * (1 - 0.18 * min(stretch, 1)))
        return Path(roundedRect: CGRect(x: rect.midX + offset * step - size.width / 2, y: rect.midY - size.height / 2,
                                        width: size.width, height: size.height), cornerRadius: 22)
    }
}

/// Hides off-screen cards from accessibility. `.accessibilityHidden(false)` on the shown card would
/// un-hide its decorative image, so the modifier is only applied when hiding.
private struct HiddenWhen: ViewModifier {
    let hidden: Bool
    @ViewBuilder func body(content: Content) -> some View {
        if hidden { content.accessibilityHidden(true) } else { content }
    }
}

/// A soft highlight sweeping across a loading card.
private struct Shimmer: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var body: some View {
        if !reduceMotion {
            TimelineView(.animation) { timeline in
                let cycle = 1.6
                let phase = timeline.date.timeIntervalSinceReferenceDate.truncatingRemainder(dividingBy: cycle) / cycle
                GeometryReader { proxy in
                    LinearGradient(colors: [.clear, Palette.paper.opacity(0.45), .clear], startPoint: .leading, endPoint: .trailing)
                        .frame(width: proxy.size.width * 0.6)
                        .offset(x: proxy.size.width * (1.6 * phase - 0.6))
                }
            }.allowsHitTesting(false).accessibilityHidden(true)
        }
    }
}

struct DishesView: View {
    @EnvironmentObject private var store: Store
    @State private var search = ""
    @State private var adding = false
    @State private var suggesting = false
    var body: some View {
        Page(title: "Your dishes") {
            TextField("Search dishes", text: $search).textFieldStyle(.roundedBorder)
            HStack {
                Button("Add a dish") { adding = true }.buttonStyle(PrimaryButton())
                Spacer()
                Button { suggesting = true } label: { Label("Ideas", systemImage: "sparkles") }
                    .disabled(store.dashboard?.dishes.isEmpty != false)
            }
            if let dishes = store.dashboard?.dishes {
                if dishes.isEmpty { ContentUnavailableView("Start your rotation", systemImage: "fork.knife", description: Text("Save a dinner you already love to make.")) }
                ForEach(dishes.filter { search.isEmpty || $0.name.localizedCaseInsensitiveContains(search) }) { dish in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(dish.name).font(.title3.bold())
                        if let notes = dish.notes, !notes.isEmpty { Text(notes).foregroundStyle(.secondary) }
                        if let last = dish.lastEatenOn { Text(last).font(.caption) }
                        else { Text("Not cooked yet").font(.caption) }
                    }.padding(20).frame(maxWidth: .infinity, alignment: .leading).background(Palette.paper, in: RoundedRectangle(cornerRadius: 24))
                }
            } else { ProgressView() }
        }.sheet(isPresented: $adding) { AddDishView() }
            .sheet(isPresented: $suggesting) { SuggestionsView(weekly: false) }
    }
}

struct AddDishView: View {
    @EnvironmentObject private var store: Store
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var notes = ""
    var body: some View {
        NavigationStack {
            Form {
                RequestStatus()
                TextField("Dish name", text: $name)
                TextField("Notes", text: $notes, axis: .vertical).lineLimit(3...5)
                Text("Name up to 80 characters. Notes up to 160.").font(.caption)
            }.navigationTitle("Add a dish").toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() }.disabled(store.busy) }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { Task { if await store.addDish(name: name.trimmingCharacters(in: .whitespacesAndNewlines), notes: notes) { dismiss() } } }
                        .disabled(store.busy || name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || name.count > 80 || notes.count > 160)
                }
            }
        }.interactiveDismissDisabled(store.busy)
    }
}

struct DishPicker: View {
    let date: Date
    @EnvironmentObject private var store: Store
    @Environment(\.dismiss) private var dismiss
    @State private var search = ""
    @State private var adding = false
    var body: some View {
        NavigationStack {
            List {
                RequestStatus()
                Button("Add a dish") { adding = true }
                ForEach((store.dashboard?.dishes ?? []).filter { search.isEmpty || $0.name.localizedCaseInsensitiveContains(search) }) { dish in
                    Button { Task { if await store.plan(dish, date: date) { dismiss() } } } label: {
                        VStack(alignment: .leading) { Text(dish.name).font(.headline); if let notes = dish.notes { Text(notes).font(.caption) } }
                    }
                }
            }.disabled(store.busy).searchable(text: $search).navigationTitle("Plan dinner")
                .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() }.disabled(store.busy) } }
        }.sheet(isPresented: $adding) { AddDishView() }.interactiveDismissDisabled(store.busy)
    }
}

struct HistoryView: View {
    @EnvironmentObject private var store: Store
    var body: some View {
        Page(title: "Dinner history") {
            Text("Your six most recent dinners.").foregroundStyle(.secondary)
            if let meals = store.dashboard?.recentMeals {
                if meals.isEmpty { ContentUnavailableView("No dinners yet", systemImage: "clock", description: Text("Mark a planned dinner eaten to remember it here.")) }
                ForEach(meals) { meal in
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                        VStack(alignment: .leading, spacing: 6) { Text(meal.dishName).font(.headline); Text(meal.eatenOn).font(.caption) }
                        Spacer()
                    }.padding(20).background(Palette.mint, in: RoundedRectangle(cornerRadius: 24))
                }
            } else { ProgressView() }
        }
    }
}

struct SuggestionsView: View {
    let weekly: Bool
    @EnvironmentObject private var store: Store
    @Environment(\.dismiss) private var dismiss
    @AppStorage("language") private var language = Locale.current.language.languageCode?.identifier == "da" ? "da" : "en"
    @State private var saved = Set<String>()
    @State private var confirm = false
    var body: some View {
        Page(title: "A little inspiration") {
            Text("AI suggestions use your household's dishes and dinner history. Check the plan before saving. Limited to five requests per day.")
            Button("Generate suggestions") { Task { await store.generate(weekly: weekly, language: language) } }
                .buttonStyle(PrimaryButton()).disabled(store.busy)
            if let result = store.suggestions, result.kind == (weekly ? "weekly_plan" : "new_dishes") {
                if !weekly && result.dishes?.isEmpty == true && !store.busy {
                    Text("No new dishes this time. We tried twice, but found nothing new to add to your saved dishes.")
                        .foregroundStyle(.secondary)
                }
                ForEach(Array((result.meals ?? result.dishes ?? []).enumerated()), id: \.offset) { _, item in
                    VStack(alignment: .leading, spacing: 10) {
                        if let date = item.date { Text(date).font(.caption) }
                        Text(item.name).font(.title3.bold())
                        Text(item.notes)
                        Text(item.reason).font(.footnote).foregroundStyle(.secondary)
                        if !weekly {
                            Button(LocalizedStringKey(saved.contains(item.name) ? "Saved" : "Save dish")) {
                                Task { if await store.addDish(name: item.name, notes: item.notes) { saved.insert(item.name) } }
                            }.disabled(store.busy || saved.contains(item.name))
                        }
                    }.padding(20).frame(maxWidth: .infinity, alignment: .leading).background(Palette.paper, in: RoundedRectangle(cornerRadius: 24))
                }
                if weekly { Button("Use this week") { confirm = true }.buttonStyle(PrimaryButton()).disabled(store.busy) }
            }
            Button("Done") { dismiss() }.disabled(store.busy)
        }.interactiveDismissDisabled(store.busy)
            .confirmationDialog("Replace uneaten dinners in this week? Completed dinners will be kept.", isPresented: $confirm, titleVisibility: .visible) {
                Button("Use this week") { Task { if await store.applySuggestions() { dismiss() } } }
            }
    }
}

struct HouseholdView: View {
    @EnvironmentObject private var store: Store
    @AppStorage("language") private var language = Locale.current.language.languageCode?.identifier == "da" ? "da" : "en"
    @State private var name = ""
    @State private var profileName: String?
    @State private var profileSaved = false
    @FocusState private var editingProfile: Bool
    @State private var inviteURL: URL?
    @State private var link = ""
    @State private var inspectedInvite: Invite?
    @State private var inspectedID: String?
    @State private var signOut = false

    private var currentName: String { store.household?.members.first(where: \.isCurrentUser)?.name ?? "" }
    private var trimmedProfileName: String {
        (profileName ?? currentName).trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var body: some View {
        Page(title: "Your household") {
            Picker("Language", selection: $language) { Text("English").tag("en"); Text("Dansk").tag("da") }.pickerStyle(.segmented)
            if let details = store.household {
                Text(details.household?.name ?? "Our home").font(.title.bold())
                VStack(alignment: .leading, spacing: 12) {
                    Text("Your name").font(.headline)
                    Text("This is the name others in your household see.").font(.callout).foregroundStyle(.secondary)
                    TextField("Your name", text: Binding(
                        get: { profileName ?? currentName },
                        set: { profileName = $0; profileSaved = false }
                    ))
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.name)
                        .textInputAutocapitalization(.words)
                        .autocorrectionDisabled()
                        .focused($editingProfile)
                        .disabled(store.busy)
                        .accessibilityIdentifier("profile-name")
                    if trimmedProfileName.utf16.count > 100 {
                        Text("Use a name between 1 and 100 characters.").font(.caption).foregroundStyle(.red)
                    }
                    Button {
                        editingProfile = false
                        profileSaved = false
                        let value = trimmedProfileName
                        Task {
                            if await store.updateMyName(value) {
                                profileName = value
                                profileSaved = true
                            }
                        }
                    } label: {
                        Text("Save name").frame(maxWidth: .infinity)
                    }
                    .buttonStyle(PrimaryButton())
                    .disabled(trimmedProfileName.isEmpty || trimmedProfileName.utf16.count > 100 || store.busy)
                    .accessibilityIdentifier("save-profile-name")
                    if profileSaved {
                        Text("Your name is saved.").font(.callout).foregroundStyle(Palette.ink)
                            .accessibilityIdentifier("profile-name-saved")
                    }
                }
                ForEach(Array(details.members.enumerated()), id: \.offset) { _, member in
                    HStack { Image(systemName: "person.crop.circle"); Text(member.name); Spacer(); Text(member.role).font(.caption) }
                }
                if details.canManageHousehold {
                    TextField("Household name", text: $name).textFieldStyle(.roundedBorder)
                    Button("Save name") { Task { await store.rename(name) } }.disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || store.busy)
                    Button("Create invite link") { Task { inviteURL = await store.createInvite() } }.disabled(store.busy)
                    if let inviteURL { ShareLink(item: inviteURL) { Label("Share invitation", systemImage: "square.and.arrow.up") }; Text("Invite links expire after seven days.").font(.caption) }
                }
                if details.household == nil {
                    Text("Joining someone else's household? Accept their invite before adding dishes or naming a new home.").font(.callout)
                    TextField("Paste invitation link", text: $link).textFieldStyle(.roundedBorder).textInputAutocapitalization(.never).autocorrectionDisabled()
                        .onChange(of: link) { _, _ in inspectedInvite = nil; inspectedID = nil }
                    Button("Check invitation") {
                        Task {
                            guard let id = DinnerDates.inviteID(link, webURL: store.configuration.webURL) else { store.error = "Paste an invitation from your LoopDish website."; return }
                            await store.perform {
                                let invite = try await store.inspectInvite(id)
                                guard invite?.available == true else { store.error = "This invitation is unavailable or expired. Ask for a new invitation link."; return }
                                inspectedInvite = invite; inspectedID = id
                            }
                        }
                    }.disabled(store.busy)
                    if let invite = inspectedInvite, let id = inspectedID {
                        Text(invite.householdName).font(.headline)
                        Button("Join household") { Task { if await store.join(id) { inspectedInvite = nil; link = "" } } }.buttonStyle(PrimaryButton()).disabled(store.busy)
                    }
                }
            } else { ProgressView() }
            Button("Sign out", role: .destructive) { signOut = true }.disabled(store.busy)
        }.onChange(of: store.household?.household?.name, initial: true) { _, value in name = value ?? "" }
            .onChange(of: currentName) { oldValue, _ in
                if profileName == oldValue { profileName = nil; profileSaved = false }
            }
            .confirmationDialog("Sign out of LoopDish?", isPresented: $signOut) { Button("Sign out", role: .destructive) { Task { await store.signOut() } } }
    }
}
