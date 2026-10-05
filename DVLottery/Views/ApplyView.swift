import SwiftUI

struct ApplyView: View {
    @EnvironmentObject private var store: AppStore
    @Binding var tab: AppTab
    @State private var issues: [String] = []
    @State private var browser: BrowserDestination?
    private let steps = ["Eligibility", "Personal", "Contact", "Family", "Photos", "Review"]

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: 23) {
                    PageHeading(eyebrow: "A little preparation goes a long way", title: "Let’s get you ready.", subtitle: "Build your entry at your own pace. Your progress is saved on this device.").id("top")
                    HStack {
                        StatusPill(title: "Preparation draft")
                        Spacer()
                        Label("Saved on device", systemImage: "internaldrive").font(.system(size: 10)).foregroundStyle(Palette.muted)
                    }
                    VStack(alignment: .leading, spacing: 12) {
                        HStack { Text("STEP \(store.data.draft.step + 1) OF 6").font(.system(size: 10, weight: .bold)).tracking(1.7); Spacer(); Text(steps[store.data.draft.step]).font(.caption.weight(.semibold)) }.foregroundStyle(Palette.blue)
                        HStack(spacing: 6) {
                            ForEach(0..<6) { index in
                                Button {
                                    store.data.draft.step = index
                                    issues = []
                                } label: {
                                    Capsule().fill(index <= store.data.draft.step ? Palette.navy : Palette.line).frame(height: 5).padding(.vertical, 8)
                                }.accessibilityLabel("Step \(index + 1), \(steps[index])")
                            }
                        }
                    }
                    stepContent
                    if !issues.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            ForEach(issues, id: \.self) { Text("• " + $0).font(.footnote).foregroundStyle(Palette.red) }
                        }.padding(16).frame(maxWidth: .infinity, alignment: .leading).background(Palette.red.opacity(0.06), in: RoundedRectangle(cornerRadius: 14)).accessibilityIdentifier("validationErrors")
                    }
                    if store.data.draft.step < 5 {
                        PrimaryButton(title: "Save & continue") {
                            issues = store.data.draft.issues(for: store.data.draft.step, photos: store.data.photos)
                            if issues.isEmpty {
                                store.data.draft.started = true
                                store.data.draft.step += 1
                                withAnimation { proxy.scrollTo("top", anchor: .top) }
                            }
                        }.accessibilityIdentifier("continueStep")
                    }
                    if store.data.draft.step > 0 {
                        Button { store.data.draft.step -= 1; issues = []; proxy.scrollTo("top", anchor: .top) } label: {
                            Label("Previous step", systemImage: "arrow.left").font(.subheadline.weight(.medium)).frame(maxWidth: .infinity).padding(.vertical, 5)
                        }
                    }
                    Note(text: "This is a preparation checklist. Official registration dates and annual requirements must be confirmed before you submit.")
                }.padding(22).padding(.bottom, 24).frame(maxWidth: 740).frame(maxWidth: .infinity)
            }.scrollDismissesKeyboard(.interactively).background(Palette.background).toolbar(.hidden, for: .navigationBar)
        }.sheet(item: $browser) { OfficialBrowser(url: $0.url).ignoresSafeArea() }
    }

    @ViewBuilder private var stepContent: some View {
        switch store.data.draft.step {
        case 0: eligibility
        case 1: personal
        case 2: contact
        case 3: family
        case 4: photos
        default: review
        }
    }

    private var eligibility: some View {
        VStack(spacing: 18) {
            Card {
                VStack(alignment: .leading, spacing: 20) {
                    IconTile(icon: "globe.americas")
                    SectionHeading(title: "Start with eligibility", subtitle: "Your country of eligibility may differ from where you live or your citizenship.")
                    CountryField(title: "Country of eligibility", value: $store.data.draft.eligibilityCountry)
                    ChoiceField(title: "Eligibility basis", value: $store.data.draft.eligibilityBasis, options: ["Country of birth", "Spouse’s country — review instructions", "Parent’s country — review instructions"])
                    ChoiceField(title: "Education or work experience", value: $store.data.draft.qualification, options: ["Qualifying high school education", "Qualifying work experience", "I need to review my qualifications"])
                    Note(text: "Country lists change by program year. Work experience has specific occupation and experience criteria. These choices do not determine your eligibility.")
                }
            }
            Card {
                VStack(spacing: 16) {
                    ResourceButton(title: "Read the official instructions", subtitle: "Check the rules for your intended program year", icon: "book") { browser = BrowserDestination(url: Official.instructions) }
                    Toggle("I have reviewed the country and qualification requirements.", isOn: $store.data.draft.reviewedEligibility).font(.subheadline).tint(Palette.navy)
                }
            }
        }
    }

    private var personal: some View {
        Card {
            VStack(alignment: .leading, spacing: 20) {
                SectionHeading(title: "A little about you", subtitle: "Use your legal details exactly as required by the official form.")
                PersonFields(person: $store.data.draft.applicant)
                ChoiceField(title: "Highest level of education", value: $store.data.draft.education, options: ["Primary school only", "High school, no degree", "High school degree", "Vocational school", "Some university courses", "University degree", "Some graduate-level courses", "Master’s degree", "Some doctorate-level courses", "Doctorate degree"])
                Divider()
                SectionHeading(title: "Passport & page scans")
                Note(text: "A 2026 rule adds valid passport information and scans of the biographic and signature pages, with limited exemptions. Have your passport name, number, issuing authority, expiry date, and scans ready for the official form.")
                ChoiceField(title: "Passport preparation", value: $store.data.draft.passportPlan, options: ["My unexpired passport and page scans are ready", "I reviewed a potentially applicable exemption"])
                Button("Read the passport rule") { browser = BrowserDestination(url: Official.passportRule) }.font(.subheadline.weight(.semibold))
                Toggle("I reviewed the passport rules and will check the current annual instructions.", isOn: $store.data.draft.passportRulesReviewed).font(.subheadline)
                Text("This version tracks readiness. Enter passport details and upload scans directly on the official website; passport scans are not stored in the app.").font(.caption).foregroundStyle(Palette.muted)
            }
        }
    }

    private var contact: some View {
        Card {
            VStack(alignment: .leading, spacing: 18) {
                SectionHeading(title: "Where to reach you", subtitle: "Use an email address you can keep access to.")
                InputField(title: "Email address", placeholder: "you@example.com", value: $store.data.draft.email, keyboard: .emailAddress).textInputAutocapitalization(.never)
                InputField(title: "Phone number (optional)", placeholder: "+1 555 000 0000", value: $store.data.draft.phone, keyboard: .phonePad)
                Divider()
                InputField(title: "In care of (optional)", placeholder: "Recipient name", value: $store.data.draft.careOf)
                InputField(title: "Address line 1", placeholder: "Street and building", value: $store.data.draft.address1)
                InputField(title: "Address line 2 (optional)", placeholder: "Apartment or unit", value: $store.data.draft.address2)
                InputField(title: "City / town", placeholder: "City", value: $store.data.draft.city)
                InputField(title: "District / county / province / state", placeholder: "Region", value: $store.data.draft.province)
                if !store.data.draft.noPostalCode { InputField(title: "Postal code", placeholder: "Postal code", value: $store.data.draft.postalCode) }
                Toggle("No postal code", isOn: $store.data.draft.noPostalCode).font(.subheadline)
                CountryField(title: "Mailing country", value: $store.data.draft.addressCountry)
                CountryField(title: "Country where you live today", value: $store.data.draft.residenceCountry)
            }
        }
    }

    private var family: some View {
        VStack(spacing: 18) {
            Card {
                VStack(alignment: .leading, spacing: 20) {
                    SectionHeading(title: "Your family, included", subtitle: "Review every person who must appear on your entry.")
                    ChoiceField(title: "Current marital status", value: $store.data.draft.maritalStatus, options: ["Unmarried", "Married — spouse is not a U.S. citizen / LPR", "Married — spouse is a U.S. citizen / LPR", "Divorced", "Widowed", "Legally separated"])
                    Note(text: "Generally include your spouse and all living unmarried children under 21, including adopted children and stepchildren, even if they will not immigrate. U.S. citizen / permanent resident and legal-separation exceptions require careful review.")
                    Button("Read the official family instructions") { browser = BrowserDestination(url: Official.instructions) }.font(.subheadline.weight(.semibold))
                }
            }
            ForEach($store.data.draft.family) { $member in
                Card {
                    VStack(alignment: .leading, spacing: 18) {
                        HStack {
                            Text(member.relationship).font(.headline).foregroundStyle(Palette.navy)
                            Spacer()
                            Button(role: .destructive) { store.data.draft.family.removeAll { $0.id == member.id } } label: { Image(systemName: "trash").frame(width: 44, height: 44) }.accessibilityLabel("Remove family member")
                        }
                        PersonFields(person: $member.person)
                    }
                }
            }
            HStack {
                if store.data.draft.needsSpouse && !store.data.draft.family.contains(where: { $0.relationship == "Spouse" }) {
                    Button { store.data.draft.family.append(FamilyMember(relationship: "Spouse")) } label: { Label("Add spouse", systemImage: "plus") }
                }
                Button { store.data.draft.family.append(FamilyMember()) } label: { Label("Add child", systemImage: "plus") }
            }.font(.subheadline.weight(.semibold)).frame(maxWidth: .infinity).padding(16).background(.white, in: RoundedRectangle(cornerRadius: 14))
            Card {
                Toggle("I reviewed the family rules and included everyone required, or have no required family members.", isOn: $store.data.draft.familyReviewed).font(.subheadline)
            }
        }
    }

    private var photos: some View {
        Card {
            VStack(alignment: .leading, spacing: 20) {
                SectionHeading(title: "Put your best photo forward", subtitle: "Each included person needs their own recent photo.")
                ForEach(store.data.draft.people) { person in
                    HStack(spacing: 13) {
                        IconTile(icon: "person.crop.rectangle")
                        VStack(alignment: .leading, spacing: 5) {
                            Text(person.displayName).font(.subheadline.weight(.semibold))
                            Text(store.data.photos.contains(where: { $0.personID == person.id && $0.isReviewed }) ? "Photo reviewed by you" : "Photo needs attention").font(.caption).foregroundStyle(Palette.muted)
                        }
                        Spacer()
                    }
                }
                PrimaryButton(title: "Open photo studio", icon: "camera") { tab = .photos }
                Note(text: "Save and review each photo in Photos, then return here to continue. Technical checks do not guarantee government acceptance.")
            }
        }
    }

    private var review: some View {
        VStack(spacing: 18) {
            Card {
                VStack(alignment: .leading, spacing: 18) {
                    SectionHeading(title: "Take one more look", subtitle: "Check your details before visiting the official portal.")
                    ForEach(0..<5) { index in
                        Button { store.data.draft.step = index; issues = [] } label: {
                            HStack {
                                Image(systemName: store.data.draft.issues(for: index, photos: store.data.photos).isEmpty ? "checkmark.circle.fill" : "circle.dashed")
                                    .foregroundStyle(store.data.draft.issues(for: index, photos: store.data.photos).isEmpty ? Palette.green : Palette.gold)
                                Text(steps[index]).font(.subheadline.weight(.medium)).foregroundStyle(Palette.navy)
                                Spacer()
                                Text(store.data.draft.issues(for: index, photos: store.data.photos).isEmpty ? "Reviewed" : "Continue").font(.caption).foregroundStyle(Palette.muted)
                                Image(systemName: "chevron.right").font(.caption).foregroundStyle(Palette.muted)
                            }.padding(.vertical, 7)
                        }.buttonStyle(.plain)
                    }
                    Divider()
                    Text(store.data.draft.applicant.displayName).font(.headline)
                    if !store.data.draft.email.isEmpty { Text(store.data.draft.email).font(.subheadline).foregroundStyle(Palette.muted) }
                    Text("\(store.data.draft.family.count) family members · \(store.data.draft.eligibilityCountry.isEmpty ? "Country not added" : store.data.draft.eligibilityCountry)").font(.caption).foregroundStyle(Palette.muted)
                    Toggle("I reviewed my details and understand that this draft has not been submitted.", isOn: $store.data.draft.reviewConfirmed).font(.subheadline)
                }
            }
            Card {
                VStack(alignment: .leading, spacing: 17) {
                    StatusPill(title: "Official opening unconfirmed", color: Palette.gold)
                    Text("The next step happens at the official portal.").font(.title3.weight(.bold)).foregroundStyle(Palette.navy)
                    Text("When registration is open, enter your reviewed information on dvprogram.state.gov. The app does not transfer or submit this draft. Complete any official verification and payment there, then keep the confirmation page.").font(.subheadline).foregroundStyle(Palette.muted).lineSpacing(4)
                    PrimaryButton(title: "Visit the official DV portal", icon: "arrow.up.right") { browser = BrowserDestination(url: Official.portal) }
                    Button("Already submitted? Save your confirmation") { tab = .entries }.font(.subheadline.weight(.semibold)).frame(maxWidth: .infinity)
                    Note(text: "Only one entry per person per registration period. A saved draft or a saved local record is not proof of submission.")
                }
            }
        }
    }
}

struct InputField: View {
    let title: String
    let placeholder: String
    @Binding var value: String
    var keyboard: UIKeyboardType = .default
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.caption.weight(.semibold)).foregroundStyle(Palette.muted)
            TextField(placeholder, text: $value).font(.subheadline).padding(13)
                .background(Palette.background, in: RoundedRectangle(cornerRadius: 10))
                .keyboardType(keyboard).autocorrectionDisabled().accessibilityLabel(title)
        }
    }
}

struct ChoiceField: View {
    let title: String
    @Binding var value: String
    let options: [String]
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.caption.weight(.semibold)).foregroundStyle(Palette.muted)
            Menu {
                Picker(title, selection: $value) {
                    Text("Choose an option").tag("")
                    ForEach(options, id: \.self) { Text($0).tag($0) }
                }
            } label: {
                HStack {
                    Text(value.isEmpty ? "Choose an option" : value).multilineTextAlignment(.leading)
                    Spacer(minLength: 8)
                    Image(systemName: "chevron.down").font(.caption)
                }.font(.subheadline).foregroundStyle(Palette.navy).padding(13).background(Palette.background, in: RoundedRectangle(cornerRadius: 10))
            }.accessibilityLabel(title)
        }
    }
}

struct CountryField: View {
    let title: String
    @Binding var value: String
    @State private var showing = false
    @State private var query = ""
    private var countries: [String] {
        Locale.Region.isoRegions
            .filter { $0.identifier.count == 2 && $0.identifier.allSatisfy(\.isLetter) && !["EU", "EZ", "QO", "UN", "ZZ", "XA", "XB"].contains($0.identifier) }
            .compactMap { Locale(identifier: "en_US").localizedString(forRegionCode: $0.identifier) }.sorted()
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.caption.weight(.semibold)).foregroundStyle(Palette.muted)
            Button { showing = true } label: {
                HStack { Text(value.isEmpty ? "Choose a country" : value); Spacer(); Image(systemName: "chevron.down").font(.caption) }
                    .font(.subheadline).padding(13).background(Palette.background, in: RoundedRectangle(cornerRadius: 10))
            }.accessibilityLabel(title)
        }.sheet(isPresented: $showing) {
            NavigationStack {
                List {
                    Section { Text("This is a country picker, not a list of eligible countries. Check the annual official instructions.").font(.footnote).foregroundStyle(.secondary) }
                    ForEach(countries.filter { query.isEmpty || $0.localizedCaseInsensitiveContains(query) }, id: \.self) { country in
                        Button { value = country; showing = false; query = "" } label: {
                            HStack { Text(country); Spacer(); if value == country { Image(systemName: "checkmark") } }
                        }
                    }
                }.searchable(text: $query, prompt: "Search countries").navigationTitle(title).navigationBarTitleDisplayMode(.inline)
                    .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { showing = false } } }
            }
        }
    }
}

struct PersonFields: View {
    @Binding var person: Person
    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            if !person.noLastName { InputField(title: "Last / family name", placeholder: "Family name", value: $person.lastName) }
            Toggle("No last / family name", isOn: $person.noLastName).font(.caption).onChange(of: person.noLastName) { _, absent in if absent { person.lastName = "" } }
            if !person.noFirstName { InputField(title: "First name", placeholder: "Given name", value: $person.firstName) }
            Toggle("No first name", isOn: $person.noFirstName).font(.caption).onChange(of: person.noFirstName) { _, absent in if absent { person.firstName = "" } }
            InputField(title: "Middle name (if any)", placeholder: "Middle name", value: $person.middleName)
            DatePicker("Date of birth", selection: $person.birthDate, in: ...Date(), displayedComponents: .date).font(.subheadline)
            Toggle("I confirmed this birth date", isOn: $person.birthDateConfirmed).font(.caption)
            ChoiceField(title: "Sex (as requested by the official form)", value: $person.sex, options: ["Male", "Female"])
            InputField(title: "City / town of birth", placeholder: "Birthplace", value: $person.birthCity)
            CountryField(title: "Country of birth", value: $person.birthCountry)
        }
    }
}
