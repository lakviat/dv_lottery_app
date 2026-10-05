import AppKit

// Export the approved raster artwork at platform sizes. Never redraw the logo.
// Run from the repository root: swift scripts/generate_icon.swift
let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
let sourceURL = root.appendingPathComponent("assets/branding/icon-source.png")
guard let image = NSImage(contentsOf: sourceURL),
      let source = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    fatalError("Missing approved artwork at \(sourceURL.path)")
}

func export(_ path: String, size: Int, rounded: Bool = false) throws {
    let alpha = rounded ? CGImageAlphaInfo.premultipliedLast : .noneSkipLast
    let context = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8,
                            bytesPerRow: size * 4, space: CGColorSpace(name: CGColorSpace.sRGB)!,
                            bitmapInfo: alpha.rawValue)!
    let rect = CGRect(x: 0, y: 0, width: size, height: size)
    if rounded {
        let radius = CGFloat(size) * 0.225
        context.addPath(CGPath(roundedRect: rect, cornerWidth: radius, cornerHeight: radius, transform: nil))
        context.clip()
    }
    context.interpolationQuality = .high
    context.draw(source, in: rect)
    let bitmap = NSBitmapImageRep(cgImage: context.makeImage()!)
    let destination = root.appendingPathComponent(path)
    try FileManager.default.createDirectory(at: destination.deletingLastPathComponent(), withIntermediateDirectories: true)
    try bitmap.representation(using: .png, properties: [:])!.write(to: destination)
    print("Exported \(path) (\(size)px)")
}

// The OS masks the opaque app icon. In-app and launch marks use the same artwork.
try export("assets/branding/icon.png", size: 1024)
try export("DVLottery/Assets.xcassets/AppIcon.appiconset/AppIcon.png", size: 1024)
try export("assets/branding/mark.png", size: 512, rounded: true)
try export("DVLottery/Assets.xcassets/BrandIcon.imageset/BrandIcon.png", size: 512, rounded: true)
