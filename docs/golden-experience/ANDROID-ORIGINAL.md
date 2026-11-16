# Read-only legacy Android installer investigation — 16 November 2026
An earlier user-owned `Golden_Peanut_Android_Installer.apk` was located in their file Library and inspected without mutation. **It is not confirmed as the APK currently installed.**
- Valid ZIP-structured minimal APK, 3,538 bytes; SHA-256 `1102ab605e606ad6a81839f12f0be608f237cb40e20342ab162b30fb0c962ec5`.
- AndroidManifest string pool: package `com.thegoldenpeanut.mobile`. DEX contains `Lcom/thegoldenpeanut/mobile/MainActivity;`, WebView/WebViewClient and literal `https://thegoldenpeanut.pages.dev/`.
- `keytool -printcert -jarfile` identifies self-issued CN=The Golden Peanut / OU=Private App / O=Golden Peanut, valid 2026-11-04 to 2036-11-01; certificate SHA-256 `75:CC:BB:53:5E:A2:34:A9:36:A0:60:3E:5A:73:EC:C6:B5:7B:9B:49:6A:4D:3C:4C:23:25:03:A6:A5:45:68:EC`.
- `jarsigner -verify -strict -certs` verifies JAR entries while flagging expected self-signed trust chain and missing timestamp; **does not prove physical Android installability or signing-key availability**.
- Separate megabyte-sized preview APKs exist; neither their native package nor signing compatibility with the original installer or current phone is established.
**Implication:** prefer same-origin existing-WebView frontend asset release, not APK replacement. No user APK was added to repository, no signing key available, no device test and no authorisation to modify production.
