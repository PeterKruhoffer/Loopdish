import XCTest

final class LoopDishUITests: XCTestCase {
    private func launch(_ fixture: String, language: String = "en", large: Bool = false) -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["--fixture", fixture, "--fixture-language", language,
                               "-AppleLanguages", "(\(language))", "-AppleLocale", language == "da" ? "da_DK" : "en_US"]
        if large { app.launchArguments += ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"] }
        app.launch()
        return app
    }

    private func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    func testProfileNameForOwnerAndMember() {
        var app = launch("populated")
        app.tabBars.buttons["Household"].tap()
        XCTAssertEqual(app.textFields["profile-name"].value as? String, "Alex")
        XCTAssertTrue(app.textFields["Household name"].exists)
        capture("profile-owner-en")
        app.terminate()

        app = launch("member", language: "da")
        app.tabBars.buttons["Husstand"].tap()
        let field = app.textFields["profile-name"]
        let save = app.buttons["save-profile-name"]
        XCTAssertEqual(field.value as? String, "Sofie Østergaard")
        XCTAssertEqual(save.label, "Gem navn")
        XCTAssertFalse(app.textFields["Husstandens navn"].exists)
        XCTAssertFalse(app.buttons["Opret invitationslink"].exists)
        capture("profile-member-da")
        field.tap()
        field.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: "Sofie Østergaard".count))
        field.typeText("   ")
        XCTAssertFalse(save.isEnabled)
        field.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: 3))
        field.typeText(String(repeating: "a", count: 101))
        XCTAssertFalse(save.isEnabled)
        XCTAssertTrue(app.staticTexts["Brug et navn på mellem 1 og 100 tegn."].exists)
        capture("profile-name-too-long-da")
        field.typeText(XCUIKeyboardKey.delete.rawValue)
        XCTAssertTrue(save.isEnabled)
        save.tap()
        XCTAssertTrue(app.staticTexts["Simulator fixtures are read-only. No request was sent."].waitForExistence(timeout: 5))
        XCTAssertFalse(app.staticTexts["profile-name-saved"].exists)
        XCTAssertEqual(field.value as? String, String(repeating: "a", count: 100))
        capture("profile-name-save-error-da")
    }

    func testProfileNameAtLargeDynamicType() {
        let app = launch("member", language: "da", large: true)
        app.tabBars.buttons["Husstand"].tap()
        XCTAssertTrue(app.staticTexts["Dit navn"].exists)
        capture("profile-member-da-accessibility")
        for _ in 0..<5 where !app.buttons["save-profile-name"].isHittable { app.swipeUp() }
        XCTAssertTrue(app.buttons["save-profile-name"].isHittable)
        capture("profile-member-da-accessibility-scrolled")
    }

    func testPopulatedAndSheets() {
        let app = launch("populated")
        XCTAssertTrue(app.buttons["We ate this"].waitForExistence(timeout: 10))
        capture("week-populated-en")
        app.swipeUp()
        XCTAssertTrue(app.buttons["Help plan my week"].isHittable)
        XCTAssertTrue(app.buttons["We ate this"].isHittable)
        XCTAssertTrue(app.buttons["Remove"].isHittable)
        capture("week-populated-en-scrolled")
        app.buttons["Change dinner"].tap()
        XCTAssertTrue(app.buttons.containing(.staticText, identifier: "Crispy chickpea bowls").firstMatch.waitForExistence(timeout: 5))
        capture("dish-picker-en")
        app.buttons["Cancel"].tap()
        app.tabBars.buttons["Dishes"].tap()
        XCTAssertTrue(app.staticTexts["Crispy chickpea bowls"].exists)
        capture("dishes-en")
        app.buttons["Add a dish"].tap()
        XCTAssertTrue(app.textFields["Dish name"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["Save"].isEnabled)
        capture("add-dish-en")
        app.textFields["Dish name"].tap()
        app.textFields["Dish name"].typeText("Soup")
        XCTAssertTrue(app.buttons["Save"].isEnabled)
        app.buttons["Save"].tap()
        XCTAssertTrue(app.staticTexts["Simulator fixtures are read-only. No request was sent."].waitForExistence(timeout: 5))
        app.buttons["Cancel"].tap()
        app.tabBars.buttons["History"].tap()
        XCTAssertTrue(app.staticTexts["Roasted tomato pasta"].exists)
        capture("history-en")
        app.tabBars.buttons["Household"].tap()
        XCTAssertTrue(app.staticTexts["Our kitchen"].exists)
        capture("household-en")
    }

    func testEmptyAndCompleted() {
        var app = launch("empty")
        XCTAssertTrue(app.buttons["Plan dinner"].waitForExistence(timeout: 10))
        capture("week-empty-en")
        app.tabBars.buttons["Dishes"].tap()
        XCTAssertTrue(app.staticTexts["Start your rotation"].exists)
        capture("dishes-empty-en")
        app.terminate()
        app = launch("completed")
        XCTAssertTrue(app.staticTexts["Dinner enjoyed"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.buttons["Remove"].exists)
        XCTAssertFalse(app.buttons["We ate this"].exists)
        capture("week-completed-en")
    }

    func testErrorAndLoading() {
        var app = launch("error")
        XCTAssertTrue(app.staticTexts["Something went wrong"].waitForExistence(timeout: 10))
        capture("week-error-en")
        app.buttons["OK"].tap()
        XCTAssertFalse(app.staticTexts["Something went wrong"].exists)
        app.terminate()
        app = launch("loading")
        XCTAssertTrue(app.buttons["Retry"].waitForExistence(timeout: 10))
        capture("week-loading-en")
    }

    func testDanishAndDynamicType() {
        var app = launch("completed", language: "da")
        XCTAssertTrue(app.staticTexts["Middagen er spist"].waitForExistence(timeout: 10))
        capture("week-completed-da")
        app.tabBars.buttons["Retter"].tap()
        app.buttons["Tilføj en ret"].tap()
        XCTAssertTrue(app.textFields["Rettens navn"].waitForExistence(timeout: 5))
        capture("add-dish-da")
        app.terminate()
        app = launch("completed", language: "da", large: true)
        XCTAssertTrue(app.staticTexts["Middagen er spist"].waitForExistence(timeout: 10))
        capture("week-completed-da-accessibility")
        app.swipeUp()
        XCTAssertTrue(app.staticTexts["Middagen er spist"].isHittable)
        XCTAssertTrue(app.buttons["Hjælp med ugeplanen"].isHittable)
        capture("week-completed-da-accessibility-scrolled")
    }

    func testWeekDaysFitInsidePagePadding() {
        for large in [false, true] {
            let app = launch("empty", language: "da", large: large)
            let days = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'week-day-'"))
            XCTAssertTrue(days.firstMatch.waitForExistence(timeout: 10))
            XCTAssertEqual(days.count, 7)
            let bounds = app.windows.firstMatch.frame
            var previous: CGRect?
            for day in days.allElementsBoundByIndex {
                XCTAssertGreaterThanOrEqual(day.frame.minX, bounds.minX + 19.5)
                XCTAssertLessThanOrEqual(day.frame.maxX, bounds.maxX - 19.5)
                XCTAssertTrue(day.isHittable)
                if let previous {
                    XCTAssertEqual(day.frame.minX - previous.maxX, 8, accuracy: 1)
                    XCTAssertEqual(day.frame.width, previous.width, accuracy: 1)
                }
                previous = day.frame
            }
            days.element(boundBy: 0).tap()
            XCTAssertTrue(days.element(boundBy: 0).isSelected)
            capture(large ? "week-days-da-large-monday" : "week-days-da-monday")
            days.element(boundBy: 6).tap()
            XCTAssertTrue(days.element(boundBy: 6).isSelected)
            XCTAssertFalse(days.element(boundBy: 0).isSelected)
            capture(large ? "week-days-da-large-sunday" : "week-days-da-sunday")
            app.terminate()
        }
    }

    func testInAppLanguageChangesDayAccessibilityLabels() {
        let app = launch("completed")
        XCTAssertTrue(app.staticTexts["Dinner enjoyed"].waitForExistence(timeout: 10))
        app.tabBars.buttons["Household"].tap()
        app.buttons["Dansk"].tap()
        app.tabBars.buttons["Uge"].tap()
        let friday = app.buttons.matching(NSPredicate(format: "label CONTAINS 'fredag' AND label CONTAINS 'september'")).firstMatch
        XCTAssertTrue(friday.exists)
        XCTAssertTrue(friday.isSelected)
    }

    func testRestorationSplashAndExistingSignIn() {
        var app = launch("restoring")
        XCTAssertTrue(app.images["launch-brand"].waitForExistence(timeout: 10))
        XCTAssertEqual(app.images["launch-brand"].label, "LoopDish")
        XCTAssertEqual(app.buttons.count, 0)
        XCTAssertEqual(app.activityIndicators.count, 0)
        capture("quiet-cream-restoration")
        app.terminate()
        app = launch("signedOut")
        XCTAssertTrue(app.buttons["Sign in"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons["Sign in"].isEnabled)
        XCTAssertTrue(app.staticTexts["Dinner, on repeat."].exists)
        XCTAssertFalse(app.images["launch-brand"].exists)
        capture("sign-in-preserved")
    }
}
