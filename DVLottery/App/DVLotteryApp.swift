import SwiftUI

@main
struct DVLotteryApp: App {
    @StateObject private var store: AppStore
    @Environment(\.scenePhase) private var phase

    init() {
        let testing = ProcessInfo.processInfo.arguments.contains("--ui-testing")
        let folder = testing ? FileManager.default.temporaryDirectory.appendingPathComponent("DVLotteryUITests") : nil
        if testing, ProcessInfo.processInfo.arguments.contains("--reset-test-data"), let folder { try? FileManager.default.removeItem(at: folder) }
        _store = StateObject(wrappedValue: AppStore(directory: folder))
    }

    var body: some Scene {
        WindowGroup {
            RootView().environmentObject(store).tint(Palette.navy).preferredColorScheme(.light)
                .overlay {
                    if phase != .active {
                        ZStack {
                            Palette.background.ignoresSafeArea()
                            VStack(spacing: 16) { BrandMark().frame(width: 68, height: 68); Text(Brand.name).font(.title2.bold()).foregroundStyle(Palette.navy) }
                        }.accessibilityLabel("App content hidden")
                    }
                }
                .alert("Storage needs attention", isPresented: Binding(get: { store.error != nil }, set: { if !$0 { store.error = nil } })) {
                    Button("OK") { store.error = nil }
                } message: { Text(store.error ?? "") }
        }
    }
}

enum AppTab: Hashable { case home, apply, photos, entries }

struct RootView: View {
    @State private var tab = AppTab.home
    var body: some View {
        TabView(selection: $tab) {
            NavigationStack { HomeView(tab: $tab) }.tabItem { Label("Home", systemImage: "square.grid.2x2") }.tag(AppTab.home)
            NavigationStack { ApplyView(tab: $tab) }.tabItem { Label("Apply", systemImage: "doc.text") }.tag(AppTab.apply)
            NavigationStack { PhotosView() }.tabItem { Label("Photos", systemImage: "person.crop.rectangle") }.tag(AppTab.photos)
            NavigationStack { EntriesView() }.tabItem { Label("My Entries", systemImage: "tray.full") }.tag(AppTab.entries)
        }
    }
}
