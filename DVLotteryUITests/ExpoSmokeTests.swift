import XCTest

/// Opt-in checks for the Expo preview. Start Metro and open its URL in Expo Go first.
final class ExpoSmokeTests: XCTestCase {
    @MainActor func testRegistrationAlertsAndMinimalHome() throws {
        continueAfterFailure = false
        try XCTSkipUnless(ProcessInfo.processInfo.environment["DV_ALERTS_UI_TESTS"] == "1", "Requires updated Expo Go with notifications and running Metro.")
        let app = XCUIApplication(bundleIdentifier: ProcessInfo.processInfo.environment["DV_UI_BUNDLE_ID"] ?? "host.exp.Exponent")
        acceptOpenAppPrompt()
        app.activate()
        dismissDevelopmentMenu(app)
        if app.buttons["tour-skip"].waitForExistence(timeout: 2) { app.buttons["tour-skip"].tap() }
        if app.buttons["Close"].exists { app.buttons["Close"].tap() }
        let home = app.descendants(matching: .any).matching(identifier: "tab-home").firstMatch
        XCTAssertTrue(home.waitForExistence(timeout: 20), app.debugDescription)
        dismissKeyboardBeforeNavigation(app)
        home.tap()
        for _ in 0..<3 { app.swipeDown() }
        XCTAssertTrue(app.buttons["home-next-action"].exists)
        XCTAssertFalse(app.staticTexts.matching(identifier: "Big possibilities.\nSmall, clear steps.").firstMatch.exists)
        screenshot("Alerts-Minimal-Home")
        let alerts = app.buttons["registration-alerts"]
        scrollTo(alerts, in: app)
        alerts.tap()
        XCTAssertTrue(app.staticTexts.matching(identifier: "Registration alerts").firstMatch.waitForExistence(timeout: 5))
        screenshot("Alerts-Preferences")
        let reminder = app.buttons["registration-reminder-toggle"]
        scrollTo(reminder, in: app)
        if app.staticTexts.matching(identifier: "Weekly reminder is on").firstMatch.exists { reminder.tap() }
        XCTAssertTrue(app.staticTexts.matching(identifier: "Weekly reminder is off").firstMatch.waitForExistence(timeout: 5))
        reminder.tap()
        let system = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        if system.buttons["Allow"].waitForExistence(timeout: 3) { system.buttons["Allow"].tap() }
        if app.alerts.buttons["Allow"].waitForExistence(timeout: 1) { app.alerts.buttons["Allow"].tap() }
        if (ProcessInfo.processInfo.environment["DV_UI_BUNDLE_ID"] ?? "host.exp.Exponent") == "host.exp.Exponent" && app.staticTexts.matching(identifier: "Reminders need the iOS development app").firstMatch.waitForExistence(timeout: 2) {
            screenshot("Alerts-Expo-Go-Fallback")
        } else {
            XCTAssertTrue(app.staticTexts.matching(identifier: "Weekly reminder is on").firstMatch.waitForExistence(timeout: 5), app.debugDescription)
            screenshot("Alerts-Reminder-Enabled")
            reminder.tap()
            XCTAssertTrue(app.staticTexts.matching(identifier: "Weekly reminder is off").firstMatch.waitForExistence(timeout: 5))
        }
        let request = app.buttons["registration-email-submit"]
        scrollTo(request, in: app)
        request.tap()
        XCTAssertTrue(app.staticTexts.matching(identifier: "Enter a valid email address.").firstMatch.waitForExistence(timeout: 5))
        let email = app.textFields["Email for opening alert"]
        scrollTo(email, in: app)
        email.tap()
        email.typeText("test@example.com\n")
        scrollTo(request, in: app)
        request.tap()
        XCTAssertTrue(app.staticTexts.matching(identifier: "Agree to receive this opening email before sending.").firstMatch.waitForExistence(timeout: 5))
        screenshot("Alerts-Consent-Required")
        app.buttons["Close"].tap()
        XCTAssertTrue(home.waitForExistence(timeout: 5))
    }

    /// Run after the passport import test and a complete Metro reload.
    @MainActor func testPassportDetailsPersistAfterReload() throws {
        continueAfterFailure = false
        try XCTSkipUnless(ProcessInfo.processInfo.environment["DV_PASSPORT_RELOAD_TEST"] == "1", "Requires the fictional imported draft and a complete reload.")
        let app = XCUIApplication(bundleIdentifier: "com.dvlottery.expo")
        acceptOpenAppPrompt()
        startIsolated(app)
        dismissDevelopmentMenu(app)
        let apply = app.descendants(matching: .any).matching(identifier: "tab-apply").firstMatch
        XCTAssertTrue(apply.waitForExistence(timeout: 15), app.debugDescription)
        dismissKeyboardBeforeNavigation(app)
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
        dismissKeyboardBeforeNavigation(app)
        apply.tap()
        for _ in 0..<8 { app.swipeDown() }
        let details = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Step 1: Your details")).firstMatch
        scrollTo(details, in: app)
        details.tap()
        app.buttons["passport-upload"].tap()
        XCTAssertTrue(app.alerts["Open the iOS app to scan"].waitForExistence(timeout: 5))
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
        startIsolated(app)
        for _ in 0..<3 {
            if springboard.buttons["Open"].waitForExistence(timeout: 1) { springboard.buttons["Open"].tap() }
            if app.buttons["Open"].exists { app.buttons["Open"].tap() }
        }
        dismissDevelopmentMenu(app)
        if app.buttons["tour-skip"].waitForExistence(timeout: 3) { app.buttons["tour-skip"].tap() }
        if app.staticTexts.matching(identifier: "Review your passport").firstMatch.exists { app.buttons["Close"].tap() }
        let apply = app.descendants(matching: .any).matching(identifier: "tab-apply").firstMatch
        XCTAssertTrue(apply.waitForExistence(timeout: 30), app.debugDescription)
        dismissKeyboardBeforeNavigation(app)
        apply.tap()
        openPreparationSection("personal", in: app)
        let unselectedEducation = app.buttons["Highest level of education: Choose"]
        XCTAssertTrue(unselectedEducation.exists, "Run this missing-education regression on a dedicated draft with education unset; the test never resets user data.")
        scrollTo(app.buttons["passport-upload"], in: app)
        XCTAssertTrue(app.buttons["passport-upload"].waitForExistence(timeout: 5))
        screenshot("Passport-Start")
        app.buttons["passport-upload"].tap()
        XCTAssertTrue(app.buttons["Cancel"].waitForExistence(timeout: 5), app.debugDescription)
        app.buttons["Cancel"].tap()
        let pickerDismissed = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: app.buttons["Cancel"])
        XCTAssertEqual(XCTWaiter.wait(for: [pickerDismissed], timeout: 5), .completed)
        let readyAfterCancel = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == true AND enabled == true AND hittable == true"), object: app.buttons["passport-upload"])
        XCTAssertEqual(XCTWaiter.wait(for: [readyAfterCancel], timeout: 5), .completed)
        app.buttons["passport-upload"].tap()
        XCTAssertTrue(app.buttons["Cancel"].waitForExistence(timeout: 10), "The native picker must present again after cancellation.")
        let photo = app.images.matching(NSPredicate(format: "label BEGINSWITH 'Photo' OR label BEGINSWITH 'Screenshot'")).firstMatch
        XCTAssertTrue(photo.waitForExistence(timeout: 30), app.debugDescription)
        photo.tap()
        XCTAssertTrue(app.staticTexts.matching(identifier: "Review your passport").firstMatch.waitForExistence(timeout: 20), app.debugDescription)
        XCTAssertTrue(app.staticTexts.matching(identifier: "Passport recognized").firstMatch.exists)
        XCTAssertTrue(app.staticTexts.matching(identifier: "ANNA MARIA ERIKSSON").firstMatch.exists)
        XCTAssertFalse(app.textFields["passport-review-first"].exists, "Recognition should open a compact review, not an edit form.")
        screenshot("Passport-Review")
        let edit = app.buttons["passport-edit"]
        scrollTo(edit, in: app)
        edit.tap()
        XCTAssertTrue(app.staticTexts.matching(identifier: "Edit passport details").firstMatch.waitForExistence(timeout: 5))
        XCTAssertEqual(app.textFields["passport-review-first"].value as? String, "ANNA")
        XCTAssertEqual(app.textFields["passport-review-middle"].value as? String, "MARIA")
        XCTAssertEqual(app.textFields["passport-review-last"].value as? String, "ERIKSSON")
        let reviewDone = app.buttons["passport-review-done"]
        XCTAssertTrue(reviewDone.isHittable, "The review action should remain reachable while editing.")
        reviewDone.tap()
        XCTAssertTrue(app.staticTexts.matching(identifier: "Review your passport").firstMatch.waitForExistence(timeout: 5))
        let use = app.buttons["passport-use"]
        XCTAssertTrue(use.isHittable)
        use.tap()
        XCTAssertTrue(app.alerts["Use these passport details?"].waitForExistence(timeout: 5))
        app.alerts.buttons["Replace details"].tap()
        XCTAssertTrue(app.buttons["passport-upload"].waitForExistence(timeout: 5))

        let birth = app.textFields["Date of birth"]
        replaceText(birth, with: "02/04/1987", in: app)
        let city = app.textFields["City of birth"]
        replaceText(city, with: "Testville", in: app)
        city.typeText("\n")
        let country = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Country of birth:")).firstMatch
        scrollTo(country, in: app)
        country.tap()
        app.textFields["Search"].typeText("Canada")
        let canada = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Canada")).firstMatch
        XCTAssertTrue(canada.waitForExistence(timeout: 5))
        canada.tap()
        // Begin away from the missing field so this proves automatic scrolling.
        scrollTo(app.textFields["First / given name"], in: app)
        // Continue must take the user straight to the missing education field.
        // There is deliberately no scroll helper between Continue and these assertions.
        let next = app.buttons["apply-continue"]
        XCTAssertTrue(next.isHittable)
        next.tap()
        let education = app.buttons["Highest level of education: Choose"]
        let educationError = app.staticTexts.matching(identifier: "Please select your highest level of education.").firstMatch
        XCTAssertTrue(educationError.waitForExistence(timeout: 5))
        XCTAssertTrue(waitUntilHittable(education), app.debugDescription)
        XCTAssertTrue(waitUntilInlineVisible(educationError, in: app), "Inline explanation must be visible without searching the form.")
        screenshot("Passport-Missing-Education-Focused")
        education.tap()
        let educationChoice = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "High school degree")).firstMatch
        XCTAssertTrue(educationChoice.waitForExistence(timeout: 5))
        educationChoice.tap()
        XCTAssertFalse(educationError.exists, "Corrected errors should clear immediately.")
        screenshot("Passport-Personal-Ready")
        next.tap()
        let email = app.textFields["Email address"]
        scrollTo(email, in: app)
        XCTAssertTrue(email.isHittable, app.debugDescription)
        XCTAssertFalse(app.staticTexts.matching(identifier: "A few things to complete").firstMatch.exists)
        screenshot("Passport-Continue-Contact")
    }

    /// Full consumer flow with fictional records only. Existing entries and contact values are retained.
    @MainActor func testPremiumHomeFormsAndResume() throws {
        continueAfterFailure = false
        try XCTSkipUnless(ProcessInfo.processInfo.environment["DV_PREMIUM_UI_TESTS"] == "1", "Requires the updated iOS app installed in a simulator.")
        let app = XCUIApplication(bundleIdentifier: ProcessInfo.processInfo.environment["DV_UI_BUNDLE_ID"] ?? "com.dvlottery.expo")
        acceptOpenAppPrompt()
        startIsolated(app)
        dismissDevelopmentMenu(app)
        if app.buttons["tour-skip"].waitForExistence(timeout: 2) { app.buttons["tour-skip"].tap() }
        if app.buttons["Close"].exists { app.buttons["Close"].tap() }
        let home = app.descendants(matching: .any).matching(identifier: "tab-home").firstMatch
        XCTAssertTrue(home.waitForExistence(timeout: 20), app.debugDescription)
        dismissKeyboardBeforeNavigation(app)
        home.tap()
        XCTAssertTrue(app.buttons["home-next-action"].waitForExistence(timeout: 5))
        screenshot("Premium-Home")

        dismissKeyboardBeforeNavigation(app)
        app.descendants(matching: .any).matching(identifier: "tab-apply").firstMatch.tap()
        openPreparationSection("contact", in: app)
        let labels = ["Email address", "Phone number (optional)", "In care of (optional)", "Address line 1", "Address line 2 (optional)"]
        let originals = Dictionary(uniqueKeysWithValues: labels.map { label in
            let field = app.textFields[label]
            let value = field.value as? String ?? ""
            return (label, value == field.placeholderValue ? "" : value)
        })
        // Restore only fields touched by this test. Never reset the app, draft, photos or existing entries.
        defer {
            if app.buttons["Close"].exists { app.buttons["Close"].tap() }
            dismissKeyboardBeforeNavigation(app)
            app.descendants(matching: .any).matching(identifier: "tab-apply").firstMatch.tap()
            openPreparationSection("contact", in: app)
            for label in labels { replaceText(app.textFields[label], with: originals[label] ?? "", in: app) }
            dismissKeyboardBeforeNavigation(app)
            home.tap()
        }
        for label in ["Phone number (optional)", "In care of (optional)", "Address line 2 (optional)"] {
            replaceText(app.textFields[label], with: "", in: app)
        }
        let email = app.textFields["Email address"]
        replaceText(email, with: "", in: app)
        let next = app.buttons["apply-continue"]
        XCTAssertTrue(next.isHittable, "The primary action must stay above the keyboard.")
        next.tap()
        let emailError = app.staticTexts.matching(identifier: "Enter a valid email address.").firstMatch
        XCTAssertTrue(emailError.waitForExistence(timeout: 5))
        XCTAssertTrue(waitUntilHittable(email), app.debugDescription)
        XCTAssertTrue(waitUntilInlineVisible(emailError, in: app), "Validation must reveal the field and message without a manual scroll.")
        XCTAssertTrue(app.keyboards.firstMatch.exists, "A text-field validation error should focus the keyboard.")
        screenshot("Premium-Contact-Validation")

        let token = String(UUID().uuidString.replacingOccurrences(of: "-", with: "").prefix(12)).uppercased()
        let fixtureEmail = "uitest.\(token.lowercased())@example.com"
        typeFixtureText(fixtureEmail, into: email)
        XCTAssertEqual(email.value as? String, fixtureEmail)
        email.typeText("\n")
        XCTAssertFalse(emailError.exists)
        let phone = app.textFields["Phone number (optional)"]
        typeFixtureText("2025550199", into: app)
        XCTAssertEqual(phone.value as? String, "2025550199", "Email Next should move input to the phone field.")
        let keyboardNext = app.buttons["Next field"]
        XCTAssertTrue(keyboardNext.isHittable, "The phone keypad needs a native Next accessory.")
        keyboardNext.tap()
        let careOf = app.textFields["In care of (optional)"]
        typeFixtureText("UI Fixture", into: app)
        XCTAssertEqual(careOf.value as? String, "UI Fixture")
        let address = app.textFields["Address line 1"]
        replaceText(address, with: "123 Example Street", in: app)
        address.typeText("\n")
        typeFixtureText("Unit 4", into: app)
        XCTAssertEqual(app.textFields["Address line 2 (optional)"].value as? String, "Unit 4", "Address Next should move to address line 2.")
        screenshot("Premium-Contact-Keyboard")
        dismissKeyboardBeforeNavigation(app)
        home.tap()
        app.terminate()
        app.launch()
        XCTAssertTrue(home.waitForExistence(timeout: 20))
        XCTAssertFalse(app.buttons["tour-skip"].exists, "The dismissed tour should stay dismissed after relaunch.")
        dismissKeyboardBeforeNavigation(app)
        app.descendants(matching: .any).matching(identifier: "tab-apply").firstMatch.tap()
        openPreparationSection("contact", in: app)
        XCTAssertEqual(app.textFields["Email address"].value as? String, fixtureEmail)
        XCTAssertEqual(app.textFields["Address line 1"].value as? String, "123 Example Street")
        screenshot("Premium-Draft-Resumed")

        dismissKeyboardBeforeNavigation(app)
        app.descendants(matching: .any).matching(identifier: "tab-photos").firstMatch.tap()
        XCTAssertTrue(app.staticTexts.matching(identifier: "A photo for each person").firstMatch.waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["Take a photo"].isHittable)
        XCTAssertTrue(app.buttons["Choose from Photos"].isHittable)
        screenshot("Premium-Photos")
        dismissKeyboardBeforeNavigation(app)
        app.descendants(matching: .any).matching(identifier: "tab-my-entries").firstMatch.tap()
        XCTAssertTrue(app.buttons["add-entry"].waitForExistence(timeout: 5))
        screenshot(app.staticTexts.matching(identifier: "No entries yet").firstMatch.exists ? "Premium-Entries-Empty" : "Premium-Entries-Existing")
        app.buttons["add-entry"].tap()
        let save = app.buttons["Save entry"]
        XCTAssertTrue(save.waitForExistence(timeout: 5))
        save.tap()
        let fullName = app.textFields["Applicant full name"]
        XCTAssertTrue(app.staticTexts.matching(identifier: "Enter the applicant’s full name.").firstMatch.waitForExistence(timeout: 5))
        XCTAssertTrue(waitUntilHittable(fullName))
        screenshot("Premium-Entry-Validation")
        let fixtureName = "UI Fixture \(token)"
        let year = String(Calendar.current.component(.year, from: Date()) + 1)
        replaceText(fullName, with: fixtureName, in: app)
        replaceText(app.textFields["Last / family name for status check"], with: "Fixture", in: app)
        replaceText(app.textFields["Birth year"], with: "1990", in: app)
        replaceText(app.textFields["DV program year"], with: year, in: app)
        replaceText(app.textFields["Confirmation number"], with: year + token, in: app)
        save.tap()
        let attestation = app.switches["This entry was submitted on the official portal"]
        XCTAssertTrue(waitUntilHittable(attestation), "The missing attestation must be revealed automatically.")
        XCTAssertTrue(waitUntilInlineVisible(app.staticTexts.matching(identifier: "Confirm this entry has already been submitted on the official portal.").firstMatch, in: app))
        attestation.tap()
        save.tap()
        XCTAssertTrue(app.buttons["add-entry"].waitForExistence(timeout: 5))
        let fixtureCard = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", fixtureName + ", DV")).firstMatch
        scrollTo(fixtureCard, in: app)
        fixtureCard.tap()
        XCTAssertTrue(app.staticTexts.matching(identifier: "Your timeline").firstMatch.waitForExistence(timeout: 5))
        let timelineSave = app.buttons["Save timeline update"]
        scrollTo(timelineSave, in: app)
        timelineSave.tap()
        let recorded = app.switches["This is my own recorded update"]
        XCTAssertTrue(waitUntilHittable(recorded))
        XCTAssertTrue(waitUntilInlineVisible(app.staticTexts.matching(identifier: "Confirm this is your own recorded update.").firstMatch, in: app))
        recorded.tap()
        timelineSave.tap()
        XCTAssertTrue(app.staticTexts.matching(identifier: "Update saved to your timeline").firstMatch.waitForExistence(timeout: 5))
        screenshot("Premium-Entry-Timeline")
        // Delete exactly the uniquely named fictional entry created above, never another saved record.
        let delete = app.buttons["Delete entry record"]
        scrollTo(delete, in: app)
        delete.tap()
        XCTAssertTrue(app.alerts["Delete this entry record?"].waitForExistence(timeout: 3))
        app.alerts.buttons["Delete record"].tap()
        XCTAssertTrue(app.buttons["add-entry"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", fixtureName + ", DV")).firstMatch.exists)
    }

    /// Use a dedicated simulator with the fictional passport PNG seeded in Photos.
    /// The fixture exercises file preparation only; it is not a valid DV portrait.
    @MainActor func testPremiumPhotoLibraryReview() throws {
        continueAfterFailure = false
        try XCTSkipUnless(ProcessInfo.processInfo.environment["DV_PREMIUM_UI_TESTS"] == "1", "Requires the updated iOS app and the fictional image seeded in simulator Photos.")
        let app = XCUIApplication(bundleIdentifier: ProcessInfo.processInfo.environment["DV_UI_BUNDLE_ID"] ?? "com.dvlottery.expo")
        acceptOpenAppPrompt()
        startIsolated(app)
        dismissDevelopmentMenu(app)
        if app.buttons["tour-skip"].waitForExistence(timeout: 2) { app.buttons["tour-skip"].tap() }
        let photoTab = app.descendants(matching: .any).matching(identifier: "tab-photos").firstMatch
        XCTAssertTrue(photoTab.waitForExistence(timeout: 20))
        XCTAssertTrue(waitUntilHittable(photoTab), "Photos tab must be unobstructed before this flow begins.")
        dismissKeyboardBeforeNavigation(app)
        photoTab.tap()
        XCTAssertTrue(app.staticTexts.matching(identifier: "A photo for each person").firstMatch.waitForExistence(timeout: 5), app.debugDescription)
        let reviews = app.buttons.matching(NSPredicate(format: "label == %@ OR label == %@", "Review photo", "View & edit review"))
        let originalCount = reviews.count
        let choose = app.buttons["Choose from Photos"]
        scrollTo(choose, in: app)
        choose.tap()
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        for label in ["Allow Full Access", "Allow Access to All Photos", "Allow"] {
            if springboard.buttons[label].waitForExistence(timeout: 1) { springboard.buttons[label].tap(); break }
        }
        let fixture = app.images.matching(NSPredicate(format: "label BEGINSWITH 'Photo' OR label BEGINSWITH 'Screenshot'")).firstMatch
        if fixture.waitForExistence(timeout: 30) {
            fixture.tap()
        } else {
            // UIImagePickerController (editing enabled) exposes its grid as cells
            // on some iOS versions, while PHPicker uses images.
            let photoCell = app.cells.matching(NSPredicate(format: "label BEGINSWITH 'Photo' OR label BEGINSWITH 'Screenshot'")).firstMatch
            XCTAssertTrue(photoCell.waitForExistence(timeout: 5), app.debugDescription)
            photoCell.tap()
        }
        let crop = app.buttons["Choose"]
        if crop.waitForExistence(timeout: 5) {
            screenshot("Premium-Photo-Square-Crop")
            crop.tap()
        } else if app.buttons["Use Photo"].exists {
            app.buttons["Use Photo"].tap()
        }
        XCTAssertTrue(app.staticTexts.matching(identifier: "Review your photo").firstMatch.waitForExistence(timeout: 15), app.debugDescription)
        XCTAssertTrue(app.images["Preview of your prepared photo"].exists)
        screenshot("Premium-Photo-Preview")
        let use = app.buttons["Use this photo"]
        XCTAssertTrue(use.isHittable)
        use.tap()
        let date = app.textFields["Original photo taken on"]
        let dateError = app.staticTexts.matching(identifier: "Enter the original capture date as YYYY-MM-DD, not a future date.").firstMatch
        XCTAssertTrue(dateError.waitForExistence(timeout: 5))
        XCTAssertTrue(waitUntilHittable(date))
        XCTAssertTrue(waitUntilInlineVisible(dateError, in: app), "Missing capture date should be revealed automatically.")
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        replaceText(date, with: formatter.string(from: Date()), in: app)
        use.tap()
        let confirmed = app.switches["I confirm the original capture date"]
        XCTAssertTrue(waitUntilHittable(confirmed))
        XCTAssertTrue(waitUntilInlineVisible(app.staticTexts.matching(identifier: "Confirm when this photo was originally taken.").firstMatch, in: app))
        confirmed.tap()
        use.tap()
        XCTAssertTrue(app.staticTexts.matching(identifier: "Photo saved on this device").firstMatch.waitForExistence(timeout: 5))
        XCTAssertEqual(reviews.count, originalCount + 1)
        let newest = reviews.element(boundBy: 0)
        XCTAssertEqual(newest.label, "Review photo", "Saving a file must not mark manual composition checks complete.")
        scrollTo(newest, in: app)
        newest.tap()
        XCTAssertTrue(app.staticTexts.matching(identifier: "Your photo review").firstMatch.waitForExistence(timeout: 5))
        let composition = app.switches["Composition reviewed"]
        scrollTo(composition, in: app)
        composition.tap()
        let notReused = app.switches["Not used in a previous DV entry"]
        scrollTo(notReused, in: app)
        notReused.tap()
        let reviewed = app.staticTexts.matching(identifier: "Reviewed by you").firstMatch
        scrollTo(reviewed, in: app)
        XCTAssertTrue(reviewed.isHittable)
        screenshot("Premium-Photo-Manual-Review")
        let export = app.buttons["Export JPEG"]
        scrollTo(export, in: app)
        XCTAssertTrue(export.isHittable, "A prepared JPEG must remain exportable from review.")
        // Do not choose any share destination or transmit the fixture externally.
        export.tap()
        let activityList = app.otherElements.matching(identifier: "ActivityListView").firstMatch
        let activity = app.cells.matching(NSPredicate(format: "label == 'Copy' OR label == 'Save Image' OR label == 'Save to Files'")).firstMatch
        XCTAssertTrue(activity.waitForExistence(timeout: 5), app.debugDescription)
        screenshot("Premium-Photo-Export-Sheet")
        let dismissRegion = app.otherElements.matching(identifier: "PopoverDismissRegion").firstMatch
        let shareClose = activityList.buttons.matching(identifier: "Close").firstMatch
        if dismissRegion.exists {
            // The observed iOS share UI is a popover with an explicit outside-dismiss region.
            // Tap above its frame, never on an activity/destination.
            let collection = app.collectionViews.matching(identifier: "activityCollectionView").firstMatch
            let outsideY = max(app.frame.minY + 30, collection.frame.minY - 30)
            app.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: app.frame.width / 2, dy: outsideY - app.frame.minY)).tap()
        } else if shareClose.exists && shareClose.isHittable {
            shareClose.tap()
        } else {
            let collection = app.collectionViews.matching(identifier: "activityCollectionView").firstMatch
            XCTAssertTrue(collection.exists, app.debugDescription)
            let origin = app.coordinate(withNormalizedOffset: .zero)
            origin.withOffset(CGVector(dx: collection.frame.midX, dy: collection.frame.minY + 8)).press(forDuration: 0.1,
                thenDragTo: origin.withOffset(CGVector(dx: collection.frame.midX, dy: app.frame.maxY - 20)))
        }
        let exportDismissed = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: activityList)
        XCTAssertEqual(XCTWaiter.wait(for: [exportDismissed], timeout: 5), .completed)
        XCTAssertTrue(app.staticTexts.matching(identifier: "Your photo review").firstMatch.waitForExistence(timeout: 5))
        // The current sheet is the newly prepended fixture, never an existing photo.
        let delete = app.buttons["Delete photo"]
        scrollTo(delete, in: app)
        delete.tap()
        XCTAssertTrue(app.alerts["Delete this photo?"].waitForExistence(timeout: 3))
        app.alerts.buttons["Delete"].tap()
        XCTAssertTrue(choose.waitForExistence(timeout: 5))
        XCTAssertEqual(reviews.count, originalCount)
        screenshot("Premium-Photo-Fixture-Cleaned-Up")
    }

    /// Read-only layout sweep for small iPhone, Pro Max and iPad. No records are changed.
    @MainActor func testPremiumScreensResponsive() throws {
        continueAfterFailure = false
        try XCTSkipUnless(ProcessInfo.processInfo.environment["DV_PREMIUM_UI_TESTS"] == "1", "Requires the updated iOS app installed in a simulator.")
        let app = XCUIApplication(bundleIdentifier: ProcessInfo.processInfo.environment["DV_UI_BUNDLE_ID"] ?? "com.dvlottery.expo")
        acceptOpenAppPrompt()
        startIsolated(app)
        dismissDevelopmentMenu(app)
        if app.buttons["tour-skip"].waitForExistence(timeout: 2) { app.buttons["tour-skip"].tap() }
        if app.buttons["Close"].exists { app.buttons["Close"].tap() }
        let home = app.descendants(matching: .any).matching(identifier: "tab-home").firstMatch
        XCTAssertTrue(home.waitForExistence(timeout: 20), app.debugDescription)
        dismissKeyboardBeforeNavigation(app)
        home.tap()
        let next = app.buttons["home-next-action"]
        XCTAssertTrue(next.waitForExistence(timeout: 5))
        scrollTo(next, in: app)
        XCTAssertTrue(next.isHittable)
        screenshot("Responsive-Home")
        dismissKeyboardBeforeNavigation(app)
        app.descendants(matching: .any).matching(identifier: "tab-apply").firstMatch.tap()
        XCTAssertTrue(app.staticTexts.matching(identifier: "Prepare your entry").firstMatch.waitForExistence(timeout: 5))
        let continueButton = app.buttons["apply-continue"]
        XCTAssertTrue(continueButton.isHittable, "The sticky action must fit above the tab bar on every device.")
        screenshot("Responsive-Prepare")
        dismissKeyboardBeforeNavigation(app)
        app.descendants(matching: .any).matching(identifier: "tab-photos").firstMatch.tap()
        XCTAssertTrue(app.staticTexts.matching(identifier: "A photo for each person").firstMatch.waitForExistence(timeout: 5))
        let choosePhoto = app.buttons["Choose from Photos"]
        scrollTo(choosePhoto, in: app)
        XCTAssertTrue(choosePhoto.isHittable)
        screenshot("Responsive-Photos")
        dismissKeyboardBeforeNavigation(app)
        app.descendants(matching: .any).matching(identifier: "tab-my-entries").firstMatch.tap()
        let add = app.buttons["add-entry"]
        XCTAssertTrue(add.waitForExistence(timeout: 5))
        scrollTo(add, in: app)
        screenshot("Responsive-Entries")
        app.buttons["Open settings"].tap()
        XCTAssertTrue(app.buttons["replay-welcome-tour"].waitForExistence(timeout: 5))
        screenshot("Responsive-Settings")
        app.buttons["Close"].tap()
        dismissKeyboardBeforeNavigation(app)
        home.tap()
    }

    @MainActor private func startIsolated(_ app: XCUIApplication, standalone: Bool = true) {
        if standalone { app.terminate(); app.launch() }
        else { app.activate() }
    }

    @MainActor private func dismissKeyboardBeforeNavigation(_ app: XCUIApplication) {
        guard app.keyboards.firstMatch.exists else { return }
        let done = app.buttons["Dismiss keyboard"]
        if done.exists && done.isHittable {
            done.tap()
        } else if app.keyboards.buttons["Done"].exists {
            app.keyboards.buttons["Done"].tap()
        } else {
            // The production scroll views use keyboardDismissMode=on-drag.
            // This is navigation cleanup, never used to reveal a validation error.
            dragVisibleScroll(in: app, downward: false)

        }
        let gone = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: app.keyboards.firstMatch)
        XCTAssertEqual(XCTWaiter.wait(for: [gone], timeout: 5), .completed, "Dismiss the keyboard before using the bottom tabs.")
    }

    /// Accessibility alerts can be visible without reporting an actionable hit
    /// point. Check their full frame against the unobscured scroll viewport.
    @MainActor private func waitUntilInlineVisible(_ label: XCUIElement, in app: XCUIApplication, timeout: TimeInterval = 5) -> Bool {
        let predicate = NSPredicate { _, _ in
            guard label.exists else { return false }
            let frame = label.frame
            guard frame.width > 0 && frame.height > 0 else { return false }
            let viewport = self.visibleScrollFrame(in: app)
            let keyboard = app.keyboards.firstMatch
            var bottom = viewport.maxY
            if keyboard.exists { bottom = min(bottom, keyboard.frame.minY) }
            for identifier in ["apply-continue", "Save entry", "Use this photo"] {
                let action = app.buttons[identifier]
                if action.exists && action.isHittable { bottom = min(bottom, action.frame.minY) }
            }
            return frame.minX >= viewport.minX - 1 && frame.maxX <= viewport.maxX + 1
                && frame.minY >= viewport.minY - 1 && frame.maxY <= bottom + 1
        }
        return XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: predicate, object: nil)], timeout: timeout) == .completed
    }

    @MainActor private func openPreparationSection(_ section: String, in app: XCUIApplication) {
        let detailStep = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Step 1: Your details")).firstMatch
        scrollTo(detailStep, in: app)
        detailStep.tap()
        let sectionButton = app.buttons["details-\(section)"]
        scrollTo(sectionButton, in: app)
        sectionButton.tap()
    }

    @MainActor private func typeFixtureText(_ text: String, into element: XCUIElement) {
        // XCTest can inject a replacement burst before a controlled input has
        // committed its clear event. Separate key events wait for the app to idle
        // and exercise ordinary typing without silently accepting dropped letters.
        for character in text { element.typeText(String(character)) }
    }

    @MainActor private func replaceText(_ field: XCUIElement, with text: String, in app: XCUIApplication) {
        scrollTo(field, in: app)
        field.tap()
        let current = field.value as? String ?? ""
        if !current.isEmpty && current != field.placeholderValue {
            // A trailing tap places the caret at the displayed end. For a
            // horizontally scrolled long value, retry against any suffix left
            // after clearing its visible prefix. No keyboard shortcut or
            // editing-menu timing is assumed; the exact empty guard remains.
            for _ in 0..<3 {
                let remaining = field.value as? String ?? ""
                if remaining.isEmpty || remaining == field.placeholderValue { break }
                field.coordinate(withNormalizedOffset: CGVector(dx: 0.95, dy: 0.5)).tap()
                for _ in remaining { field.typeText(XCUIKeyboardKey.delete.rawValue) }
            }
            let cleared = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
                let actual = field.value as? String ?? ""
                return actual.isEmpty || actual == field.placeholderValue
            }, object: nil)
            XCTAssertEqual(XCTWaiter.wait(for: [cleared], timeout: 3), .completed, "The test fixture must clear the complete value: \(field.value ?? "nil")")
        }
        typeFixtureText(text, into: field)
        if !text.isEmpty {
            XCTAssertEqual(field.value as? String ?? "", text, "The test fixture must replace the entire field value.")
        }
    }

    @MainActor private func waitUntilHittable(_ element: XCUIElement, timeout: TimeInterval = 5) -> Bool {
        let expectation = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == true AND hittable == true"), object: element)
        return XCTWaiter.wait(for: [expectation], timeout: timeout) == .completed
    }

    @MainActor private func visibleScrollFrame(in app: XCUIApplication) -> CGRect {
        let keyboard = app.keyboards.firstMatch
        let keyboardTop = keyboard.exists ? keyboard.frame.minY : app.frame.maxY
        // iOS's prediction/accessory bar also exposes a 44pt ScrollView.
        // Choose the largest visible content viewport, never that system bar.
        let candidates = app.scrollViews.allElementsBoundByIndex.map { scroll -> CGRect in
            var frame = scroll.frame.intersection(app.frame)
            frame.size.height = max(0, min(frame.maxY, keyboardTop) - frame.minY)
            return frame
        }.filter { !$0.isNull && $0.width > 0 && $0.height > 44 }
        return candidates.max(by: { $0.width * $0.height < $1.width * $1.height }) ?? .zero
    }

    @MainActor private func dragVisibleScroll(in app: XCUIApplication, downward: Bool) {
        let viewport = visibleScrollFrame(in: app)
        XCTAssertGreaterThan(viewport.height, 44, "A visible scroll region is needed to navigate the form.")
        let origin = app.coordinate(withNormalizedOffset: .zero)
        let x = viewport.midX - app.frame.minX
        let startY = viewport.minY + viewport.height * (downward ? 0.2 : 0.8) - app.frame.minY
        let endY = viewport.minY + viewport.height * (downward ? 0.8 : 0.2) - app.frame.minY
        origin.withOffset(CGVector(dx: x, dy: startY)).press(forDuration: 0.1,
            thenDragTo: origin.withOffset(CGVector(dx: x, dy: endY)))
    }

    @MainActor private func scrollTo(_ element: XCUIElement, in app: XCUIApplication) {
        for _ in 0..<15 {
            if element.exists && element.isHittable { return }
            let viewport = visibleScrollFrame(in: app)
            let above = element.exists && element.frame.maxY < viewport.minY + 8
            dragVisibleScroll(in: app, downward: above)
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
        dismissKeyboardBeforeNavigation(app)
        home.tap()
        app.swipeDown()
        app.swipeDown()
        screenshot("Expo-Home")
        dismissKeyboardBeforeNavigation(app)
        app.descendants(matching: .any).matching(identifier: "tab-apply").firstMatch.tap()
        XCTAssertTrue(app.staticTexts.matching(identifier: "Prepare your entry").firstMatch.waitForExistence(timeout: 5))
        screenshot("Expo-Apply")
        scrollTo(app.buttons["apply-continue"], in: app)
        app.buttons["apply-continue"].tap()
        XCTAssertTrue(app.staticTexts.matching(identifier: "A few things to complete").firstMatch.waitForExistence(timeout: 5))
        dismissKeyboardBeforeNavigation(app)
        app.descendants(matching: .any).matching(identifier: "tab-photos").firstMatch.tap()
        XCTAssertTrue(app.buttons["Choose from Photos"].waitForExistence(timeout: 5))
        screenshot("Expo-Photos")
        dismissKeyboardBeforeNavigation(app)
        app.descendants(matching: .any).matching(identifier: "tab-my-entries").firstMatch.tap()
        XCTAssertTrue(app.buttons["add-entry"].waitForExistence(timeout: 5))
        screenshot("Expo-Entries")
        app.buttons["add-entry"].tap()
        XCTAssertTrue(app.textFields["Applicant full name"].waitForExistence(timeout: 5))
        app.buttons["Close"].tap()
        dismissKeyboardBeforeNavigation(app)
        home.tap()
    }

    @MainActor func testWelcomeTourNavigationAndEveryExit() throws {
        continueAfterFailure = false
        try XCTSkipUnless(ProcessInfo.processInfo.environment["DV_EXPO_UI_TESTS"] == "1", "Requires the Expo preview.")
        let bundle = ProcessInfo.processInfo.environment["DV_UI_BUNDLE_ID"] ?? "host.exp.Exponent"
        let app = XCUIApplication(bundleIdentifier: bundle)
        acceptOpenAppPrompt()
        startIsolated(app, standalone: bundle != "host.exp.Exponent")
        dismissDevelopmentMenu(app)

        for exitPage in 1...4 {
            if !app.buttons["tour-skip"].exists { replayWelcome(app) }
            XCTAssertTrue(app.staticTexts.matching(identifier: "tour-page-1").firstMatch.waitForExistence(timeout: 5))
            if exitPage > 1 {
                for page in 2...exitPage {
                    app.buttons["tour-next"].tap()
                    XCTAssertTrue(app.staticTexts.matching(identifier: "tour-page-\(page)").firstMatch.waitForExistence(timeout: 3))
                }
            }
            if exitPage == 3 {
                app.buttons["tour-back"].tap()
                XCTAssertTrue(app.staticTexts.matching(identifier: "tour-page-2").firstMatch.exists)
                app.buttons["tour-next"].tap()
                XCTAssertTrue(app.staticTexts.matching(identifier: "tour-page-3").firstMatch.exists)
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
            XCTAssertTrue(app.staticTexts.matching(identifier: "tour-page-\(page)").firstMatch.waitForExistence(timeout: 3))
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
        XCTAssertTrue(app.staticTexts.matching(identifier: "tour-page-1").firstMatch.waitForExistence(timeout: 5))
    }

    @MainActor private func dismissDevelopmentMenu(_ app: XCUIApplication) {
        if app.buttons["xmark"].waitForExistence(timeout: 2) {
            let label = app.staticTexts.matching(identifier: "Tools button").firstMatch
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
