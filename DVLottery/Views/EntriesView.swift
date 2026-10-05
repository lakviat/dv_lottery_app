import SwiftUI

struct EntriesView: View {
    @EnvironmentObject private var store: AppStore
    @State private var addEntry = false
    @State private var search = ""
    @State private var browser: BrowserDestination?
    private var entries: [SavedEntry] {
        store.data.entries.filter { search.isEmpty || $0.name.localizedCaseInsensitiveContains(search) || String($0.year).contains(search) }
            .sorted { $0.year == $1.year ? $0.submittedOn > $1.submittedOn : $0.year > $1.year }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                PageHeading(eyebrow: "Your history, in one place", title: "Every entry matters.", subtitle: "Keep your confirmations and milestones close, year after year.")
                PrimaryButton(title: "Add a submitted entry", icon: "plus") { addEntry = true }.accessibilityIdentifier("addEntry")
                if store.data.entries.isEmpty {
                    Card(padding: 26) {
                        VStack(spacing: 19) {
                            ZStack {
                                Circle().fill(Palette.background).frame(width: 106, height: 106)
                                Image(systemName: "tray.full").font(.system(size: 43, weight: .light)).foregroundStyle(Palette.blue)
                            }.padding(.top, 9)
                            Text("Your story starts here").font(.title3.weight(.bold)).foregroundStyle(Palette.navy)
                            Text("Already entered a DV lottery? Save your confirmation number and build a timeline of what happens next.").font(.subheadline).foregroundStyle(Palette.muted).multilineTextAlignment(.center).lineSpacing(4)
                            Text("Nothing is submitted when you add a record.").font(.caption).foregroundStyle(Palette.muted).padding(.bottom, 9)
                        }.frame(maxWidth: .infinity)
                    }
                } else {
                    HStack {
                        Image(systemName: "magnifyingglass").foregroundStyle(Palette.muted)
                        TextField("Search by name or program year", text: $search).font(.subheadline).autocorrectionDisabled()
                    }.padding(15).background(.white, in: RoundedRectangle(cornerRadius: 13))
                    ForEach(entries) { entry in
                        NavigationLink { EntryDetailView(entryID: entry.id) } label: { EntryCard(entry: entry) }.buttonStyle(.plain)
                    }
                    if entries.isEmpty { ContentUnavailableView.search(text: search) }
                }
                Card {
                    VStack(alignment: .leading, spacing: 16) {
                        HStack { IconTile(icon: "checkmark.shield"); Text("Check at the source").font(.headline).foregroundStyle(Palette.navy) }
                        Text("Entrant Status Check is the official way to find out if you were selected. You’ll need your confirmation number, last name, and birth year.").font(.subheadline).foregroundStyle(Palette.muted).lineSpacing(4)
                        ResourceButton(title: "Open Entrant Status Check", subtitle: "dvprogram.state.gov", icon: "globe") { browser = BrowserDestination(url: Official.results) }
                    }
                }
                Note(text: "Timeline updates are recorded by you. The app does not automatically retrieve results, predict selection, or track USCIS receipt numbers.")
            }.padding(22).padding(.bottom, 24).frame(maxWidth: 740).frame(maxWidth: .infinity)
        }.background(Palette.background).toolbar(.hidden, for: .navigationBar)
            .sheet(isPresented: $addEntry) { AddEntryView() }
            .sheet(item: $browser) { OfficialBrowser(url: $0.url).ignoresSafeArea() }
    }
}

struct EntryCard: View {
    let entry: SavedEntry
    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 17) {
                HStack {
                    Text("DV–\(String(entry.year))").font(.title2.weight(.bold)).foregroundStyle(Palette.navy)
                    Spacer()
                    Image(systemName: "chevron.right").font(.caption.weight(.bold)).foregroundStyle(Palette.muted)
                }
                Text(entry.name).font(.subheadline.weight(.semibold)).foregroundStyle(Palette.navy)
                Text(entry.maskedConfirmation).font(.system(.caption, design: .monospaced)).foregroundStyle(Palette.muted)
                Divider()
                HStack {
                    Label(entry.status.rawValue, systemImage: entry.status.symbol).font(.caption.weight(.semibold)).foregroundStyle(Palette.blue)
                    Spacer()
                    Text("Recorded by you").font(.system(size: 10)).foregroundStyle(Palette.muted)
                }
            }
        }
    }
}

struct AddEntryView: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.dismiss) private var dismiss
    @State private var year = 2026
    @State private var name = ""
    @State private var surname = ""
    @State private var birthYear = ""
    @State private var confirmation = ""
    @State private var submitted = Date()
    @State private var attested = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 21) {
                    SectionHeading(title: "Keep your confirmation safe", subtitle: "Copy the details from your official confirmation page.")
                    Card {
                        VStack(alignment: .leading, spacing: 19) {
                            Picker("DV program year", selection: $year) { ForEach((2000...(Calendar.current.component(.year, from: Date()) + 2)).reversed(), id: \.self) { Text("DV–\(String($0))").tag($0) } }.font(.subheadline)
                            Note(text: "Use the program year on the confirmation, not the calendar year when you submitted.")
                            InputField(title: "Applicant name", placeholder: "Full name", value: $name)
                            InputField(title: "Last / family name for status check", placeholder: "As shown on the entry", value: $surname)
                            InputField(title: "Birth year", placeholder: "YYYY", value: $birthYear, keyboard: .numberPad)
                            InputField(title: "Confirmation number", placeholder: "16 characters from your confirmation", value: $confirmation).textInputAutocapitalization(.characters)
                                .onChange(of: confirmation) { _, value in confirmation = value.uppercased().filter { !$0.isWhitespace } }
                            DatePicker("Submitted on", selection: $submitted, in: ...Date(), displayedComponents: .date).font(.subheadline)
                            Toggle("I received this confirmation after submitting an official DV entry.", isOn: $attested).font(.subheadline)
                        }
                    }
                    if let error { Text(error).font(.footnote).foregroundStyle(Palette.red).accessibilityIdentifier("entryError") }
                    PrimaryButton(title: "Save entry", icon: "checkmark") { save() }.accessibilityIdentifier("saveEntry")
                    Note(text: "This saves a local record. It does not submit a new entry or verify this confirmation with the government. Keep a separate secure copy of your official confirmation page.")
                }.padding(22).frame(maxWidth: 640).frame(maxWidth: .infinity)
            }.scrollDismissesKeyboard(.interactively).background(Palette.background).navigationTitle("Add entry").navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                    ToolbarItemGroup(placement: .keyboard) {
                        Spacer()
                        Button("Done") { UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil) }
                    }
                }
        }
    }

    private func save() {
        guard !name.trimmed.isEmpty, !surname.trimmed.isEmpty else { error = "Enter the applicant name and last / family name."; return }
        guard birthYear.count == 4, let birth = Int(birthYear), (1900...Calendar.current.component(.year, from: Date())).contains(birth) else { error = "Enter a valid four-digit birth year."; return }
        guard EntryValidation.confirmation(confirmation, year: year) else { error = "The confirmation must have 16 letters/numbers and begin with \(String(year)). Check the year and number on your confirmation page."; return }
        guard !EntryValidation.isDuplicate(confirmation, in: store.data.entries) else { error = "This confirmation is already saved in My Entries."; return }
        guard !store.data.entries.contains(where: { $0.year == year && $0.name.trimmed.lowercased() == name.trimmed.lowercased() && $0.birthYear == birthYear }) else { error = "A record for this person and program year is already saved. Review the existing record; do not submit a duplicate official entry."; return }
        guard attested else { error = "Confirm that you received this number after an official submission."; return }
        store.data.entries.append(SavedEntry(year: year, name: name.trimmed, surname: surname.trimmed, birthYear: birthYear, confirmation: confirmation, submittedOn: submitted, events: [StatusEvent(status: .submitted, date: submitted, note: "Confirmation saved by you. Not verified with the government.")]))
        dismiss()
    }
}

struct EntryDetailView: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.dismiss) private var dismiss
    let entryID: UUID
    @State private var revealed = false
    @State private var showUpdate = false
    @State private var delete = false
    @State private var browser: BrowserDestination?
    private var entry: SavedEntry? { store.data.entries.first { $0.id == entryID } }

    var body: some View {
        ScrollView {
            if let entry {
                VStack(alignment: .leading, spacing: 23) {
                    PageHeading(eyebrow: "Saved entry", title: "DV–\(String(entry.year))", subtitle: entry.name)
                    StatusPill(title: entry.status.rawValue)
                    Card {
                        VStack(alignment: .leading, spacing: 16) {
                            HStack { Text("CONFIRMATION NUMBER").font(.system(size: 9, weight: .bold)).tracking(1.5).foregroundStyle(Palette.muted); Spacer(); Button { revealed.toggle() } label: { Image(systemName: revealed ? "eye.slash" : "eye").frame(width: 44, height: 44) }.accessibilityLabel(revealed ? "Hide confirmation number" : "Reveal confirmation number") }
                            Text(revealed ? entry.confirmation : entry.maskedConfirmation).font(.system(.body, design: .monospaced).weight(.semibold)).foregroundStyle(Palette.navy).textSelection(.enabled)
                            Divider()
                            LabeledContent("Last / family name", value: entry.surname)
                            LabeledContent("Birth year", value: entry.birthYear)
                            if !entry.caseNumber.isEmpty { LabeledContent("Selected case number", value: entry.caseNumber) }
                            Text("Submitted \(entry.submittedOn.formatted(date: .abbreviated, time: .omitted))").font(.caption).foregroundStyle(Palette.muted)
                        }.font(.subheadline)
                    }
                    PrimaryButton(title: "Check on the official website", icon: "arrow.up.right") { browser = BrowserDestination(url: Official.results) }
                    Note(text: "Enter your details in the official browser. When you return, record the result yourself below. Opening the site does not update this timeline.")
                    HStack { SectionHeading(title: "Your timeline"); Button { showUpdate = true } label: { Label("Update", systemImage: "plus").font(.caption.weight(.semibold)) }.accessibilityIdentifier("updateStatus") }
                    Card {
                        VStack(alignment: .leading, spacing: 23) {
                            ForEach(entry.events.reversed()) { event in
                                HStack(alignment: .top, spacing: 14) {
                                    IconTile(icon: event.status.symbol, size: 36)
                                    VStack(alignment: .leading, spacing: 7) {
                                        Text(event.status.rawValue).font(.subheadline.weight(.bold)).foregroundStyle(Palette.navy)
                                        Text(event.date.formatted(date: .abbreviated, time: .omitted)).font(.caption).foregroundStyle(Palette.muted)
                                        if !event.note.isEmpty { Text(event.note).font(.caption).foregroundStyle(Palette.muted).lineSpacing(3) }
                                        Text("RECORDED BY YOU").font(.system(size: 8, weight: .semibold)).tracking(1).foregroundStyle(Palette.blue)
                                    }
                                }
                            }
                        }
                    }
                    ResourceButton(title: "View the visa bulletin", subtitle: "Official regional cutoffs for selected cases", icon: "list.bullet.rectangle") { browser = BrowserDestination(url: Official.bulletin) }
                    Button("Delete saved entry", role: .destructive) { delete = true }.font(.subheadline).frame(maxWidth: .infinity).padding(.top, 8)
                }.padding(22).frame(maxWidth: 740).frame(maxWidth: .infinity)
            }
        }.background(Palette.background).navigationTitle("Entry details").navigationBarTitleDisplayMode(.inline)
            .toolbar(.visible, for: .navigationBar)
            .sheet(isPresented: $showUpdate) { UpdateStatusView(entryID: entryID) }
            .sheet(item: $browser) { OfficialBrowser(url: $0.url).ignoresSafeArea() }
            .confirmationDialog("Delete this local entry and its timeline?", isPresented: $delete, titleVisibility: .visible) {
                Button("Delete entry", role: .destructive) { store.data.entries.removeAll { $0.id == entryID }; dismiss() }
            } message: { Text("Your official DV submission will not be affected.") }
    }
}

struct UpdateStatusView: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.dismiss) private var dismiss
    let entryID: UUID
    @State private var status = EntryStatus.submitted
    @State private var date = Date()
    @State private var note = ""
    @State private var caseNumber = ""
    @State private var confirmed = false
    var body: some View {
        NavigationStack {
            Form {
                Section("What did the official source show?") {
                    Picker("Status", selection: $status) { ForEach(EntryStatus.allCases) { Text($0.rawValue).tag($0) } }
                    DatePicker("Recorded on", selection: $date, in: ...Date(), displayedComponents: .date)
                    TextField("Selected case number (optional)", text: $caseNumber).textInputAutocapitalization(.characters).autocorrectionDisabled()
                    TextField("Notes (optional)", text: $note, axis: .vertical).lineLimit(3...6)
                }
                Section {
                    Toggle("I am recording information I checked with an official source.", isOn: $confirmed)
                } footer: { Text("Selection does not guarantee a visa. This timeline is your own record, not a live government status.") }
                Section {
                    Button("Save update") {
                        if let index = store.data.entries.firstIndex(where: { $0.id == entryID }) {
                            store.data.entries[index].caseNumber = caseNumber.trimmed.uppercased()
                            store.data.entries[index].events.append(StatusEvent(status: status, date: date, note: note.trimmed))
                        }
                        dismiss()
                    }.disabled(!confirmed)
                }
            }.navigationTitle("Record an update").navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
        }.onAppear {
            if let entry = store.data.entries.first(where: { $0.id == entryID }) { status = entry.status; caseNumber = entry.caseNumber }
        }
    }
}
