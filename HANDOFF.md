# BabyCards / 文文認字 Handoff

Project path:

`C:\Users\enoma\Desktop\opencode-work\agent-works\software\baby-cards`

Current app:

- App name: `文文認字`
- Play/App Store name: `BabyCards 文文認字`
- Bundle ID / Android package name: `com.mono12studio.babycards`

## Recent Work

- Integrated RevenueCat Capacitor SDK:
  - `@revenuecat/purchases-capacitor@10.3.3`
  - `@revenuecat/purchases-capacitor-ui@10.3.1`
- Added RevenueCat customer info, entitlement checking, restore purchases, Paywall, and Customer Center support.
- Added daily Mini Games limit:
  - Free users get 10 game starts per day.
  - Limit resets after local midnight.
  - Unlimited entitlement bypasses the limit.
- Premium / subscription state now controls AdMob banner visibility.
- Fixed AdMob native banner init/show timing.
- Removed full-screen/interstitial ad flow from current app logic.
- Changed Android `minSdkVersion` from 23 to 24 because RevenueCat Paywall UI requires Android API 24+.
- Changed Android `launchMode` from `singleTask` to `singleTop` for safer purchase return flow.
- Changed bundle ID/package from `com.babycards.app` to `com.mono12studio.babycards`.
- Updated iOS `PRODUCT_BUNDLE_IDENTIFIER` to `com.mono12studio.babycards`.

## RevenueCat

Current config is in:

`src/config/app.ts`

Current API key is a RevenueCat test key and must be replaced before production.

Entitlements used by the app:

- Unlimited games: `BabyCards 文文認字 Unlimited`
- No ads placeholder: `BabyCards 文文認字 No Ads`

Configured product identifiers expected by app/dashboard:

- `monthly`
- `yearly`

RevenueCat helps manage subscription state, restore purchases, paywalls, and entitlements, but it does not replace Apple/Google billing setup. Subscriptions still need to be created in App Store Connect and Google Play Console, then connected/imported into RevenueCat.

## Important Files

- `src/config/app.ts`
- `src/lib/premium.ts`
- `src/lib/gameUsage.ts`
- `src/lib/ads.ts`
- `src/components/PremiumDialog.tsx`
- `src/App.tsx`
- `src/sections/TopicsScreen.tsx`
- `capacitor.config.ts`
- `android/app/build.gradle`
- `android/variables.gradle`
- `android/app/src/main/AndroidManifest.xml`
- `android/app/src/main/res/values/strings.xml`
- `ios/App/App.xcodeproj/project.pbxproj`

## Verified Commands

```bash
npm run build
npx cap sync android
npx cap sync ios
```

Android debug APK build passed with local JDK:

```powershell
$jdk = Resolve-Path ".local-jdk\jdk21\jdk-21.0.11+10"
$env:JAVA_HOME = $jdk.Path
$env:Path = "$($jdk.Path)\bin;$env:Path"
Push-Location android
.\gradlew.bat assembleDebug
Pop-Location
```

Latest debug APK:

`android\app\build\outputs\apk\debug\app-debug.apk`

## iOS Build Notes

Windows cannot build the final iOS IPA. A Mac with Xcode and CocoaPods is required.

On Mac:

```bash
npm install
npm run build
npx cap sync ios
cd ios/App
pod install
open App.xcworkspace
```

Then use Xcode:

1. Select the `App` target.
2. Set Signing & Capabilities team.
3. Add In-App Purchase capability.
4. Archive.
5. Upload to App Store Connect.

## Before Production

- Replace RevenueCat test key with Android/iOS production public SDK keys.
- Configure RevenueCat products, offerings, paywall, and entitlements.
- Create matching subscriptions in Google Play Console and App Store Connect.
- Replace AdMob test IDs with real app/unit IDs.
- Update Android AdMob app ID in `AndroidManifest.xml`.
- Add iOS AdMob `GADApplicationIdentifier` in `Info.plist`.
- Build Android release as AAB for Google Play, not APK.

## Rebuild From A Fresh Clone

The `public/` folder is required app content. It contains the real card images, audio, JSON files, generated manifest data, response sounds, number sounds, and brand assets. Keep it in Git.

The following folders are local-only and ignored. They can be recreated after cloning:

- `node_modules/`
- `dist/`
- `.local-jdk/`
- `.gradle/`
- `android/.gradle/`
- `android/app/build/`
- `comfyui/.kokoro-venv/`
- `comfyui/kokoro-weights/`
- `comfyui-output/`

After cloning the repo:

```powershell
npm install
npm run build
npx cap sync android
npx cap sync ios
```

To rebuild Android locally on Windows, Java 21 is needed. The current workspace used a local JDK under `.local-jdk/`, but that folder is not committed.

Options:

1. Install JDK 21 globally and make sure `java -version` works.
2. Or recreate `.local-jdk/` by downloading a Temurin/OpenJDK 21 build and setting `JAVA_HOME` before Gradle.

Example when `.local-jdk\jdk21\jdk-21.0.11+10` exists:

```powershell
$jdk = Resolve-Path ".local-jdk\jdk21\jdk-21.0.11+10"
$env:JAVA_HOME = $jdk.Path
$env:Path = "$($jdk.Path)\bin;$env:Path"
Push-Location android
.\gradlew.bat assembleDebug
Pop-Location
```

To recreate ComfyUI/Kokoro development assets:

- Recreate the Python virtual environment in `comfyui/.kokoro-venv/`.
- Reinstall the Kokoro dependencies used by the local TTS scripts.
- Download Kokoro weights again into `comfyui/kokoro-weights/`.
- Regenerated image/audio experiments should go into `comfyui-output/`.

These ComfyUI/Kokoro folders are not required for users running the built app. They are only needed when generating or regenerating assets during development.
