import ExpoModulesCore
import Foundation

public class PassportReaderModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PassportReader")
    AsyncFunction("recognize") { (uri: String) -> [String] in
      guard let url = URL(string: uri), url.isFileURL,
            let cache = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first,
            url.resolvingSymlinksInPath().path.hasPrefix(cache.resolvingSymlinksInPath().path + "/") else {
        throw NSError(domain: "PassportReader", code: 2,
                      userInfo: [NSLocalizedDescriptionKey: "Select a passport photo using the app’s camera or photo picker."])
      }
      return try PassportTextRecognizer.recognize(url)
    }.runOnQueue(DispatchQueue(label: "dvlottery.passport-recognition", qos: .userInitiated))
    AsyncFunction("analyzePhoto") { (uri: String) -> [String: Double] in
      try autoreleasepool {
        try PhotoAnalyzer.analyze(uri)
      }
    }.runOnQueue(DispatchQueue(label: "dvlottery.photo-analysis", qos: .userInitiated))
  }
}
