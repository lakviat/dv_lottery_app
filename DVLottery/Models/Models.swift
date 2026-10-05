import Foundation

struct Person: Codable, Identifiable, Equatable {
    var id = UUID()
    var firstName = ""
    var middleName = ""
    var lastName = ""
    var noFirstName = false
    var noLastName = false
    var birthDate = Calendar.current.date(from: DateComponents(year: 1995, month: 1, day: 1))!
    var birthDateConfirmed = false
    var sex = ""
    var birthCity = ""
    var birthCountry = ""
    var displayName: String {
        let name = [firstName, lastName].filter { !$0.isEmpty }.joined(separator: " ")
        return name.isEmpty ? "Primary applicant" : name
    }
    var isComplete: Bool {
        (!firstName.trimmed.isEmpty || noFirstName) && (!lastName.trimmed.isEmpty || noLastName)
        && !(noFirstName && noLastName) && birthDateConfirmed && birthDate <= Date()
        && !sex.isEmpty && !birthCity.trimmed.isEmpty && !birthCountry.trimmed.isEmpty
    }
}

struct FamilyMember: Codable, Identifiable, Equatable {
    var person = Person()
    var relationship = "Child"
    var id: UUID { person.id }
}

struct EntryDraft: Codable, Equatable {
    var applicant = Person()
    var eligibilityCountry = ""
    var eligibilityBasis = "Country of birth"
    var qualification = ""
    var reviewedEligibility = false
    var email = ""
    var phone = ""
    var careOf = ""
    var address1 = ""
    var address2 = ""
    var city = ""
    var province = ""
    var postalCode = ""
    var noPostalCode = false
    var addressCountry = ""
    var residenceCountry = ""
    var education = ""
    var passportPlan = ""
    var passportRulesReviewed = false
    var maritalStatus = ""
    var family: [FamilyMember] = []
    var familyReviewed = false
    var reviewConfirmed = false
    var step = 0
    var started = false

    var people: [Person] { [applicant] + family.map(\.person) }
    var needsSpouse: Bool { maritalStatus == "Married — spouse is not a U.S. citizen / LPR" }

    func issues(for step: Int, photos: [PhotoRecord], now: Date = Date()) -> [String] {
        switch step {
        case 0:
            var issues: [String] = []
            if eligibilityCountry.trimmed.isEmpty { issues.append("Add your country of eligibility.") }
            if qualification.isEmpty { issues.append("Choose your education or work experience basis.") }
            if !reviewedEligibility { issues.append("Review the official eligibility instructions.") }
            return issues
        case 1:
            var issues: [String] = []
            if !applicant.isComplete { issues.append("Complete your name, confirmed birth date, sex, and birthplace.") }
            if education.isEmpty { issues.append("Choose your highest level of education.") }
            if passportPlan.isEmpty || !passportRulesReviewed { issues.append("Review the passport and page-scan requirements.") }
            return issues
        case 2:
            var issues: [String] = []
            if email.range(of: #"^[^\s@]+@[^\s@]+\.[^\s@]+$"#, options: .regularExpression) == nil { issues.append("Enter a valid email address.") }
            if [address1, city, province, addressCountry, residenceCountry].contains(where: { $0.trimmed.isEmpty }) { issues.append("Complete your mailing address and country of residence.") }
            if postalCode.trimmed.isEmpty && !noPostalCode { issues.append("Enter a postal code or select no postal code.") }
            return issues
        case 3:
            var issues: [String] = []
            if maritalStatus.isEmpty { issues.append("Choose your current marital status.") }
            if !familyReviewed { issues.append("Confirm that you have reviewed who must be included.") }
            let spouses = family.filter { $0.relationship == "Spouse" }
            if needsSpouse && spouses.count != 1 { issues.append("Include exactly one spouse record for this marital status.") }
            if !needsSpouse && !spouses.isEmpty { issues.append("Review the spouse record against your selected marital status.") }
            if family.contains(where: { !$0.person.isComplete }) { issues.append("Complete the details for every family member.") }
            return issues
        case 4:
            return people.compactMap { person in
                photos.contains(where: { $0.personID == person.id && $0.isReviewed(at: now) }) ? nil : "Add and review a recent photo for \(person.displayName)."
            }
        default:
            return reviewConfirmed ? [] : ["Confirm you have reviewed your preparation details."]
        }
    }
    func completedSteps(photos: [PhotoRecord]) -> Int { (0..<6).filter { issues(for: $0, photos: photos).isEmpty }.count }
}

struct PhotoRecord: Codable, Identifiable, Equatable {
    var id = UUID()
    var personID: UUID
    var name: String
    var fileName: String
    var takenOn: Date
    var createdAt = Date()
    var byteCount: Int
    var compositionReviewed: Bool
    var notReused: Bool
    func isRecent(at date: Date) -> Bool {
        guard let cutoff = Calendar.current.date(byAdding: .month, value: -6, to: date) else { return false }
        return takenOn >= cutoff && takenOn <= date
    }
    func isReviewed(at date: Date) -> Bool { compositionReviewed && notReused && isRecent(at: date) }
    var isReviewed: Bool { isReviewed(at: Date()) }
}

enum EntryStatus: String, Codable, CaseIterable, Identifiable {
    case submitted = "Entry submitted"
    case notSelected = "Not selected"
    case selected = "Selected"
    case ds260 = "DS-260 submitted"
    case interview = "Interview scheduled"
    case issued = "Visa issued"
    case refused = "Visa refused"
    var id: String { rawValue }
    var symbol: String {
        switch self {
        case .submitted: "paperplane"
        case .notSelected: "tray"
        case .selected: "star"
        case .ds260: "doc.text"
        case .interview: "calendar"
        case .issued: "checkmark.seal"
        case .refused: "exclamationmark.circle"
        }
    }
}

struct StatusEvent: Codable, Identifiable, Equatable {
    var id = UUID()
    var status: EntryStatus
    var date: Date
    var note: String
}

struct SavedEntry: Codable, Identifiable, Equatable {
    var id = UUID()
    var year: Int
    var name: String
    var surname: String
    var birthYear: String
    var confirmation: String
    var caseNumber = ""
    var submittedOn: Date
    var events: [StatusEvent]
    var status: EntryStatus { events.last?.status ?? .submitted }
    var maskedConfirmation: String { String(confirmation.prefix(4)) + " •••• •••• " + String(confirmation.suffix(4)) }
}

struct AppData: Codable {
    var schemaVersion = 1
    var draft = EntryDraft()
    var photos: [PhotoRecord] = []
    var entries: [SavedEntry] = []
}

enum EntryValidation {
    static func confirmation(_ value: String, year: Int) -> Bool {
        value.range(of: #"^[0-9]{4}[A-Z0-9]{12}$"#, options: .regularExpression) != nil && value.hasPrefix(String(year))
    }
    static func isDuplicate(_ value: String, in entries: [SavedEntry]) -> Bool {
        entries.contains { $0.confirmation == value.trimmed.uppercased() }
    }
}

extension String { var trimmed: String { trimmingCharacters(in: .whitespacesAndNewlines) } }

enum Official {
    static let portal = URL(string: "https://dvprogram.state.gov/")!
    static let results = URL(string: "https://dvprogram.state.gov/ESC/")!
    static let instructions = URL(string: "https://travel.state.gov/content/travel/en/us-visas/immigrate/diversity-visa-program-entry/diversity-visa-instructions.html")!
    static let photos = URL(string: "https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/photos.html")!
    static let dates = URL(string: "https://travel.state.gov/content/travel/en/News/visas-news/changes-to-2027-dv-program-entry-period.html")!
    static let fees = URL(string: "https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/fees/fees-visa-services.html")!
    static let bulletin = URL(string: "https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html")!
    static let news = URL(string: "https://travel.state.gov/content/travel/en/News/visas-news.html")!
    static let passportRule = URL(string: "https://www.govinfo.gov/content/pkg/FR-2026-03-11/pdf/2026-04737.pdf")!
    static let checked = "October 5, 2026"
}
