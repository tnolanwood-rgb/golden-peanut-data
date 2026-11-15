# Golden Trading Hub Android QA build

The separate package remains `com.goldenhub.dual.preview`; version 0.3-audit-preview, code 2, min API 26 / target 34 / compile 35. It does not replace Golden Peanut or Golden Exchange. Never uninstall an original app to resolve a signature conflict.

The APK now includes the exact reviewed `app/` frontend. Static assets are served from the APK at the unchanged `https://private-dual-hub-preview.thegoldenpeanut.pages.dev/` origin; live data continues through the existing endpoints. No Pages or Worker deployment is required to exercise the frontend repairs. The production-origin release configuration is unchanged. No private account data, API keys or signing keys are packaged.

Build with Java 17+ and Android platform/build-tools 35:

```sh
cd android
./gradlew :app:assembleDebug :app:testDebugUnitTest :app:lintDebug
```

The Gradle 8.9 wrapper verifies its downloaded distribution checksum. For repeatable private-QA updates, set `GOLDEN_HUB_DEBUG_KEYSTORE` to the retained Android debug keystore (alias `androiddebugkey`, standard debug passwords). CI's default generated debug key is ephemeral and cannot be promised to update another debug installation. Production signing requires an owner-controlled signer and a separately approved release. No release key is generated.

APK: `android/app/build/outputs/apk/debug/app-debug.apk`. PR/manual workflow **Golden Hub — Build Separate Android Preview** uploads **golden-hub-cloudflare-preview-apk**, including SHA-256 and native test/lint reports. It performs no deployment or installation.

Implemented: configuration-change coverage retaining the WebView, pause/resume without reloading, explicit renderer recovery, exact HTTPS origins, gesture-only external links, document file picking, bounded 24 MB blob backup export through the system Save picker, and back handling for modals/forms/game navigation. Exports over 24 MB must use the existing browser backup flow; the app never clears history to meet that limit.

Unverified on hardware: real touch/back gestures, rotation with the keyboard/file picker open, renderer/process death, filesystem permissions and large/compressed backup round trips. A new package's WebView cannot automatically read an original app's private IndexedDB. Original installed histories, credentials and collectors were not accessed or migrated.

The private monitor Worker currently permits only the production Pages origin. Its existing consent/CORS boundary is retained: the preview can use the mature local GW2 engine and account API, but preview-origin cloud-monitor integration remains a separate acceptance gate. Do not change origin or migrate user records to bypass it.
