import UIKit

enum PhotoProcessor {
    enum Failure: LocalizedError {
        case tooSmall, encoding
        var errorDescription: String? {
            switch self {
            case .tooSmall: "Use an image at least 600 pixels wide and tall. A higher-resolution original works best."
            case .encoding: "This photo could not be exported under 240 kB. Please try another image."
            }
        }
    }

    static func normalized(_ image: UIImage) -> UIImage {
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = true
        let size = CGSize(width: image.size.width * image.scale, height: image.size.height * image.scale)
        return UIGraphicsImageRenderer(size: size, format: format).image { _ in image.draw(in: CGRect(origin: .zero, size: size)) }
    }

    /// Crop coordinates are fractions of the rendered square; no filters or appearance changes.
    static func export(_ image: UIImage, zoom: CGFloat, offset: CGSize) throws -> Data {
        let source = normalized(image)
        guard min(source.size.width, source.size.height) / zoom >= 600 else { throw Failure.tooSmall }
        let side: CGFloat = 600
        let scale = max(side / source.size.width, side / source.size.height) * zoom
        let size = CGSize(width: source.size.width * scale, height: source.size.height * scale)
        let maxX = (size.width - side) / 2
        let maxY = (size.height - side) / 2
        let x = min(max(offset.width * side, -maxX), maxX)
        let y = min(max(offset.height * side, -maxY), maxY)
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = true
        let output = UIGraphicsImageRenderer(size: CGSize(width: side, height: side), format: format).image { context in
            UIColor.white.setFill()
            context.fill(CGRect(x: 0, y: 0, width: side, height: side))
            source.draw(in: CGRect(x: (side - size.width) / 2 + x, y: (side - size.height) / 2 + y, width: size.width, height: size.height))
        }
        for quality in stride(from: 0.95, through: 0.45, by: -0.05) {
            if let data = output.jpegData(compressionQuality: quality), data.count <= 240_000 { return data }
        }
        throw Failure.encoding
    }
}
