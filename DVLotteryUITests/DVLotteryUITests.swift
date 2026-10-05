import XCTest

final class DVLotteryUITests: XCTestCase {
    @MainActor func testNavigationAndDraftValidation() {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--reset-test-data"]
        app.launch()
        XCTAssertTrue(app.buttons["prepareEntry"].waitForExistence(timeout: 10))
        screenshot("01-Home")
        app.buttons["prepareEntry"].tap()
        XCTAssertTrue(app.staticTexts["Let’s get you ready."].exists)
        screenshot("02-Apply")
        app.swipeUp()
        app.swipeUp()
        app.buttons["continueStep"].tap()
        XCTAssertTrue(app.staticTexts["• Add your country of eligibility."].waitForExistence(timeout: 3))
        selectTab(app, "Photos")
        XCTAssertTrue(app.buttons["takePhoto"].waitForExistence(timeout: 3))
        screenshot("03-Photos")
        selectTab(app, "My Entries")
        XCTAssertTrue(app.buttons["addEntry"].waitForExistence(timeout: 3))
        screenshot("04-Entries")
        app.buttons["addEntry"].tap()
        app.swipeUp()
        app.buttons["saveEntry"].tap()
        XCTAssertTrue(app.staticTexts["entryError"].waitForExistence(timeout: 3))
    }

    @MainActor func testSaveEntryAndPersistAcrossLaunches() {
        let app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--reset-test-data"]
        app.launch()
        selectTab(app, "My Entries")
        app.buttons["addEntry"].tap()
        fill(app, "Applicant name", "Demo Applicant")
        fill(app, "Last / family name for status check", "Applicant")
        fill(app, "Birth year", "1995")
        if app.buttons["Done"].exists { app.buttons["Done"].tap() }
        app.swipeUp()
        fill(app, "Confirmation number", "2026ABC123DEF456")
        if app.buttons["Done"].exists { app.buttons["Done"].tap() }
        app.swipeUp()
        app.switches["I received this confirmation after submitting an official DV entry."].tap()
        app.buttons["saveEntry"].tap()
        XCTAssertTrue(app.staticTexts["Demo Applicant"].waitForExistence(timeout: 5))
        app.staticTexts["Demo Applicant"].tap()
        XCTAssertTrue(app.buttons["Reveal confirmation number"].waitForExistence(timeout: 3))
        app.buttons["Reveal confirmation number"].tap()
        XCTAssertTrue(app.staticTexts["2026ABC123DEF456"].exists)
        screenshot("05-Saved-entry")
        app.terminate()
        app.launchArguments = ["--ui-testing"]
        app.launch()
        selectTab(app, "My Entries")
        XCTAssertTrue(app.staticTexts["Demo Applicant"].waitForExistence(timeout: 5))
    }

    @MainActor private func fill(_ app: XCUIApplication, _ title: String, _ value: String) {
        let field = app.textFields[title]
        if !field.isHittable { app.swipeUp() }
        field.tap()
        field.typeText(value)
    }

    @MainActor private func selectTab(_ app: XCUIApplication, _ title: String) {
        let phoneTab = app.tabBars.buttons[title]
        if phoneTab.exists { phoneTab.tap() }
        else { app.descendants(matching: .any).matching(identifier: title).firstMatch.tap() }
    }

    private func screenshot(_ name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
