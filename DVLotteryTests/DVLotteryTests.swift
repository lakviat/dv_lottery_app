import XCTest
import UIKit
@testable import DVLottery

final class DVLotteryTests: XCTestCase {
    func testConfirmationMatchesYearAndRejectsMalformedInput() {
        XCTAssertTrue(EntryValidation.confirmation("2026ABC123DEF456", year: 2026))
        XCTAssertFalse(EntryValidation.confirmation("2025ABC123DEF456", year: 2026))
        XCTAssertFalse(EntryValidation.confirmation("2026ABC-23DEF456", year: 2026))
        XCTAssertFalse(EntryValidation.confirmation("2026ABC123", year: 2026))
    }

    func testPhotoRecencyAndManualReviewAreIndependent() {
        let now = ISO8601DateFormatter().date(from: "2026-10-05T12:00:00Z")!
        var photo = PhotoRecord(personID: UUID(), name: "Test", fileName: "x.jpg", takenOn: now.addingTimeInterval(-86400), byteCount: 50000, compositionReviewed: false, notReused: true)
        XCTAssertFalse(photo.isReviewed(at: now))
        photo.compositionReviewed = true
        XCTAssertTrue(photo.isReviewed(at: now))
        photo.takenOn = Calendar.current.date(byAdding: .month, value: -7, to: now)!
        XCTAssertFalse(photo.isReviewed(at: now))
        photo.takenOn = now.addingTimeInterval(86400)
        XCTAssertFalse(photo.isReviewed(at: now))
    }

    func testFamilyValidationRequiresSpouseAndCompleteFamily() {
        var draft = EntryDraft()
        draft.maritalStatus = "Married — spouse is not a U.S. citizen / LPR"
        draft.familyReviewed = true
        XCTAssertTrue(draft.issues(for: 3, photos: []).contains { $0.contains("exactly one spouse") })
        draft.family.append(FamilyMember(relationship: "Spouse"))
        XCTAssertTrue(draft.issues(for: 3, photos: []).contains { $0.contains("every family member") })
    }

    func testEachIncludedPersonRequiresTheirOwnReviewedPhoto() {
        var draft = EntryDraft()
        draft.family.append(FamilyMember())
        let photo = PhotoRecord(personID: draft.applicant.id, name: "Test", fileName: "x.jpg", takenOn: Date().addingTimeInterval(-60), byteCount: 50000, compositionReviewed: true, notReused: true)
        XCTAssertEqual(draft.issues(for: 4, photos: [photo]).count, 1)
    }

    func testPhotoExportDimensionsFileLimitAndRejectsUpscaling() throws {
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let image = UIGraphicsImageRenderer(size: CGSize(width: 1200, height: 1600), format: format).image { ctx in
            UIColor.blue.setFill(); ctx.fill(CGRect(x: 0, y: 0, width: 1200, height: 1600))
        }
        let bytes = try PhotoProcessor.export(image, zoom: 1, offset: CGSize(width: 100, height: -100))
        let result = try XCTUnwrap(UIImage(data: bytes)?.cgImage)
        XCTAssertEqual(result.width, 600)
        XCTAssertEqual(result.height, 600)
        XCTAssertLessThanOrEqual(bytes.count, 240_000)
        XCTAssertEqual(Array(bytes.prefix(2)), [0xFF, 0xD8])
        XCTAssertThrowsError(try PhotoProcessor.export(image, zoom: 3, offset: .zero))
    }

    @MainActor func testPersistenceRoundTripAndDeletion() throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: directory) }
        let store = AppStore(directory: directory)
        store.data.draft.applicant.firstName = "Test"
        let loaded = AppStore(directory: directory)
        XCTAssertEqual(loaded.data.draft.applicant.firstName, "Test")
        XCTAssertNil(loaded.error)
        XCTAssertEqual(try directory.resourceValues(forKeys: [.isExcludedFromBackupKey]).isExcludedFromBackup, true)
        loaded.deleteAll()
        XCTAssertTrue(AppStore(directory: directory).data.draft.applicant.firstName.isEmpty)
    }

    @MainActor func testCorruptSavedDataIsNotOverwritten() throws {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        defer { try? FileManager.default.removeItem(at: directory) }
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let url = directory.appendingPathComponent("records.json")
        let original = Data("invalid saved records".utf8)
        try original.write(to: url)
        let store = AppStore(directory: directory)
        XCTAssertNotNil(store.error)
        store.data.draft.email = "test@example.com"
        XCTAssertEqual(try Data(contentsOf: url), original)
    }
}
