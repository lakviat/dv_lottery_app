import SwiftUI

struct GuideView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var browser: BrowserDestination?
    private let stages: [(String, String, String)] = [
        ("01", "Prepare your entry", "Read annual instructions, check your qualifications, gather family details, prepare your passport and required scans, and take fresh photos."),
        ("02", "Enter during registration", "Complete the entry at the official DV portal during its announced window. One entry per person per period."),
        ("03", "Save your confirmation", "Keep the confirmation page and number. Add a local record in My Entries and keep a separate secure backup."),
        ("04", "Check your result", "Use official Entrant Status Check when results are available. Record what it says in your timeline."),
        ("05", "If selected, follow instructions", "Selection is an opportunity to apply, not a visa guarantee. Follow your official instructions for DS-260 and the appropriate processing route."),
        ("06", "Prepare for the next milestones", "Follow official directions on documents, the visa bulletin, medical examination, interview, fees, and the fiscal-year deadline.")
    ]
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 23) {
                    PageHeading(eyebrow: "The big picture", title: "A path to follow.", subtitle: "Understand what happens before and after the drawing.")
                    ForEach(stages, id: \.0) { stage in
                        Card {
                            HStack(alignment: .top, spacing: 16) {
                                Text(stage.0).font(.system(.title2, design: .rounded, weight: .bold)).foregroundStyle(Palette.blue.opacity(0.45))
                                VStack(alignment: .leading, spacing: 8) { Text(stage.1).font(.headline).foregroundStyle(Palette.navy); Text(stage.2).font(.subheadline).foregroundStyle(Palette.muted).lineSpacing(4) }
                            }
                        }
                    }
                    Card {
                        VStack(alignment: .leading, spacing: 16) {
                            SectionHeading(title: "Dates & fees")
                            Text("The next registration opening is unconfirmed in this app. October 7 is a planning estimate, not an official deadline.").font(.subheadline).foregroundStyle(Palette.muted)
                            Text("The official fee schedule lists a $1 DV registration fee and a separate $330 selectee application fee. Older entry pages still describe free registration. Check current annual instructions and official payment directions before paying.").font(.subheadline).foregroundStyle(Palette.muted)
                            ResourceButton(title: "Official fee schedule", subtitle: "Verify the latest government fees", icon: "dollarsign.circle") { browser = BrowserDestination(url: Official.fees) }
                            ResourceButton(title: "Official DV announcements", subtitle: "Read the latest program updates", icon: "newspaper") { browser = BrowserDestination(url: Official.news) }
                            ResourceButton(title: "Passport & page-scan rule", subtitle: "2026 rule · Check current implementation", icon: "doc.text") { browser = BrowserDestination(url: Official.passportRule) }
                        }
                    }
                    Text("Sources checked \(Official.checked). This guide is general preparation information; official annual instructions govern your entry.").font(.caption).foregroundStyle(Palette.muted)
                }.padding(22).frame(maxWidth: 740).frame(maxWidth: .infinity)
            }.background(Palette.background).navigationTitle("DV guide").navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }.sheet(item: $browser) { OfficialBrowser(url: $0.url).ignoresSafeArea() }
    }
}

struct SettingsView: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.dismiss) private var dismiss
    @State private var delete = false
    @State private var resetDraft = false
    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack(spacing: 15) { BrandMark().frame(width: 58, height: 58); VStack(alignment: .leading, spacing: 6) { Text(Brand.name).font(.title3.bold()); Text("Your journey, organized.").font(.subheadline).foregroundStyle(.secondary) } }.padding(.vertical, 9)
                }
                Section("Your data") {
                    Label("Stored on this device", systemImage: "iphone")
                    Text("Drafts, photos, and entries are saved in the app’s protected local storage and excluded from cloud backup. No account, analytics, or app server is used. Keep a separate secure copy of official confirmations. Uninstalling the app removes local records.").font(.footnote).foregroundStyle(.secondary)
                    Text("Official websites open in an in-app Safari browser. Information you enter there is handled by that website. Photo exports go to the destination you choose.").font(.footnote).foregroundStyle(.secondary)
                }
                Section("About this first version") {
                    Text("Independent DV preparation and record-keeping app. Not affiliated with USCIS or the U.S. Department of State.").font(.footnote)
                    Text("Government submission, CAPTCHA, payment, and selection checks are completed on official websites. Your saved timeline is updated manually.").font(.footnote)
                    Text("iPhone & iPad · iOS 17 or later").font(.caption).foregroundStyle(.secondary)
                }
                Section {
                    Button("Start a fresh preparation") { resetDraft = true }
                    Button("Delete all local data", role: .destructive) { delete = true }
                } footer: { Text("Deletes your draft, photos, and saved entries from this device. It does not affect any official submission.") }
            }.navigationTitle("Settings").navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
                .confirmationDialog("Permanently delete all local data?", isPresented: $delete, titleVisibility: .visible) { Button("Delete all local data", role: .destructive) { store.deleteAll() } }
                .confirmationDialog("Replace the current preparation draft?", isPresented: $resetDraft, titleVisibility: .visible) {
                    Button("Start fresh", role: .destructive) { store.data.draft = EntryDraft() }
                } message: { Text("This clears the draft. Saved entries and photo history stay on this device. Add fresh photos for the people in your new draft.") }
        }
    }
}
