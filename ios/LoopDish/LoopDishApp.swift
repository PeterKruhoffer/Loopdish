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

    init(configuration: Configuration) { _store = StateObject(wrappedValue: Store(configuration: configuration)) }

    var body: some View {
        Group {
            if store.restoring { LaunchSplash().ignoresSafeArea() }
            else if store.signedIn {
                TabView {
                    WeekView().tabItem { Label("Week", systemImage: "calendar") }
                    DishesView().tabItem { Label("Dishes", systemImage: "fork.knife") }
                    HistoryView().tabItem { Label("History", systemImage: "clock") }
                    HouseholdView().tabItem { Label("Household", systemImage: "person.2") }
                }
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
                Text(error).font(.callout)
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
            HStack(spacing: 8) {
                ForEach(store.days, id: \.self) { day in
                    let selected = DinnerDates.key(day) == DinnerDates.key(store.selectedDate)
                    Button { store.selectedDate = day } label: {
                        VStack(spacing: 8) {
                            Text(day, format: .dateTime.weekday(.narrow)).font(.caption)
                            Text(day, format: .dateTime.day()).font(.headline)
                            Circle().fill(store.dashboard?.plannedMeals.contains(where: { $0.date == DinnerDates.key(day) }) == true ? Palette.coral : .clear).frame(width: 5, height: 5)
                        }.lineLimit(1).minimumScaleFactor(0.5)
                            .frame(minWidth: 0, maxWidth: .infinity).padding(.vertical, 12)
                            .foregroundStyle(selected ? Palette.cream : Palette.ink)
                            .background(selected ? Palette.ink : Palette.paper, in: RoundedRectangle(cornerRadius: 22))
                    }.accessibilityLabel(day.formatted(.dateTime.weekday(.wide).day().month(.wide).year().locale(locale)))
                        .accessibilityIdentifier("week-day-\(DinnerDates.key(day))")
                        .accessibilityAddTraits(selected ? .isSelected : [])
                }
            }
            if let dashboard = store.dashboard {
                let meal = dashboard.plannedMeals.first { $0.date == DinnerDates.key(store.selectedDate) }
                VStack(alignment: .leading, spacing: 24) {
                    Text(store.selectedDate, format: .dateTime.weekday(.wide).month(.abbreviated).day()).font(.subheadline.bold())
                        .fixedSize(horizontal: false, vertical: true)
                    Image(systemName: "takeoutbag.and.cup.and.straw").font(.system(size: 64)).frame(maxWidth: .infinity, alignment: .trailing).accessibilityHidden(true)
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
                }.padding(24).frame(maxWidth: .infinity, alignment: .leading)
                    .background(Palette.coral, in: RoundedRectangle(cornerRadius: 28)).disabled(store.busy)
                Button { showingSuggestions = true } label: { Label("Help plan my week", systemImage: "sparkles") }
                    .disabled(dashboard.dishes.isEmpty || store.busy)
                if let notice = store.notice { Text(notice).font(.footnote) }
            } else {
                ProgressView("Loading dinners…")
                Button("Retry") { store.subscribe() }
            }
        }
        .sheet(isPresented: $choosingDish) { DishPicker(date: store.selectedDate) }
        .sheet(isPresented: $showingSuggestions) { SuggestionsView(weekly: true) }
        .confirmationDialog("Remove this dinner?", isPresented: Binding(get: { removing != nil }, set: { if !$0 { removing = nil } })) {
            Button("Remove", role: .destructive) { if let meal = removing { Task { await store.updateMeal(meal, eaten: false) } }; removing = nil }
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
    @State private var inviteURL: URL?
    @State private var link = ""
    @State private var inspectedInvite: Invite?
    @State private var inspectedID: String?
    @State private var signOut = false
    var body: some View {
        Page(title: "Your household") {
            Picker("Language", selection: $language) { Text("English").tag("en"); Text("Dansk").tag("da") }.pickerStyle(.segmented)
            if let details = store.household {
                Text(details.household?.name ?? "Our home").font(.title.bold())
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
                                guard invite?.available == true else { store.error = "This invitation is unavailable or expired."; return }
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
            .confirmationDialog("Sign out of LoopDish?", isPresented: $signOut) { Button("Sign out", role: .destructive) { Task { await store.signOut() } } }
    }
}
