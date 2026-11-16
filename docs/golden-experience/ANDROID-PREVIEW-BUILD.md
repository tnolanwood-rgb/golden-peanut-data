# Golden Experience — Android preview bundle integrity checkpoint

Verified 16 November 2026. **Not release-ready; no production deployment or installed-app change.**

## Exact source, builds and identity
- Feature source: `bf84c76e5d4ad68c99cd3fafa3c1235777a4e9e8` on draft PR #65 (`feature/golden-experience`).
- Android [Actions run 43941763186](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43941763186): SUCCESS; artifact ID `14263147726` (name `golden-hub-cloudflare-preview-apk`).
- Source/Python/JavaScript/browser [Actions run 43941763243](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43941763243): SUCCESS.
- Debug APK: `app-debug.apk`, **1,700,758 bytes**, SHA-256 `545e9f9773a2a34413e0321fcb8d4e3c60f937d2c7be167d9175070743f463aa`.
- APK package: `com.goldenhub.dual.preview`, separate from earlier original package `com.thegoldenpeanut.mobile`. Debug signing is **not** the production signing identity. No existing app replaced.
- The Actions job verified **37** embedded `assets/hub/` files byte-for-byte against the source checkout. It wrote `BUNDLED-ASSETS.txt` and `SHA256SUMS.txt`. Its checkout source was the temporary PR merge SHA `47c1d8cb204427bbeaf59c8af82fc8559581ff0a`; the APK contents were checked against **that** exact checkout (not by assuming the feature-branch SHA and CI SHA are the same).

## Native integrity fix
The Android wrapper bundles reviewed `app/` assets and intercepts the preview host. Previously, a missing packaged JavaScript, CSS, HTML or manifest file could silently fall back to that host, accidentally mixing the latest bundled UI with older remote scripts. `NavigationPolicy.isBundledFrontendAsset` now identifies these local frontend resources; `MainActivity.shouldInterceptRequest` returns an explicit local HTTP 404 with no-store caching if missing. Unit tests distinguish static frontend resources from dynamic API paths. Remote market/account JSON remains online by design.

`.github/workflows/private-hub-android.yml` now runs `unzip -p ... | cmp - ...` for every packaged source asset (excluding Cloudflare-only `app/_headers`). A build fails if any byte differs, eliminating the false comfort of a superficially successful APK built from stale frontend files.

## What this does **not** prove
No physical Android WebView was used. On-device launch/backup import-export, touch swiping, chart pinch/pan, Android back, rotation and process restoration, large-account RAM/startup/fps/battery, full 200% system text UX and external live API behaviour require independent testing. This is **not** a production-compatible APK release, an isolated Cloudflare synthetic staging project or a rollback rehearsal.

**Owner release gate:** remain on draft PR #65. Do not deploy, install over an existing application, change credentials/data, merge main, or claim READY FOR IMPLEMENT. Production main verified unchanged at `097f012c1f912411790dd7dce21434a9cdc497d2`.
