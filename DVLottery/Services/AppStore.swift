import Foundation
import SwiftUI

@MainActor
final class AppStore: ObservableObject {
    @Published var data: AppData { didSet { if loaded { persist() } } }
    @Published var error: String?
    private var loaded = false
    let directory: URL

    init(directory: URL? = nil) {
        self.directory = directory ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("DVLottery", isDirectory: true)
        data = AppData()
        do {
            try FileManager.default.createDirectory(at: self.directory, withIntermediateDirectories: true, attributes: [.protectionKey: FileProtectionType.complete])
            var folder = self.directory
            var values = URLResourceValues()
            values.isExcludedFromBackup = true
            try folder.setResourceValues(values)
            let url = self.directory.appendingPathComponent("records.json")
            if FileManager.default.fileExists(atPath: url.path) {
                data = try JSONDecoder().decode(AppData.self, from: Data(contentsOf: url))
                guard data.schemaVersion == 1 else { throw CocoaError(.fileReadCorruptFile) }
            }
            loaded = true
        } catch {
            self.error = "Your saved records could not be opened. They have not been overwritten. Close and reopen the app after unlocking your device. \(error.localizedDescription)"
        }
    }

    func persist() {
        guard loaded else { return }
        do {
            let encoded = try JSONEncoder().encode(data)
            try encoded.write(to: directory.appendingPathComponent("records.json"), options: [.atomic, .completeFileProtection])
        } catch { self.error = "Changes could not be saved on this device. \(error.localizedDescription)" }
    }

    func addPhoto(jpeg: Data, person: Person, date: Date, reviewed: Bool, notReused: Bool) throws {
        guard loaded else { throw CocoaError(.fileWriteNoPermission) }
        let fileName = UUID().uuidString + ".jpg"
        try jpeg.write(to: directory.appendingPathComponent(fileName), options: [.atomic, .completeFileProtection])
        data.photos.insert(PhotoRecord(personID: person.id, name: person.displayName, fileName: fileName, takenOn: date, byteCount: jpeg.count, compositionReviewed: reviewed, notReused: notReused), at: 0)
    }

    func photoURL(_ photo: PhotoRecord) -> URL { directory.appendingPathComponent(photo.fileName) }

    func deletePhoto(_ photo: PhotoRecord) {
        do {
            let url = photoURL(photo)
            if FileManager.default.fileExists(atPath: url.path) { try FileManager.default.removeItem(at: url) }
            data.photos.removeAll { $0.id == photo.id }
        } catch { self.error = "The photo could not be deleted. \(error.localizedDescription)" }
    }

    func deleteAll() {
        do {
            // Remove only files inside this app's own data folder.
            for file in try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil) { try FileManager.default.removeItem(at: file) }
            loaded = true
            data = AppData()
        } catch { self.error = "Some records could not be deleted. \(error.localizedDescription)" }
    }
}
