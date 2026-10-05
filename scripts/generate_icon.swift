import AppKit

// Original vector flag mark, matching FlagMark in the SwiftUI design system.
let size: CGFloat = 1024
let navy = NSColor(srgbRed: 0.065, green: 0.16, blue: 0.29, alpha: 1)
let red = NSColor(srgbRed: 0.79, green: 0.23, blue: 0.27, alpha: 1)
let image = NSImage(size: NSSize(width: size, height: size), flipped: true) { rect in
    navy.setFill()
    rect.fill()
    for stripe in 0..<4 {
        let y = size * (0.40 + CGFloat(stripe) * 0.17)
        let path = NSBezierPath()
        path.move(to: NSPoint(x: -size * 0.08, y: y))
        path.curve(to: NSPoint(x: size * 1.1, y: y - size * 0.23), controlPoint1: NSPoint(x: size * 0.4, y: y + size * 0.2), controlPoint2: NSPoint(x: size * 0.58, y: y - size * 0.28))
        path.lineWidth = size * 0.085
        path.lineCapStyle = .round
        (stripe % 2 == 0 ? red : NSColor.white).setStroke()
        path.stroke()
    }
    func star(center: NSPoint, radius: CGFloat, opacity: CGFloat) {
        let path = NSBezierPath()
        for i in 0..<10 {
            let angle = CGFloat(i) * .pi / 5 - .pi / 2
            let r = i % 2 == 0 ? radius : radius * 0.43
            let point = NSPoint(x: center.x + cos(angle) * r, y: center.y + sin(angle) * r)
            if i == 0 { path.move(to: point) } else { path.line(to: point) }
        }
        path.close()
        NSColor.white.withAlphaComponent(opacity).setFill()
        path.fill()
    }
    star(center: NSPoint(x: 290, y: 225), radius: 135, opacity: 1)
    star(center: NSPoint(x: 565, y: 184), radius: 52, opacity: 0.65)
    return true
}
let original = image.cgImage(forProposedRect: nil, context: nil, hints: nil)!
let context = CGContext(data: nil, width: 1024, height: 1024, bitsPerComponent: 8, bytesPerRow: 4096, space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
context.draw(original, in: CGRect(x: 0, y: 0, width: size, height: size))
let bitmap = NSBitmapImageRep(cgImage: context.makeImage()!)
let data = bitmap.representation(using: .png, properties: [:])!
let path = CommandLine.arguments[1]
try data.write(to: URL(fileURLWithPath: path))
print("Saved original app icon to \(path)")
