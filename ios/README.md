# LoopDish for iOS

Native SwiftUI client for iOS 17 and later. It calls the existing Convex backend with the same WorkOS identity as the website. No migration, extra database, or web view is required. Name editing requires the backend's `households:updateMyName` mutation to be deployed before distributing the updated app.

The app includes live weekly planning, dish creation and search, dinner completion and history, household settings and invitation sharing/acceptance, and AI dish/week suggestions. Cream, coral, green, and rounded cards follow the website. Native tabs, sheets, confirmation dialogs, and the share sheet replace browser controls. Error messages follow the selected English or Danish language. Known backend errors get readable instructions; unknown failures use a generic retry message without exposing SDK or server details. This mapping supports the existing backend and needs no backend deployment.

Under Household, owners and members can edit their own display name. Names use the same saved value as the website, trim surrounding whitespace, and accept 1–100 UTF-16 code units. Failed saves retain the draft. Sign-up continues to use the identity provider's name when available.

## Run on a Mac

Use Xcode 26 or later and XcodeGen on an Apple Silicon Mac. ConvexMobile 0.8.1 ships an arm64-only simulator library, so the project excludes x86_64 simulator builds:

```sh
brew install xcodegen
cp ios/LoopDish/Configuration.example.json ios/LoopDish/Configuration.local.json
```

Fill in the copied JSON:

- `convexURL`: the same `VITE_CONVEX_URL` used by the website, ending in `.convex.cloud`, not `.convex.site`.
- `workosClientID`: the same WorkOS client ID used by `convex/auth.config.ts`. A different WorkOS application can create different identities and will not automatically preserve household membership.
- `webURL`: the public HTTPS website origin, used for existing `/join/<inviteId>` links.
- `redirectURI`: keep `loopdish://auth/callback`. If changing the scheme, also change `CFBundleURLSchemes` in `project.yml`.

In the existing WorkOS application's dashboard, enable public-client/native PKCE authentication as required and add `loopdish://auth/callback` to allowed redirects. Keep the website's existing redirects. This is an external configuration step; the repository does not change WorkOS settings automatically.

Only public configuration belongs in the app. Never include a WorkOS API key, client secret, cookie password, Convex deploy key, or Cloudflare token.

Generate and open the project after creating the local configuration so XcodeGen includes it as a bundled resource:

```sh
xcodegen generate --spec ios/project.yml
open ios/LoopDish.xcodeproj
```

Select the LoopDish scheme and an iPhone simulator, then Run. For a physical device, choose your Apple development team and an available bundle identifier in Signing & Capabilities. The generated project is ignored; keep project settings in `project.yml`.

## Verification

```sh
xcodebuild -project ios/LoopDish.xcodeproj -scheme LoopDish \
  -destination 'platform=iOS Simulator,name=iPhone 17' test
```

Use an installed simulator name from `xcodebuild -showdestinations` if needed. Tests cover Convex DTO decoding, Copenhagen day boundaries, daylight saving time, Monday-based weeks across New Year, and invitation link validation.

UI tests need no local configuration or account. They launch the actual SwiftUI screens with Debug-only, read-only fixtures and save simulator screenshots as XCTest attachments. They cover populated, empty, completed, loading and error screens, dish selection and creation sheets, form validation, English/Danish controls, in-app language changes to day accessibility labels, and scrolling at the largest accessibility text size. Fixture requests never connect to Convex or modify the Keychain. Save attempts show an explicit read-only error.

The `duplicateDish` fixture reproduces the Risengrød Convex error through the error mapper. Error tests cover JSON decoding, safe fallbacks, Danish translations, and dismissal in both languages at the largest accessibility text size. On October 6, 2026, all nine unit tests and eleven UI tests passed with Xcode 27.0 on the iPhone 17 simulator running iOS 26.5. A further duplicate-error test run passed with both languages at the largest text size, and its screenshots were inspected without error-message clipping or exposed SDK details.

For manual inspection, add `--fixture populated` to the scheme's Run arguments, or launch an installed Debug build:

```sh
xcrun simctl launch booted com.loopdish.ios --fixture populated --fixture-language en
```

Other fixtures are `member`, `empty`, `completed`, `error`, `loading`, `signedOut`, `restoring`, and `emptySuggestions`. The `member` fixture shows name editing without owner controls. The `restoring` fixture holds the real restoration splash for inspection without delaying normal startup. The `emptySuggestions` fixture shows the no-new-dishes message under Dishes → Ideas. Remove these arguments to use the configured backend. Fixtures are excluded from Release builds. Generic simulator Release builds can be checked with:

```sh
xcodebuild -project ios/LoopDish.xcodeproj -scheme LoopDish \
  -configuration Release -destination 'generic/platform=iOS Simulator' build
```

Before distributing, test on a simulator and physical iPhone:

1. Sign in with an existing web account. Confirm the same dishes and household appear.
2. Create and plan a dish. Confirm the website updates without reloading. Change a web plan and confirm iOS updates.
3. Mark a meal eaten twice and confirm one history entry. Completed meals must not offer removal.
4. Generate and review an AI week, then apply it. Confirm completed dinners remain unchanged.
5. Share an invite. With a new account, paste it under Household before creating dishes or naming a household. Verify expired invitations and existing membership errors.
6. Relaunch the app, background it past token expiry, disconnect/reconnect networking, and sign out. Verify cached sign-in and token refresh.
7. Inspect empty, loading, populated, error, and completed states at large Dynamic Type sizes and with VoiceOver, in English and Danish.

The native Debug tests and generic simulator Release build were run with Xcode 26.6 on an iPhone 17 simulator running iOS 26.5. Simulator screenshots were inspected, including Danish at the largest accessibility text size. This fixture verification does not verify live WorkOS authentication, Keychain refresh, Convex synchronization, AI generation, invitations, physical devices, or iOS 17 runtime behavior. Those checks still need an authorized configuration and account. The Linux orb cannot run Apple frameworks.

## Today's dinner widget

The `DinnerWidget` WidgetKit extension supports small and medium Home Screen widgets on iOS 17 and later. It shows today's dish, a completed indicator, or "Tap to plan dinner" for an empty day. Tapping opens `loopdish://dinner/today`, selects today in the Week tab, and dismisses any previously open tab sheet. The existing **Plan dinner** button opens dish selection. Signed-out users sign in first. The route uses the day at tap time rather than a date embedded in an old widget entry.

The app saves seven days of dinner names, dates, and completion flags in `group.com.loopdish.ios`. A separate current-day subscription keeps this cache independent of the week being browsed. The widget receives no tokens or credentials and does not call Convex. Changes sync while the app runs; edits made on another device while this app is suspended require reopening the app. WidgetKit controls refresh timing, so updates are not guaranteed to appear immediately. Local-midnight timeline entries handle day changes and daylight saving time. After the cached range ends, the widget asks the user to open the app to sync rather than claiming there is no dinner. Sign-out clears the cache and requests a widget reload. Simulator fixtures do not write to the shared cache.

Widget content follows the app's English/Danish preference. Widget gallery text follows the system locale. Both targets declare App Group entitlements and UserDefaults privacy reasons in the source project configuration.

### Verify on the Mac runner

Regenerate the project with `xcodegen generate --spec ios/project.yml`, then run the existing `xcodebuild ... test` command above and a Release build. `DinnerWidgetTests` covers local-day selection, empty versus unknown dates, both Copenhagen DST changes, New Year, cache replacement/removal, and route validation. `DinnerWidgetRenderTests` renders the production widget view at small and medium dimensions in both languages, with XCTest image attachments. These are native SwiftUI view renders with explicit margins, not a WidgetKit host or refresh test.

Routing UI tests use Safari to hand off URLs to the running app. An unrelated URL must preserve an unsaved draft, proving the test did not relaunch LoopDish. `XCUIApplication.open(URL)` relaunches the target on Xcode 27 and is used only for the cold-launch case. Debug fixtures restore their dashboard after navigation without resetting the selected date or writing the shared widget cache. The unit-test host also uses a signed-out fixture instead of restoring real credentials.

The App Group `group.com.loopdish.ios` is registered for both `com.loopdish.ios` and `com.loopdish.ios.dinner-widget` under the existing team `94985YFAN4`. Both archive and App Store distribution profiles and signed entitlements were verified for build 6 on October 7, 2026. Keep extension and app versions/build numbers equal for distribution.

Inspect `DinnerWidgetPreviews` for planned, empty, completed, missing-cache, long-name, and Danish states. Then add both widget sizes from the Home Screen gallery and verify:

1. Planning, changing, removing, and completing today's dinner updates the widget after sync, even while browsing a different week.
2. Tapping from a terminated app and from another tab/week opens today. Repeat with an app sheet open, after midnight, and while signed out.
3. An empty day's **Plan dinner** button opens dish selection and saves for today.
4. Midnight rollover shows the next day's cached meal. Offline and expired-cache states never show yesterday's dinner as today's.
5. Sign-out clears dinner content. English/Danish, long names, large text, VoiceOver, and tinted Home Screen rendering remain usable.

On October 7, 2026, the widget compiled with Xcode 27.0 and the unsigned Release simulator build passed. Native small/medium renders were inspected for planned, empty, completed, unknown and long-name states in English and Danish. The small widget truncates long dish names while retaining its header and action; the medium render shows the full tested names. Cold URL routing and real warm Safari routing were exercised with fixtures, including other weeks/tabs and nested sheets. A real small Home Screen widget on iOS 26.5 displayed the unknown-cache state; tapping it from History in another week selected today, and **Plan dinner** opened the saved-dish picker. Evidence and commands are under `.amp/in/artifacts/widget/`.

The medium widget was rendered natively but not placed on SpringBoard. Live Convex-to-App-Group synchronization, actual midnight refresh, signed-out Home Screen cache clearing, a terminated-app SpringBoard tap, physical-device execution, iOS 17 runtime behavior, widget Dynamic Type, VoiceOver, and tinted rendering remain unverified. Fixture verification performed no production writes. Signed archive and internal TestFlight delivery are recorded below. The simulator-specific installed-widget tap check is saved separately as `.amp/in/artifacts/widget/SpringBoardWidgetTests.swift`; it is not part of the normal suite.

## Quiet cream launch screen

`LaunchScreen.storyboard` is the OS launch screen, configured by `UILaunchStoryboardName`. It works before SwiftUI starts. `LaunchSplash` loads the same storyboard while authentication restores; the existing signed-out screen and sign-in button follow restoration unchanged. There is no artificial delay, spinner, tagline, or splash control.

The background is `#FFF9ED`. The brand image scales proportionally to 36% of screen width, capped at 240 points on larger screens. Its bowl artwork occupies about 30% of a phone's width. The group is centered horizontally at 47% of screen height. `SplashBrand.png` uses the original `public/icon-512.png`, with its ivory background removed using `rembg`, cropped to the alpha bounds without color masking. The wordmark is rasterized SF Rounded Semibold in forest green beneath the unchanged artwork. This is a transparent brand asset, not a stretched screenshot or the website's plate icon.

Tests instantiate and render the compiled launch storyboard at 320×568, 402×874, and 1024×1366, verify its image, cream color, aspect ratio and constraints, then check the restoration splash and preserved sign-in screen through XCUITest.

## Distribution still needs Apple setup

The app includes a 1024-pixel app icon and a required-reason privacy declaration for its own UserDefaults preferences. The signed Release device archive at `.amp/LoopDish-build2.xcarchive`, version 1.0 build 2, was uploaded successfully to App Store Connect for internal TestFlight testing on September 11, 2026. Build 2 corrects the placeholder Convex URL in build 1 to the regional production URL copied from the Convex dashboard. An anonymous native SDK subscription reached production and received its expected authentication error; authenticated data loading still requires a user check. Apple processing and tester assignment must complete before installation. This build is restricted to internal testing, not external testers or App Store distribution.

Version 1.0 build 4 was uploaded successfully for internal TestFlight on September 18, 2026, using Xcode 27.0 with automatic build-number management. The archive is `.amp/release-build4/LoopDish.xcarchive`; upload logs, test results, and inspected screenshots are under `.amp/release-build4/`. Six unit tests, ten UI tests, and 22 backend tests passed; the Release simulator build and device archive also succeeded. Inspection covered weekday padding, owner/member name editing, Danish accessibility text, and the new empty-suggestions message. The local production configuration was preserved and verified against the archive. The production name mutation returned the expected sign-in error to an unauthenticated probe. Apple reported the upload as processing; installation availability and tester assignment were not confirmed. Physical-device and authenticated end-to-end checks above remain outstanding.

Version 1.0 build 5 was uploaded successfully for internal TestFlight on October 6, 2026. It includes localized, safe error messages. The Release simulator build, signed device archive, and signature verification passed. The production configuration matches the archived copy byte for byte. Artifacts are under `.amp/in/artifacts/ios-errors/`, including `tests.xcresult`, `large-errors.xcresult`, inspected screenshots, `LoopDish.xcarchive`, and `upload.log`. Export used `testFlightInternalTestingOnly=true` and automatic build-number management; Apple confirmed uploaded build 5 with no upload errors or warnings and reported processing started. Completed processing, internal tester assignment, and installation availability could not be confirmed without App Store Connect access. No physical device was connected, and authenticated live flows were not tested.

Version 1.0 build 6, including the dinner widget, was uploaded successfully for internal TestFlight on October 7, 2026 at 15:06 Copenhagen time. Apple confirmed accepted build 6 with no upload errors or warnings and reported processing started. Export used `testFlightInternalTestingOnly=true` and automatic build-number management. The app and embedded widget have matching 1.0/6 versions, team `94985YFAN4`, and `group.com.loopdish.ios` in both their provisioning profiles and signed entitlements. Archive and distribution signatures passed verification; the distribution payload disables debugging. Bundled configuration matches the preserved local production configuration and the previous production archive byte for byte. The 28-test native suite and Release simulator build passed before archiving. Release artifacts, the uploaded IPA, and verification evidence are under `.amp/in/artifacts/widget-release/`. A separate processing-status lookup requires App Store Connect credentials, so completed processing, tester assignment and installation availability remain unconfirmed. No App Store release, external testing, Git push or production backend writes were performed.

For an App Store release, a privacy policy, account deletion, and review of Apple's current sign-in requirements remain. Sign-out clears the local Keychain session; it does not revoke other devices' sessions. Invitation links currently open the website; users can paste them into the native app. Universal Links need an associated domain entitlement and an Apple app-site-association file on the production website.

Keep the same backend access rules. iOS never sends a household ID to select or impersonate a household. Convex derives membership from the verified WorkOS token, enforces owner permissions, prevents duplicate dinner completion, and applies the existing AI rate limit.
