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
        if app.buttons["tour-skip"].waitForExistence(timeout: 2) { app.buttons["tour-skip"].tap() }
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

    @MainActor func testWelcomeTourNavigationAndEveryExit() throws {
        continueAfterFailure = false
        try XCTSkipUnless(ProcessInfo.processInfo.environment["DV_EXPO_UI_TESTS"] == "1", "Requires the Expo preview.")
        let app = XCUIApplication(bundleIdentifier: "host.exp.Exponent")
        app.activate()
        dismissDevelopmentMenu(app)

        for exitPage in 1...4 {
            if !app.buttons["tour-skip"].exists { replayWelcome(app) }
            XCTAssertTrue(app.staticTexts["tour-page-1"].waitForExistence(timeout: 5))
            if exitPage > 1 {
                for page in 2...exitPage {
                    app.buttons["tour-next"].tap()
                    XCTAssertTrue(app.staticTexts["tour-page-\(page)"].waitForExistence(timeout: 3))
                }
            }
            if exitPage == 3 {
                app.buttons["tour-back"].tap()
                XCTAssertTrue(app.staticTexts["tour-page-2"].exists)
                app.buttons["tour-next"].tap()
                XCTAssertTrue(app.staticTexts["tour-page-3"].exists)
            }
            XCTAssertTrue(app.buttons["tour-skip"].isHittable)
            screenshot("Welcome-\(exitPage)")
            app.buttons["tour-skip"].tap()
            XCTAssertTrue(app.buttons["Open settings"].waitForExistence(timeout: 5))
            XCTAssertFalse(app.buttons["tour-skip"].exists)
        }

        replayWelcome(app)
        for page in 2...4 {
            app.buttons["tour-next"].tap()
            XCTAssertTrue(app.staticTexts["tour-page-\(page)"].waitForExistence(timeout: 3))
        }
        XCTAssertEqual(app.buttons["tour-next"].label, "Get started")
        app.buttons["tour-next"].tap()
        XCTAssertTrue(app.buttons["Open settings"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["tour-skip"].exists)
    }

    /// Run after the navigation test and a Metro reload to check the persisted preference.
    @MainActor func testWelcomeRemainsDismissedAfterReload() throws {
        try XCTSkipUnless(ProcessInfo.processInfo.environment["DV_EXPO_RELOAD_TEST"] == "1", "Requires a previously dismissed tour and a reloaded Expo preview.")
        let app = XCUIApplication(bundleIdentifier: "host.exp.Exponent")
        app.activate()
        dismissDevelopmentMenu(app)
        XCTAssertTrue(app.buttons["Open settings"].waitForExistence(timeout: 15))
        XCTAssertFalse(app.buttons["tour-skip"].exists)
        XCTAssertTrue(app.descendants(matching: .any).matching(identifier: "tab-home").firstMatch.isHittable)
    }

    @MainActor private func replayWelcome(_ app: XCUIApplication) {
        app.buttons["Open settings"].tap()
        // Expo Go's floating developer gear can obscure the app's settings button.
        // Hide that simulator-only overlay during the test if it intercepted the tap.
        if app.buttons["xmark"].exists {
            dismissDevelopmentMenu(app)
            app.buttons["Open settings"].tap()
        }
        XCTAssertTrue(app.buttons["replay-welcome-tour"].waitForExistence(timeout: 5))
        app.buttons["replay-welcome-tour"].tap()
        XCTAssertTrue(app.staticTexts["tour-page-1"].waitForExistence(timeout: 5))
    }

    @MainActor private func dismissDevelopmentMenu(_ app: XCUIApplication) {
        if app.buttons["xmark"].waitForExistence(timeout: 2) {
            let label = app.staticTexts["Tools button"]
            if label.exists {
                if !label.isHittable { app.swipeUp() }
                // Expo Go exposes the text and the unlabeled UISwitch separately.
                let tools = app.switches.allElementsBoundByIndex.first {
                    $0.frame.width < 100 && abs($0.frame.midY - label.frame.midY) < 25
                }
                if let tools, tools.value as? String == "1" { tools.tap() }
            }
            app.buttons["xmark"].tap()
        }
    }

    private func screenshot(_ name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
