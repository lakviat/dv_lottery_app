import SwiftUI
import SafariServices

enum Palette {
    static let navy = Color(red: 0.065, green: 0.16, blue: 0.29)
    static let blue = Color(red: 0.18, green: 0.36, blue: 0.60)
    static let red = Color(red: 0.79, green: 0.23, blue: 0.27)
    static let background = Color(red: 0.955, green: 0.963, blue: 0.976)
    static let muted = Color(red: 0.40, green: 0.46, blue: 0.55)
    static let line = Color(red: 0.88, green: 0.90, blue: 0.93)
    static let green = Color(red: 0.15, green: 0.46, blue: 0.37)
    static let gold = Color(red: 0.61, green: 0.40, blue: 0.12)
}

struct Card<Content: View>: View {
    var padding: CGFloat = 20
    @ViewBuilder var content: Content
    var body: some View {
        content.padding(padding).frame(maxWidth: .infinity, alignment: .leading)
            .background(.white, in: RoundedRectangle(cornerRadius: 22))
            .overlay(RoundedRectangle(cornerRadius: 22).stroke(Palette.line.opacity(0.7), lineWidth: 1))
    }
}

struct PrimaryButton: View {
    let title: String
    var icon = "arrow.right"
    var light = false
    var action: () -> Void
    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Text(title).font(.subheadline.weight(.semibold))
                Spacer(minLength: 8)
                Image(systemName: icon).font(.subheadline.weight(.semibold))
            }.padding(.horizontal, 19).padding(.vertical, 17)
                .foregroundStyle(light ? Palette.navy : .white)
                .background(light ? Color.white : Palette.navy, in: RoundedRectangle(cornerRadius: 14))
        }.buttonStyle(.plain)
    }
}

struct StatusPill: View {
    let title: String
    var color = Palette.blue
    var body: some View {
        HStack(spacing: 6) {
            Circle().fill(color).frame(width: 5, height: 5)
            Text(title).font(.caption.weight(.semibold))
        }.foregroundStyle(color).padding(.horizontal, 11).padding(.vertical, 7)
            .background(color.opacity(0.09), in: Capsule())
    }
}

struct IconTile: View {
    let icon: String
    var color = Palette.blue
    var size: CGFloat = 44
    var body: some View {
        Image(systemName: icon).font(.system(size: size * 0.44, weight: .medium))
            .foregroundStyle(color).frame(width: size, height: size)
            .background(color.opacity(0.08), in: RoundedRectangle(cornerRadius: size * 0.28))
    }
}

struct SectionHeading: View {
    let title: String
    var subtitle: String? = nil
    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(title).font(.title3.weight(.bold)).foregroundStyle(Palette.navy)
            if let subtitle { Text(subtitle).font(.subheadline).foregroundStyle(Palette.muted) }
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct PageHeading: View {
    let eyebrow: String
    let title: String
    let subtitle: String
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(eyebrow.uppercased()).font(.system(size: 10, weight: .bold)).tracking(2.2).foregroundStyle(Palette.blue)
            Text(title).font(.system(.largeTitle, design: .rounded, weight: .bold)).foregroundStyle(Palette.navy)
            Text(subtitle).font(.subheadline).foregroundStyle(Palette.muted).lineSpacing(3)
        }.frame(maxWidth: .infinity, alignment: .leading).padding(.top, 14)
    }
}

struct Note: View {
    let text: String
    var icon = "info.circle"
    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon).foregroundStyle(Palette.blue)
            Text(text).font(.footnote).foregroundStyle(Palette.muted).lineSpacing(3)
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct FlagMark: View {
    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height
            ZStack(alignment: .topLeading) {
                Palette.navy
                ForEach(0..<4) { stripe in
                    Path { p in
                        let y = h * (0.40 + Double(stripe) * 0.17)
                        p.move(to: CGPoint(x: -w * 0.08, y: y))
                        p.addCurve(to: CGPoint(x: w * 1.1, y: y - h * 0.23), control1: CGPoint(x: w * 0.4, y: y + h * 0.2), control2: CGPoint(x: w * 0.58, y: y - h * 0.28))
                    }.stroke(stripe % 2 == 0 ? Palette.red : Color.white.opacity(0.93), style: StrokeStyle(lineWidth: h * 0.085, lineCap: .round))
                }
                Image(systemName: "star.fill").font(.system(size: w * 0.25)).foregroundStyle(.white).offset(x: w * 0.16, y: h * 0.12)
                Image(systemName: "star.fill").font(.system(size: w * 0.095)).foregroundStyle(.white.opacity(0.6)).offset(x: w * 0.52, y: h * 0.14)
            }.clipShape(RoundedRectangle(cornerRadius: w * 0.24))
        }.aspectRatio(1, contentMode: .fit).accessibilityHidden(true)
    }
}

struct JourneyArt: View {
    var body: some View {
        ZStack {
            Circle().stroke(.white.opacity(0.09), lineWidth: 1).frame(width: 172, height: 172)
            Circle().stroke(.white.opacity(0.07), lineWidth: 1).frame(width: 220, height: 220)
            RoundedRectangle(cornerRadius: 17).fill(Color.white.opacity(0.08)).frame(width: 115, height: 150).rotationEffect(.degrees(16)).offset(x: 13, y: 8)
            VStack(spacing: 13) {
                HStack(spacing: 4) { ForEach(0..<3) { _ in Image(systemName: "star.fill").font(.system(size: 7)) } }.foregroundStyle(Color(red: 0.86, green: 0.72, blue: 0.50))
                Image(systemName: "globe.americas").font(.system(size: 43, weight: .ultraLight)).foregroundStyle(.white.opacity(0.88))
                Text("A WORLD OF\nPOSSIBILITY").font(.system(size: 7, weight: .bold)).tracking(1.7).multilineTextAlignment(.center).foregroundStyle(.white.opacity(0.75))
            }.frame(width: 111, height: 148).background(Color(red: 0.19, green: 0.30, blue: 0.44), in: RoundedRectangle(cornerRadius: 15))
                .overlay(RoundedRectangle(cornerRadius: 15).stroke(.white.opacity(0.19), lineWidth: 1)).rotationEffect(.degrees(-11))
            Image(systemName: "airplane").font(.system(size: 24)).foregroundStyle(.white).rotationEffect(.degrees(-28)).offset(x: 69, y: -60)
        }.accessibilityHidden(true)
    }
}

struct BrowserDestination: Identifiable { let id = UUID(); let url: URL }

struct OfficialBrowser: UIViewControllerRepresentable {
    let url: URL
    func makeUIViewController(context: Context) -> SFSafariViewController {
        let controller = SFSafariViewController(url: url)
        controller.preferredControlTintColor = UIColor(Palette.navy)
        return controller
    }
    func updateUIViewController(_ uiViewController: SFSafariViewController, context: Context) {}
}

struct ResourceButton: View {
    let title: String
    let subtitle: String
    let icon: String
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            HStack(spacing: 13) {
                IconTile(icon: icon)
                VStack(alignment: .leading, spacing: 4) {
                    Text(title).font(.subheadline.weight(.semibold)).foregroundStyle(Palette.navy)
                    Text(subtitle).font(.caption).foregroundStyle(Palette.muted)
                }
                Spacer(minLength: 0)
                Image(systemName: "arrow.up.right").font(.caption.weight(.semibold)).foregroundStyle(Palette.muted)
            }.padding(.vertical, 6)
        }.buttonStyle(.plain)
    }
}
