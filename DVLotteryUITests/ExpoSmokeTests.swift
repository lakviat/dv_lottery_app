import XCTest

/// Opt-in checks for the Expo preview. Start Metro and open its URL in Expo Go first.
final class ExpoSmokeTests: XCTestCase {
    @MainActor func testExpoNavigationAndValidation() throws {
        continueAfterFailure = false
        try XCTSkipUnless(ProcessInfo.processInfo.environment["DV_EXPO_UI_TESTS"] == "1", "Expo smoke tests require a running Metro server and Expo Go.")
        let app = XCUIApplication(bundleIdentifier: "host.exp.Exponent")
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        if springboard.buttons["Open"].waitForExistence(timeout: 3) { springboard.buttons["Open"].tap() }
        app.activate()
        if app.buttons["Continue"].waitForExistence(timeout: 3) { app.buttons["Continue"].tap() }
        if app.buttons["xmark"].waitForExistence(timeout: 3) { app.buttons["xmark"].tap() }
        let home = app.descendants(matching: .any).matching(identifier: "tab-home").firstMatch
        XCTAssertTrue(home.waitForExistence(timeout: 45), app.debugDescription)
        home.tap()
        app.swipeDown()
        app.swipeDown()
        screenshot("Expo-Home")
        app.descendants(matching: .any).matching(identifier: "tab-apply").firstMatch.tap()
        XCTAssertTrue(app.staticTexts["Prepare your entry"].waitForExistence(timeout: 5))
        screenshot("Expo-Apply")
        app.swipeUp()
        app.swipeUp()
        app.buttons["apply-continue"].tap()
        XCTAssertTrue(app.staticTexts["A few things to complete"].waitForExistence(timeout: 5))
        app.descendants(matching: .any).matching(identifier: "tab-photos").firstMatch.tap()
        XCTAssertTrue(app.buttons["Choose from Photos"].waitForExistence(timeout: 5))
        screenshot("Expo-Photos")
        app.descendants(matching: .any).matching(identifier: "tab-my-entries").firstMatch.tap()
        XCTAssertTrue(app.buttons["add-entry"].waitForExistence(timeout: 5))
        screenshot("Expo-Entries")
        app.buttons["add-entry"].tap()
        XCTAssertTrue(app.textFields["Applicant full name"].waitForExistence(timeout: 5))
        app.buttons["Close"].tap()
        home.tap()
    }

    private func screenshot(_ name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
