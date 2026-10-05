import Foundation
import ImageIO
import Vision

enum PassportTextRecognizer {
  // Vision runs entirely on the device. No raw image or OCR text is logged.
  static func recognize(_ url: URL) throws -> [String] {
    guard url.isFileURL,
          let source = CGImageSourceCreateWithURL(url as CFURL, nil),
          let image = CGImageSourceCreateThumbnailAtIndex(source, 0, [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: 4096
          ] as CFDictionary) else {
      throw NSError(domain: "PassportReader", code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "Choose a readable photo of your passport’s identity page."])
    }
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.recognitionLanguages = ["en-US"]
    request.usesLanguageCorrection = false // Do not autocorrect passport identifiers.
    request.minimumTextHeight = 0.008
    try VNImageRequestHandler(cgImage: image).perform([request])
    let observations = request.results ?? []
    var lines = observations.compactMap { $0.topCandidates(1).first?.string }

    // Vision sometimes splits the machine-readable line into several observations.
    // Join only neighboring observations on the same baseline, left to right.
    var rows: [[VNRecognizedTextObservation]] = []
    for observation in observations.sorted(by: { $0.boundingBox.midY > $1.boundingBox.midY }) {
      if let index = rows.firstIndex(where: {
        abs($0[0].boundingBox.midY - observation.boundingBox.midY) < min($0[0].boundingBox.height, observation.boundingBox.height) * 0.45
      }) {
        rows[index].append(observation)
      } else {
        rows.append([observation])
      }
    }
    for row in rows where row.count > 1 {
      lines.append(row.sorted { $0.boundingBox.minX < $1.boundingBox.minX }
        .compactMap { $0.topCandidates(1).first?.string }.joined())
    }
    return lines
  }
}
