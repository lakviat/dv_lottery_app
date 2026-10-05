import XCTest

/// Opt-in checks for the Expo preview. Start Metro and open its URL in Expo Go first.
final class ExpoSmokeTests: XCTestCase {
    /// Run after the passport import test and a complete Metro reload.
    @MainActor func testPassportDetailsPersistAfterReload() throws {
        continueAfterFailure = false
        try XCTSkipUnless(ProcessInfo.processInfo.environment["DV_PASSPORT_RELOAD_TEST"] == "1", "Requires the fictional imported draft and a complete reload.")
        let app = XCUIApplication(bundleIdentifier: "com.dvlottery.expo")
        acceptOpenAppPrompt()
        app.activate()
        dismissDevelopmentMenu(app)
        let apply = app.descendants(matching: .any).matching(identifier: "tab-apply").firstMatch
        XCTAssertTrue(apply.waitForExistence(timeout: 15), app.debugDescription)
        apply.tap()
        let personal = app.buttons["details-personal"]
        scrollTo(personal, in: app)
        personal.tap()
        XCTAssertEqual(app.textFields["First / given name"].value as? String, "ANNA")
        XCTAssertEqual(app.textFields["Date of birth"].value as? String, "02/04/1987")
        let passport = app.buttons["View passport details"]
        scrollTo(passport, in: app)
        passport.tap()
        XCTAssertEqual(app.textFields["Passport number"].value as? String, "L898902C3")
    }

    @MainActor func testExpoGoScannerFallback() throws {
        continueAfterFailure = false
        try XCTSkipUnless(ProcessInfo.processInfo.environment["DV_EXPO_SCANNER_FALLBACK"] == "1", "Requires the updated app open in Expo Go.")
        let app = XCUIApplication(bundleIdentifier: "host.exp.Exponent")
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        if springboard.buttons["Open"].waitForExistence(timeout: 2) { springboard.buttons["Open"].tap() }
        app.activate()
        dismissDevelopmentMenu(app)
        if app.buttons["tour-skip"].waitForExistence(timeout: 2) { app.buttons["tour-skip"].tap() }
        let apply = app.descendants(matching: .any).matching(identifier: "tab-apply").firstMatch
        XCTAssertTrue(apply.waitForExistence(timeout: 20), app.debugDescription)
        apply.tap()
        for _ in 0..<8 { app.swipeDown() }
        app.buttons["Step 1: Your details"].tap()
        app.buttons["passport-upload"].tap()
        XCTAssertTrue(app.alerts["Passport scanning needs the iOS development build"].waitForExistence(timeout: 5))
        app.alerts.buttons["OK"].tap()
        XCTAssertTrue(app.buttons["passport-upload"].exists)
    }

    /// Import only scripts/test_passport_ocr.swift's fictional PNG into simulator Photos first.
    @MainActor func testPassportImportAndPersonalContinue() throws {
        continueAfterFailure = false
        try XCTSkipUnless(ProcessInfo.processInfo.environment["DV_PASSPORT_UI_TESTS"] == "1", "Requires the iOS Expo development build, Metro, and the fictional fixture in Photos.")
        let app = XCUIApplication(bundleIdentifier: "com.dvlottery.expo")
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        if springboard.buttons["Open"].waitForExistence(timeout: 3) { springboard.buttons["Open"].tap() }
        app.activate()
        for _ in 0..<3 {
            if springboard.buttons["Open"].waitForExistence(timeout: 1) { springboard.buttons["Open"].tap() }
            if app.buttons["Open"].exists { app.buttons["Open"].tap() }
        }
        dismissDevelopmentMenu(app)
        if app.buttons["tour-skip"].waitForExistence(timeout: 3) { app.buttons["tour-skip"].tap() }
        if app.staticTexts["Review passport details"].exists { app.buttons["Close"].tap() }
        let apply = app.descendants(matching: .any).matching(identifier: "tab-apply").firstMatch
        XCTAssertTrue(apply.waitForExistence(timeout: 30), app.debugDescription)
        apply.tap()
        scrollTo(app.buttons["passport-upload"], in: app)
        XCTAssertTrue(app.buttons["passport-upload"].waitForExistence(timeout: 5))
        screenshot("Passport-Start")
        app.buttons["passport-upload"].tap()
        XCTAssertTrue(app.buttons["Cancel"].waitForExistence(timeout: 5), app.debugDescription)
        app.buttons["Cancel"].tap()
        XCTAssertTrue(app.buttons["passport-upload"].waitForExistence(timeout: 5))
        app.buttons["passport-upload"].tap()
        let photo = app.images.matching(NSPredicate(format: "label BEGINSWITH 'Photo' OR label BEGINSWITH 'Screenshot'")).firstMatch
        XCTAssertTrue(photo.waitForExistence(timeout: 5), app.debugDescription)
        photo.tap()
        XCTAssertTrue(app.staticTexts["Review passport details"].waitForExistence(timeout: 20), app.debugDescription)
        screenshot("Passport-Review")
        XCTAssertEqual(app.textFields["passport-review-first"].value as? String, "ANNA")
        XCTAssertEqual(app.textFields["passport-review-middle"].value as? String, "MARIA")
        XCTAssertEqual(app.textFields["passport-review-last"].value as? String, "ERIKSSON")
        let use = app.buttons["passport-use"]
        scrollTo(use, in: app)
        use.tap()
        XCTAssertTrue(app.buttons["passport-upload"].waitForExistence(timeout: 5))

        let birth = app.textFields["Date of birth"]
        scrollTo(birth, in: app)
        birth.tap()
        birth.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: 10) + "02/04/1987")
        let city = app.textFields["City of birth"]
        scrollTo(city, in: app)
        city.tap()
        let existingCity = city.value as? String ?? ""
        city.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: existingCity.count) + "Testville\n")
        let country = app.buttons["Country of birth: Choose"]
        scrollTo(country, in: app)
        country.tap()
        app.textFields["Search"].typeText("Canada")
        app.buttons["Canada"].tap()
        let education = app.buttons["Highest level of education: Choose"]
        scrollTo(education, in: app)
        education.tap()
        app.buttons["High school degree"].tap()
        let next = app.buttons["apply-continue"]
        scrollTo(next, in: app)
        screenshot("Passport-Personal-Ready")
        next.tap()
        let email = app.textFields["Email address"]
        scrollTo(email, in: app)
        XCTAssertTrue(email.isHittable, app.debugDescription)
        XCTAssertFalse(app.staticTexts["A few things to complete"].exists)
        screenshot("Passport-Continue-Contact")
    }

    @MainActor private func scrollTo(_ element: XCUIElement, in app: XCUIApplication) {
        for _ in 0..<15 {
            if element.exists && element.isHittable { return }
            let above = element.exists && element.frame.maxY < 170
            let keyboard = app.keyboards.firstMatch.exists
            let start = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: above ? 0.35 : keyboard ? 0.55 : 0.72))
            let end = app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: above ? 0.7 : 0.25))
            start.press(forDuration: 0.1, thenDragTo: end)
        }
        XCTAssertTrue(element.isHittable, app.debugDescription)
    }

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
        scrollTo(app.buttons["apply-continue"], in: app)
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
        let bundle = ProcessInfo.processInfo.environment["DV_UI_BUNDLE_ID"] ?? "host.exp.Exponent"
        let app = XCUIApplication(bundleIdentifier: bundle)
        acceptOpenAppPrompt()
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

    @MainActor private func acceptOpenAppPrompt() {
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        if springboard.buttons["Open"].waitForExistence(timeout: 2) {
            springboard.buttons["Open"].tap()
        }
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
