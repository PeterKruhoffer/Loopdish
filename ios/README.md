# LoopDish for iOS

Native SwiftUI client for iOS 17 and later. It calls the existing Convex backend with the same WorkOS identity as the website. No migration, extra database, or web view is required. Name editing requires the backend's `households:updateMyName` mutation to be deployed before distributing the updated app.

The app includes live weekly planning, dish creation and search, dinner completion and history, household settings and invitation sharing/acceptance, and AI dish/week suggestions. Cream, coral, green, and rounded cards follow the website. Native tabs, sheets, confirmation dialogs, and the share sheet replace browser controls. Danish translations cover screen controls; backend errors retain the server's English messages.

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

For manual inspection, add `--fixture populated` to the scheme's Run arguments, or launch an installed Debug build:

```sh
xcrun simctl launch booted com.loopdish.ios --fixture populated --fixture-language en
```

Other fixtures are `member`, `empty`, `completed`, `error`, `loading`, `signedOut`, and `restoring`. The `member` fixture shows name editing without owner controls. The last holds the real restoration splash for inspection without delaying normal startup. Remove these arguments to use the configured backend. Fixtures are excluded from Release builds. Generic simulator Release builds can be checked with:

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

## Quiet cream launch screen

`LaunchScreen.storyboard` is the OS launch screen, configured by `UILaunchStoryboardName`. It works before SwiftUI starts. `LaunchSplash` loads the same storyboard while authentication restores; the existing signed-out screen and sign-in button follow restoration unchanged. There is no artificial delay, spinner, tagline, or splash control.

The background is `#FFF9ED`. The brand image scales proportionally to 36% of screen width, capped at 240 points on larger screens. Its bowl artwork occupies about 30% of a phone's width. The group is centered horizontally at 47% of screen height. `SplashBrand.png` uses the original `public/icon-512.png`, with its ivory background removed using `rembg`, cropped to the alpha bounds without color masking. The wordmark is rasterized SF Rounded Semibold in forest green beneath the unchanged artwork. This is a transparent brand asset, not a stretched screenshot or the website's plate icon.

Tests instantiate and render the compiled launch storyboard at 320×568, 402×874, and 1024×1366, verify its image, cream color, aspect ratio and constraints, then check the restoration splash and preserved sign-in screen through XCUITest.

## Distribution still needs Apple setup

The app includes a 1024-pixel app icon and a required-reason privacy declaration for its own UserDefaults preferences. The signed Release device archive at `.amp/LoopDish-build2.xcarchive`, version 1.0 build 2, was uploaded successfully to App Store Connect for internal TestFlight testing on September 11, 2026. Build 2 corrects the placeholder Convex URL in build 1 to the regional production URL copied from the Convex dashboard. An anonymous native SDK subscription reached production and received its expected authentication error; authenticated data loading still requires a user check. Apple processing and tester assignment must complete before installation. This build is restricted to internal testing, not external testers or App Store distribution.

For an App Store release, a privacy policy, account deletion, and review of Apple's current sign-in requirements remain. Sign-out clears the local Keychain session; it does not revoke other devices' sessions. Invitation links currently open the website; users can paste them into the native app. Universal Links need an associated domain entitlement and an Apple app-site-association file on the production website.

Keep the same backend access rules. iOS never sends a household ID to select or impersonate a household. Convex derives membership from the verified WorkOS token, enforces owner permissions, prevents duplicate dinner completion, and applies the existing AI rate limit.
