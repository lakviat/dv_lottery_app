import CoreGraphics
import Foundation
import ImageIO
import Vision

enum PhotoAnalyzer {
  private static let minimumFaceConfidence: Float = 0.85

  static func analyze(_ uri: String) throws -> [String: Double] {
    do {
      let url = try ownedPhotoURL(uri)
      let values = try url.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey])
      guard values.isRegularFile == true, let bytes = values.fileSize, bytes > 0, bytes <= 8 * 1024 * 1024,
            let source = CGImageSourceCreateWithURL(url as CFURL, [kCGImageSourceShouldCache: false] as CFDictionary),
            let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
            let width = properties[kCGImagePropertyPixelWidth] as? NSNumber,
            let height = properties[kCGImagePropertyPixelHeight] as? NSNumber,
            width.doubleValue > 0, height.doubleValue > 0,
            width.doubleValue <= 4096, height.doubleValue <= 4096,
            let image = CGImageSourceCreateThumbnailAtIndex(source, 0, [
              kCGImageSourceCreateThumbnailFromImageAlways: true,
              kCGImageSourceCreateThumbnailWithTransform: true,
              kCGImageSourceThumbnailMaxPixelSize: 1200,
              kCGImageSourceShouldCacheImmediately: true
            ] as CFDictionary) else {
        throw analysisError()
      }
      let rectangles = VNDetectFaceRectanglesRequest()
      if #available(iOS 15.0, *) {
        rectangles.revision = VNDetectFaceRectanglesRequestRevision3
      } else {
        rectangles.revision = VNDetectFaceRectanglesRequestRevision2
      }
      let handler = VNImageRequestHandler(cgImage: image, options: [:])
      try handler.perform([rectangles])
      let faces = rectangles.results ?? []
      let confidentFaces = faces.filter { $0.confidence >= minimumFaceConfidence }
      var result: [String: Double] = [
        "faceCount": Double(faces.count),
        "confidentFaceCount": Double(confidentFaces.count)
      ]
      let singleFace = faces.count == 1 && confidentFaces.count == 1 ? confidentFaces.first : nil
      if let face = singleFace {
        result["faceConfidence"] = Double(face.confidence)
        result["faceCenterX"] = Double(face.boundingBox.midX)
        result["yawDegrees"] = degrees(face.yaw)
        result["rollDegrees"] = degrees(face.roll)
        if #available(iOS 15.0, *) {
          result["pitchDegrees"] = degrees(face.pitch)
        }
        let landmarksRequest = VNDetectFaceLandmarksRequest()
        landmarksRequest.revision = VNDetectFaceLandmarksRequestRevision3
        landmarksRequest.constellation = .constellation76Points
        landmarksRequest.inputFaceObservations = [face]
        // A failed landmarks estimate must not discard successful face and pixel observations.
        if (try? handler.perform([landmarksRequest])) != nil,
           let landmarks = landmarksRequest.results?.first?.landmarks {
          result["landmarksConfidence"] = Double(landmarks.confidence)
          if landmarks.confidence >= 0.9 {
            let faceSize = CGSize(width: face.boundingBox.width * CGFloat(image.width),
                                  height: face.boundingBox.height * CGFloat(image.height))
            result["leftEyeAspectRatio"] = eyeAspectRatio(landmarks.leftEye, faceSize: faceSize)
            result["rightEyeAspectRatio"] = eyeAspectRatio(landmarks.rightEye, faceSize: faceSize)
          }
        }
      }
      try samplePixels(image, face: singleFace?.boundingBox, into: &result)
      return result
    } catch {
      throw analysisError()
    }
  }

  private static func ownedPhotoURL(_ uri: String) throws -> URL {
    guard let url = URL(string: uri), url.isFileURL,
          url.host == nil || url.host == "" || url.host == "localhost",
          url.query == nil, url.fragment == nil,
          let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else {
      throw analysisError()
    }
    let documentsRoot = documents.resolvingSymlinksInPath().standardizedFileURL
    let photoRoot = documentsRoot.appendingPathComponent("dv-lottery-photos", isDirectory: true)
      .standardizedFileURL
    let resolved = url.resolvingSymlinksInPath().standardizedFileURL
    guard resolved.path.hasPrefix(photoRoot.path + "/") else {
      throw analysisError()
    }
    return resolved
  }

  private static func analysisError() -> NSError {
    NSError(domain: "PassportReader", code: 3, userInfo: [
      NSLocalizedDescriptionKey: "Photo analysis could not finish. Retry analysis or choose another original photo."
    ])
  }

  private static func degrees(_ value: NSNumber?) -> Double? {
    guard let radians = value?.doubleValue, radians.isFinite else { return nil }
    return radians * 180 / .pi
  }

  private static func eyeAspectRatio(_ region: VNFaceLandmarkRegion2D?, faceSize: CGSize) -> Double? {
    guard let region = region, region.pointCount >= 6 else { return nil }
    let points = region.normalizedPoints.map {
      CGPoint(x: $0.x * faceSize.width, y: $0.y * faceSize.height)
    }
    var longest = 0.0
    var endpoints: (CGPoint, CGPoint)?
    for i in 0..<points.count {
      for j in (i + 1)..<points.count {
        let distance = hypot(Double(points[j].x - points[i].x), Double(points[j].y - points[i].y))
        if distance > longest {
          longest = distance
          endpoints = (points[i], points[j])
        }
      }
    }
    guard longest >= 8, let (start, end) = endpoints else { return nil }
    // Perpendicular span avoids treating a rolled eye's bounding-box height as openness.
    let distances = points.map {
      (Double(end.x - start.x) * Double($0.y - start.y) -
       Double(end.y - start.y) * Double($0.x - start.x)) / longest
    }
    guard let low = distances.min(), let high = distances.max() else { return nil }
    let ratio = (high - low) / longest
    return ratio.isFinite && ratio >= 0 && ratio <= 0.5 ? ratio : nil
  }

  private static func samplePixels(_ image: CGImage, face: CGRect?, into result: inout [String: Double]) throws {
    let scale = min(1, 256.0 / Double(max(image.width, image.height)))
    let width = max(1, Int(Double(image.width) * scale))
    let height = max(1, Int(Double(image.height) * scale))
    var pixels = [UInt8](repeating: 0, count: width * height * 4)
    let drawn = pixels.withUnsafeMutableBytes { buffer -> Bool in
      guard let space = CGColorSpace(name: CGColorSpace.sRGB),
            let context = CGContext(data: buffer.baseAddress, width: width, height: height,
              bitsPerComponent: 8, bytesPerRow: width * 4, space: space,
              bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue) else {
        return false
      }
      context.setFillColor(gray: 1, alpha: 1)
      let bounds = CGRect(x: 0, y: 0, width: CGFloat(width), height: CGFloat(height))
      context.fill(bounds)
      context.interpolationQuality = .high
      context.draw(image, in: bounds)
      return true
    }
    guard drawn else { throw analysisError() }
    func luminance(_ x: Int, _ y: Int) -> Double {
      let index = (y * width + x) * 4
      return (0.2126 * Double(pixels[index]) + 0.7152 * Double(pixels[index + 1]) +
              0.0722 * Double(pixels[index + 2])) / 255
    }
    let pixelFace = face.map {
      CGRect(x: $0.minX * CGFloat(width), y: (1 - $0.maxY) * CGFloat(height),
             width: $0.width * CGFloat(width), height: $0.height * CGFloat(height))
    }
    let detailArea = pixelFace.map { $0.insetBy(dx: $0.width * 0.15, dy: $0.height * 0.15) }
    var colored = 0, colorSamples = 0, edgeSamples = 0, strongEdges = 0, backgroundSamples = 0, whiteSamples = 0
    var edgeSum = 0.0, backgroundSum = 0.0, backgroundSquares = 0.0
    for y in stride(from: 1, to: height - 1, by: 2) {
      for x in stride(from: 1, to: width - 1, by: 2) {
        let index = (y * width + x) * 4
        let red = Double(pixels[index]) / 255
        let green = Double(pixels[index + 1]) / 255
        let blue = Double(pixels[index + 2]) / 255
        let maximum = max(red, max(green, blue))
        let minimum = min(red, min(green, blue))
        let light = luminance(x, y)
        colorSamples += 1
        if maximum - minimum >= 0.055 && light > 0.06 && light < 0.96 { colored += 1 }
        if let detailArea = detailArea, detailArea.contains(CGPoint(x: CGFloat(x), y: CGFloat(y))) {
          let edge = (abs(light - luminance(x + 1, y)) + abs(light - luminance(x, y + 1))) / 2
          edgeSum += edge
          edgeSamples += 1
          if edge >= 0.035 { strongEdges += 1 }
        }
        let nx = Double(x) / Double(width)
        let ny = Double(y) / Double(height)
        // Sample outer upper areas, excluding a generously expanded head-width band.
        let outsideHead = face.map { nx < Double($0.minX - $0.width * 0.45) ||
          nx > Double($0.maxX + $0.width * 0.45) } ?? false
        if outsideHead && (nx < 0.18 || nx > 0.82) && ny >= 0.08 && ny <= 0.55 {
          backgroundSamples += 1
          backgroundSum += light
          backgroundSquares += light * light
          if light >= 0.78 && maximum - minimum <= 0.12 { whiteSamples += 1 }
        }
      }
    }
    result["colorSampleCount"] = Double(colorSamples)
    if colorSamples > 0 { result["colorfulPixelFraction"] = Double(colored) / Double(colorSamples) }
    result["edgeSampleCount"] = Double(edgeSamples)
    if edgeSamples > 0 {
      result["edgeMean"] = edgeSum / Double(edgeSamples)
      result["edgeStrongFraction"] = Double(strongEdges) / Double(edgeSamples)
    }
    result["backgroundSampleCount"] = Double(backgroundSamples)
    if backgroundSamples > 0 {
      let mean = backgroundSum / Double(backgroundSamples)
      result["backgroundWhiteFraction"] = Double(whiteSamples) / Double(backgroundSamples)
      result["backgroundLuminanceDeviation"] = sqrt(max(0, backgroundSquares / Double(backgroundSamples) - mean * mean))
    }
  }
}
