// Compile with PassportTextRecognizer.swift; uses only fictional ICAO specimen data.
import AppKit
import Foundation

@main
struct PassportOCRSmokeTest {
  static func main() throws {
    let destination = URL(fileURLWithPath: CommandLine.arguments[1])
    let first = "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<"
    let second = "L898902C36UTO7408122F1204159ZE184226B<<<<<10"
    let image = NSImage(size: NSSize(width: 1600, height: 1000))
    image.lockFocus()
    NSColor.white.setFill()
    NSRect(x: 0, y: 0, width: 1600, height: 1000).fill()
    func line(_ text: String, _ y: CGFloat, _ size: CGFloat) {
      (text as NSString).draw(at: NSPoint(x: 70, y: y), withAttributes: [
        .font: NSFont.monospacedSystemFont(ofSize: size, weight: .regular),
        .foregroundColor: NSColor.black,
      ])
    }
    line("FICTIONAL OCR TEST - NOT A TRAVEL DOCUMENT", 880, 30)
    line("ICAO SPECIMEN / UTOPIA", 790, 32)
    line("ERIKSSON, ANNA MARIA", 640, 36)
    line("Date of birth: 12 AUG 1974", 550, 32)
    line("Female | Passport: L898902C3", 460, 32)
    line(first, 190, 45)
    line(second, 110, 45)
    image.unlockFocus()
    let bitmap = NSBitmapImageRep(data: image.tiffRepresentation!)!
    try bitmap.representation(using: .png, properties: [:])!.write(to: destination)
    let lines = try PassportTextRecognizer.recognize(destination)
    print(String(data: try JSONSerialization.data(withJSONObject: lines), encoding: .utf8)!)
  }
}
