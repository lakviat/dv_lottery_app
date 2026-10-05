import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var store: AppStore
    @Binding var tab: AppTab
    @State private var showGuide = false
    @State private var showSettings = false
    @State private var browser: BrowserDestination?

    var body: some View {
        GeometryReader { geo in
            ScrollView {
                VStack(alignment: .leading, spacing: 26) {
                    header
                    if geo.size.width > 700 {
                        HStack(alignment: .top, spacing: 24) {
                            VStack(spacing: 24) { hero; registration }.frame(maxWidth: .infinity)
                            VStack(spacing: 24) { journey; quickActions; entries }.frame(maxWidth: .infinity)
                        }
                    } else {
                        hero
                        registration
                        journey
                        quickActions
                        entries
                    }
                    resources
                    Text("Independent companion · Not a U.S. government app")
                        .font(.caption2).foregroundStyle(Palette.muted).frame(maxWidth: .infinity).padding(.bottom, 16)
                }.padding(.horizontal, geo.size.width > 700 ? 36 : 22).padding(.top, 12).frame(maxWidth: 1100).frame(maxWidth: .infinity)
            }.background(Palette.background).toolbar(.hidden, for: .navigationBar)
        }
        .sheet(isPresented: $showGuide) { GuideView() }
        .sheet(isPresented: $showSettings) { SettingsView() }
        .sheet(item: $browser) { OfficialBrowser(url: $0.url).ignoresSafeArea() }
    }

    private var header: some View {
        HStack(spacing: 11) {
            BrandMark().frame(width: 39, height: 39)
            VStack(alignment: .leading, spacing: 3) {
                Text(Brand.name).font(.system(size: 20, weight: .bold, design: .rounded)).foregroundStyle(Palette.navy).fixedSize(horizontal: false, vertical: true)
                Text("YOUR JOURNEY, ORGANIZED").font(.system(size: 8, weight: .semibold)).tracking(1.5).foregroundStyle(Palette.muted)
            }
            Spacer()
            Button { showSettings = true } label: {
                Image(systemName: "gearshape").font(.system(size: 19)).foregroundStyle(Palette.navy).frame(width: 44, height: 44).background(.white, in: Circle())
            }.accessibilityLabel("Settings")
        }.padding(.bottom, 1)
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 17) {
                    Text("A NEW POSSIBILITY").font(.system(size: 9, weight: .bold)).tracking(2.1).foregroundStyle(Color(red: 0.72, green: 0.81, blue: 0.91))
                    Text("Your next\nchapter\nstarts here.").font(.system(size: 34, weight: .bold, design: .rounded)).tracking(-1).lineSpacing(-1).foregroundStyle(.white).fixedSize(horizontal: false, vertical: true)
                }.layoutPriority(1)
                Spacer(minLength: 0)
                JourneyArt().scaleEffect(0.63).frame(width: 106, height: 168).clipped()
            }
            Text("A little preparation. A world of possibility.").font(.subheadline).foregroundStyle(.white.opacity(0.73)).padding(.top, 16).padding(.bottom, 23)
            PrimaryButton(title: store.data.draft.started ? "Continue my preparation" : "Prepare my entry", light: true) {
                store.data.draft.started = true
                tab = .apply
            }.accessibilityIdentifier("prepareEntry")
        }.padding(24).background {
            LinearGradient(colors: [Palette.navy, Color(red: 0.12, green: 0.25, blue: 0.41)], startPoint: .topLeading, endPoint: .bottomTrailing)
        }.clipShape(RoundedRectangle(cornerRadius: 26))
    }

    private var registration: some View {
        Button { browser = BrowserDestination(url: Official.dates) } label: {
            HStack(alignment: .top, spacing: 13) {
                Image(systemName: "calendar.badge.clock").font(.system(size: 21)).foregroundStyle(Palette.gold).padding(.top, 1)
                VStack(alignment: .leading, spacing: 6) {
                    Text("Next entry period").font(.subheadline.weight(.bold)).foregroundStyle(Palette.navy)
                    Text("Official dates not yet confirmed.\nYou can get ready in the meantime.").font(.caption).foregroundStyle(Palette.muted).lineSpacing(3)
                }
                Spacer(minLength: 0)
                Image(systemName: "arrow.up.right").font(.caption).foregroundStyle(Palette.gold)
            }.padding(18).background(Color(red: 0.98, green: 0.96, blue: 0.90), in: RoundedRectangle(cornerRadius: 18))
        }.buttonStyle(.plain)
    }

    private var journey: some View {
        VStack(alignment: .leading, spacing: 15) {
            HStack {
                SectionHeading(title: "One step closer")
                Text("\(store.data.draft.completedSteps(photos: store.data.photos)) OF 6").font(.system(size: 10, weight: .bold)).tracking(1).foregroundStyle(Palette.muted).fixedSize()
            }
            Card {
                VStack(spacing: 18) {
                    HStack(spacing: 0) {
                        journeyStep("1", "Prepare", "Your details", active: true)
                        Rectangle().fill(Palette.line).frame(width: 25, height: 1).padding(.bottom, 33)
                        journeyStep("2", "Submit", "Official portal", active: false)
                        Rectangle().fill(Palette.line).frame(width: 25, height: 1).padding(.bottom, 33)
                        journeyStep("3", "Track", "Your result", active: false)
                    }
                    Divider().overlay(Palette.line)
                    HStack(spacing: 7) {
                        Image(systemName: "lock.shield").foregroundStyle(Palette.green)
                        Text("Your preparation stays on this device.").foregroundStyle(Palette.muted)
                    }.font(.caption)
                }
            }
        }
    }

    private func journeyStep(_ number: String, _ title: String, _ caption: String, active: Bool) -> some View {
        VStack(spacing: 7) {
            Text(number).font(.subheadline.weight(.bold)).frame(width: 32, height: 32)
                .foregroundStyle(active ? .white : Palette.muted).background(active ? Palette.navy : Palette.background, in: Circle())
            Text(title).font(.caption.weight(.bold)).foregroundStyle(Palette.navy)
            Text(caption).font(.system(size: 9)).foregroundStyle(Palette.muted)
        }.frame(maxWidth: .infinity)
    }

    private var quickActions: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeading(title: "Make a little progress")
            HStack(spacing: 12) {
                quickCard("Your best photo", subtitle: "Get the details right", icon: "camera", color: Palette.blue) { tab = .photos }
                quickCard("Know the process", subtitle: "A guide to what’s next", icon: "book.closed", color: Palette.red) { showGuide = true }
            }
        }
    }

    private func quickCard(_ title: String, subtitle: String, icon: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Card(padding: 16) {
                VStack(alignment: .leading, spacing: 14) {
                    HStack { IconTile(icon: icon, color: color, size: 38); Spacer(); Image(systemName: "arrow.up.right").font(.system(size: 10)).foregroundStyle(Palette.muted) }
                    VStack(alignment: .leading, spacing: 5) {
                        Text(title).font(.system(size: 13, weight: .bold)).foregroundStyle(Palette.navy)
                        Text(subtitle).font(.system(size: 10)).foregroundStyle(Palette.muted)
                    }
                }
            }
        }.buttonStyle(.plain)
    }

    private var entries: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack { SectionHeading(title: "Your entries"); Button("View all") { tab = .entries }.font(.caption.weight(.semibold)).fixedSize() }
            Button { tab = .entries } label: {
                Card {
                    HStack(spacing: 13) {
                        IconTile(icon: "tray.full", color: Palette.blue)
                        VStack(alignment: .leading, spacing: 5) {
                            Text(store.data.entries.isEmpty ? "Every year. All in one place." : "\(store.data.entries.count) saved \(store.data.entries.count == 1 ? "entry" : "entries")").font(.subheadline.weight(.semibold)).foregroundStyle(Palette.navy)
                            Text(store.data.entries.isEmpty ? "Add an entry you’ve already submitted." : "Keep your confirmation and timeline close.").font(.caption).foregroundStyle(Palette.muted)
                        }
                        Spacer(minLength: 0)
                        Image(systemName: "chevron.right").font(.caption).foregroundStyle(Palette.muted)
                    }
                }
            }.buttonStyle(.plain)
        }
    }

    private var resources: some View {
        Card {
            VStack(alignment: .leading, spacing: 10) {
                Text("FROM THE OFFICIAL SOURCE").font(.system(size: 9, weight: .bold)).tracking(1.7).foregroundStyle(Palette.muted)
                ResourceButton(title: "DV instructions & updates", subtitle: "U.S. Department of State", icon: "globe") { browser = BrowserDestination(url: Official.instructions) }
                Divider()
                ResourceButton(title: "Visa bulletin", subtitle: "For applicants who have been selected", icon: "list.bullet.rectangle") { browser = BrowserDestination(url: Official.bulletin) }
                Text("Reference information checked \(Official.checked). Open the source for the latest information.").font(.caption2).foregroundStyle(Palette.muted).padding(.top, 5)
            }
        }
    }
}
