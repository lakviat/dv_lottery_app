import SwiftUI
import PhotosUI
import AVFoundation

struct ImportedPhoto: Identifiable { let id = UUID(); let image: UIImage }

struct PhotosView: View {
    @EnvironmentObject private var store: AppStore
    @State private var selectedItem: PhotosPickerItem?
    @State private var imported: ImportedPhoto?
    @State private var showCamera = false
    @State private var error: String?
    @State private var browser: BrowserDestination?
    @State private var selectedPhoto: PhotoRecord?
    @State private var loading = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                PageHeading(eyebrow: "Photo studio", title: "A great first impression.", subtitle: "Capture, crop, and keep your family’s DV photos together.")
                studio
                HStack(spacing: 10) {
                    spec("600 × 600", caption: "PIXELS")
                    spec("JPEG", caption: "FILE FORMAT")
                    spec("≤ 240 kB", caption: "FILE SIZE")
                }
                SectionHeading(title: "Your photo library", subtitle: store.data.photos.isEmpty ? "Your next entry starts with a recent photo." : "\(store.data.photos.count) photos saved on this device")
                if store.data.photos.isEmpty {
                    Card {
                        HStack(spacing: 16) {
                            IconTile(icon: "photo.on.rectangle.angled", size: 50)
                            VStack(alignment: .leading, spacing: 6) {
                                Text("A fresh photo for a fresh start").font(.subheadline.weight(.bold)).foregroundStyle(Palette.navy)
                                Text("Take a photo or choose one above. Add family members in Apply to assign their photos.").font(.caption).foregroundStyle(Palette.muted).lineSpacing(3)
                            }
                        }
                    }
                } else {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 145), spacing: 14)], spacing: 14) {
                        ForEach(store.data.photos) { photo in
                            Button { selectedPhoto = photo } label: {
                                VStack(alignment: .leading, spacing: 10) {
                                    if let image = UIImage(contentsOfFile: store.photoURL(photo).path) {
                                        Image(uiImage: image).resizable().scaledToFit().clipShape(RoundedRectangle(cornerRadius: 13))
                                    }
                                    Text(photo.name).font(.subheadline.weight(.bold)).foregroundStyle(Palette.navy).lineLimit(1)
                                    Text(photo.isReviewed ? "Reviewed by you" : "Needs review").font(.caption).foregroundStyle(photo.isReviewed ? Palette.green : Palette.gold)
                                    Text(photo.takenOn, format: .dateTime.month(.abbreviated).day().year()).font(.caption2).foregroundStyle(Palette.muted)
                                }.padding(12).background(.white, in: RoundedRectangle(cornerRadius: 19))
                            }.buttonStyle(.plain)
                        }
                    }
                }
                Card {
                    VStack(alignment: .leading, spacing: 17) {
                        SectionHeading(title: "Small details. Big difference.")
                        photoTip("sun.max", "Find soft, even light", "Use a plain white or off-white background. Keep shadows off your face and background.")
                        photoTip("face.smiling", "Keep it natural", "Face the camera with a neutral expression, eyes open, and no eyeglasses. No beauty filters or retouching.")
                        photoTip("clock", "Make it recent", "Use a photo taken within the last six months. Don’t reuse a previous year’s entry photo.")
                        Divider()
                        ResourceButton(title: "See official photo requirements", subtitle: "Composition, exceptions & examples", icon: "arrow.up.right.square") { browser = BrowserDestination(url: Official.photos) }
                    }
                }
                Note(text: "The app crops and checks file size. It does not certify photo acceptance or automatically verify your face, background, or the photo’s age.")
            }.padding(22).padding(.bottom, 24).frame(maxWidth: 740).frame(maxWidth: .infinity)
        }.background(Palette.background).toolbar(.hidden, for: .navigationBar)
            .onChange(of: selectedItem) { _, item in
                Task {
                    loading = true
                    defer { loading = false; selectedItem = nil }
                    do {
                        guard let bytes = try await item?.loadTransferable(type: Data.self), let image = UIImage(data: bytes) else {
                            error = "This image could not be opened. Try a JPEG or another photo."
                            return
                        }
                        imported = ImportedPhoto(image: PhotoProcessor.normalized(image))
                    } catch { self.error = "The photo could not be imported. \(error.localizedDescription)" }
                }
            }
            .sheet(item: $imported) { PhotoEditor(image: $0.image) }
            .sheet(item: $selectedPhoto) { PhotoDetailView(photo: $0) }
            .sheet(isPresented: $showCamera) {
                CameraPicker { image in
                    showCamera = false
                    if let image { DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { imported = ImportedPhoto(image: PhotoProcessor.normalized(image)) } }
                }.ignoresSafeArea()
            }
            .sheet(item: $browser) { OfficialBrowser(url: $0.url).ignoresSafeArea() }
            .alert("Photo studio", isPresented: Binding(get: { error != nil }, set: { if !$0 { error = nil } })) { Button("OK") { error = nil } } message: { Text(error ?? "") }
    }

    private var studio: some View {
        VStack(spacing: 22) {
            ZStack {
                RoundedRectangle(cornerRadius: 18).fill(Color.white).frame(width: 172, height: 192)
                RoundedRectangle(cornerRadius: 13).stroke(Palette.blue.opacity(0.35), style: StrokeStyle(lineWidth: 1, dash: [5, 5])).frame(width: 148, height: 165)
                Image(systemName: "person.crop.rectangle").font(.system(size: 100, weight: .ultraLight)).foregroundStyle(Palette.blue.opacity(0.35))
                VStack { HStack { Spacer(); Image(systemName: "sparkle").font(.system(size: 20)).foregroundStyle(Palette.gold) }; Spacer() }.frame(width: 178, height: 191)
                Text("YOUR PHOTO GOES HERE").font(.system(size: 7, weight: .bold)).tracking(1.4).foregroundStyle(Palette.muted).offset(y: 71)
            }.accessibilityHidden(true)
            VStack(spacing: 12) {
                PrimaryButton(title: "Take a photo", icon: "camera") { requestCamera() }.accessibilityIdentifier("takePhoto")
                PhotosPicker(selection: $selectedItem, matching: .images) {
                    HStack { Image(systemName: "photo"); Text(loading ? "Opening photo…" : "Choose from library") }.font(.subheadline.weight(.semibold)).frame(maxWidth: .infinity).padding(.vertical, 10)
                }.disabled(loading).accessibilityIdentifier("choosePhoto")
            }
        }.padding(24).frame(maxWidth: .infinity).background(Color(red: 0.90, green: 0.93, blue: 0.97), in: RoundedRectangle(cornerRadius: 24))
    }

    private func requestCamera() {
        guard UIImagePickerController.isSourceTypeAvailable(.camera) else {
            error = "Camera capture is available on a physical iPhone or iPad. In the simulator, choose a photo from the library."
            return
        }
        Task {
            let allowed = await AVCaptureDevice.requestAccess(for: .video)
            if allowed { showCamera = true }
            else { error = "Camera access is off. You can enable it in iOS Settings, or choose a photo from your library." }
        }
    }

    private func spec(_ title: String, caption: String) -> some View {
        VStack(spacing: 7) {
            Text(title).font(.system(size: 15, weight: .bold, design: .rounded)).foregroundStyle(Palette.navy)
            Text(caption).font(.system(size: 8, weight: .semibold)).tracking(1.2).foregroundStyle(Palette.muted)
        }.frame(maxWidth: .infinity).padding(.vertical, 15).background(.white, in: RoundedRectangle(cornerRadius: 15))
    }

    private func photoTip(_ icon: String, _ title: String, _ body: String) -> some View {
        HStack(alignment: .top, spacing: 13) {
            Image(systemName: icon).frame(width: 21).foregroundStyle(Palette.blue)
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.subheadline.weight(.semibold)).foregroundStyle(Palette.navy)
                Text(body).font(.caption).foregroundStyle(Palette.muted).lineSpacing(3)
            }
        }
    }
}

struct PhotoEditor: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.dismiss) private var dismiss
    let image: UIImage
    @State private var personID: UUID?
    @State private var takenOn = Date()
    @State private var dateConfirmed = false
    @State private var reviewed = false
    @State private var notReused = false
    @State private var zoom: CGFloat = 1
    @State private var offset = CGSize.zero
    @State private var dragStart = CGSize.zero
    @State private var error: String?
    private var maxZoom: CGFloat { max(1, min(3, min(image.size.width, image.size.height) / 600)) }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    Text("Frame a fresh start.").font(.title2.bold()).foregroundStyle(Palette.navy)
                    Text("Drag to position. Use the slider to crop closer. The oval is a guide, not an automatic face check.").font(.subheadline).foregroundStyle(Palette.muted)
                    GeometryReader { geo in
                        let side = geo.size.width
                        let scale = max(side / image.size.width, side / image.size.height) * zoom
                        let width = image.size.width * scale
                        let height = image.size.height * scale
                        ZStack {
                            Image(uiImage: image).resizable().frame(width: width, height: height).offset(x: offset.width * side, y: offset.height * side)
                            Ellipse().stroke(.white.opacity(0.9), style: StrokeStyle(lineWidth: 2, dash: [7, 5])).frame(width: side * 0.44, height: side * 0.60).offset(y: -side * 0.04)
                            Path { p in p.move(to: CGPoint(x: 0, y: side * 0.38)); p.addLine(to: CGPoint(x: side, y: side * 0.38)) }.stroke(.white.opacity(0.6), style: StrokeStyle(lineWidth: 1, dash: [5, 5]))
                        }.frame(width: side, height: side).clipped().contentShape(Rectangle())
                            .gesture(DragGesture().onChanged { value in
                                offset = clamped(CGSize(width: dragStart.width + value.translation.width / side, height: dragStart.height + value.translation.height / side))
                            }.onEnded { _ in dragStart = offset })
                    }.aspectRatio(1, contentMode: .fit).clipShape(RoundedRectangle(cornerRadius: 16))
                    HStack { Image(systemName: "minus.magnifyingglass"); Slider(value: $zoom, in: 1...max(1.001, maxZoom)); Image(systemName: "plus.magnifyingglass") }
                        .disabled(maxZoom <= 1).onChange(of: zoom) { _, _ in offset = clamped(offset); dragStart = offset }.accessibilityLabel("Photo zoom")
                    Note(text: "Aim for a head height of 50–69% of the image. Keep the full head visible and check the official composition examples.")
                    Card {
                        VStack(alignment: .leading, spacing: 17) {
                            Picker("Photo belongs to", selection: $personID) {
                                ForEach(store.data.draft.people) { person in Text(person.displayName).tag(Optional(person.id)) }
                            }.font(.subheadline)
                            DatePicker("Date photo was taken", selection: $takenOn, in: ...Date(), displayedComponents: .date).font(.subheadline)
                            Toggle("I confirmed the date this photo was taken.", isOn: $dateConfirmed).font(.subheadline)
                            Toggle("I checked the background, lighting, expression, head size, and all official photo rules.", isOn: $reviewed).font(.subheadline)
                            Toggle("This photo was not used for a previous year’s DV entry.", isOn: $notReused).font(.subheadline)
                        }
                    }
                    if let error { Text(error).font(.footnote).foregroundStyle(Palette.red) }
                    PrimaryButton(title: "Save photo", icon: "checkmark") { save() }.disabled(!dateConfirmed).opacity(dateConfirmed ? 1 : 0.5)
                    Note(text: "Saved as a 600 × 600 JPEG, no larger than 240 kB. Cropping does not guarantee acceptance. Photos stay on this device.")
                }.padding(22).frame(maxWidth: 600).frame(maxWidth: .infinity)
            }.background(Palette.background).navigationTitle("Prepare photo").navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
        }.onAppear { personID = store.data.draft.applicant.id }
    }

    private func clamped(_ value: CGSize) -> CGSize {
        let scale = max(1 / image.size.width, 1 / image.size.height) * zoom
        let x = (image.size.width * scale - 1) / 2
        let y = (image.size.height * scale - 1) / 2
        return CGSize(width: min(max(value.width, -x), x), height: min(max(value.height, -y), y))
    }

    private func save() {
        do {
            let jpeg = try PhotoProcessor.export(image, zoom: zoom, offset: offset)
            guard let person = store.data.draft.people.first(where: { $0.id == personID }) else { return }
            try store.addPhoto(jpeg: jpeg, person: person, date: takenOn, reviewed: reviewed, notReused: notReused)
            dismiss()
        } catch { self.error = error.localizedDescription }
    }
}

struct PhotoDetailView: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.dismiss) private var dismiss
    let photo: PhotoRecord
    @State private var delete = false
    private var current: PhotoRecord { store.data.photos.first { $0.id == photo.id } ?? photo }
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    if let image = UIImage(contentsOfFile: store.photoURL(photo).path) { Image(uiImage: image).resizable().scaledToFit().clipShape(RoundedRectangle(cornerRadius: 18)) }
                    StatusPill(title: current.isReviewed ? "Reviewed by you" : "Needs review", color: current.isReviewed ? Palette.green : Palette.gold)
                    Text("600 × 600 · JPEG · \(photo.byteCount / 1000) kB").font(.subheadline.weight(.semibold))
                    Text("Taken \(photo.takenOn.formatted(date: .abbreviated, time: .omitted))").font(.subheadline).foregroundStyle(Palette.muted)
                    if !current.isRecent(at: Date()) { Note(text: "This photo is outside the six-month window. Take a new photo before submitting.", icon: "clock.badge.exclamationmark") }
                    if let index = store.data.photos.firstIndex(where: { $0.id == photo.id }) {
                        Toggle("I reviewed the official composition rules.", isOn: $store.data.photos[index].compositionReviewed)
                        Toggle("Not used in a previous year’s entry.", isOn: $store.data.photos[index].notReused)
                    }
                    ShareLink(item: store.photoURL(photo)) { Label("Export JPEG", systemImage: "square.and.arrow.up").font(.headline).frame(maxWidth: .infinity).padding(17).background(Palette.background, in: RoundedRectangle(cornerRadius: 14)) }
                    Note(text: "Export shares this photo with the destination you choose. The photo remains a preparation asset, not an approval from the government.")
                    Button("Delete photo", role: .destructive) { delete = true }.frame(maxWidth: .infinity)
                }.padding(22).frame(maxWidth: 600).frame(maxWidth: .infinity)
            }.navigationTitle(photo.name).navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
                .confirmationDialog("Delete this saved photo?", isPresented: $delete, titleVisibility: .visible) {
                    Button("Delete photo", role: .destructive) { store.deletePhoto(photo); dismiss() }
                }
        }
    }
}

struct CameraPicker: UIViewControllerRepresentable {
    let completion: (UIImage?) -> Void
    func makeCoordinator() -> Coordinator { Coordinator(completion: completion) }
    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.cameraDevice = .rear
        picker.delegate = context.coordinator
        return picker
    }
    func updateUIViewController(_ controller: UIImagePickerController, context: Context) {}
    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let completion: (UIImage?) -> Void
        init(completion: @escaping (UIImage?) -> Void) { self.completion = completion }
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) { completion(info[.originalImage] as? UIImage) }
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) { completion(nil) }
    }
}
