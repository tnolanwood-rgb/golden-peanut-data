# Protected release and rollback — INCOMPLETE, DO NOT EXECUTE

## Native preview provenance checkpoint — 16 November 2026
Source `bf84c76e5d4ad68c99cd3fafa3c1235777a4e9e8`: [Android build 43941763186 PASS](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43941763186), artifact 14263147726: separate debug package `com.goldenhub.dual.preview`, fully signed/manifest-verified, **37** byte-matched embedded app files; SHA-256 `545e9f9773a2a34413e0321fcb8d4e3c60f937d2c7be167d9175070743f463aa`. Distinct from legacy production package `com.thegoldenpeanut.mobile`; this preview **cannot constitute an in-place update**. No existing installed package replaced and no new production APK is approved. Native runtime/browser state, real-device accessibility/memory, actual current installed signing identity and production rollback rehearsal remain unverified. Keep original installed app untouched until owner's explicit later “Implement” after complete READY report.


## Recovered earlier original Android APK — 16 November 2026
Only one *older* user Library archive was inspected read-only: `Golden_Peanut_Android_Installer.apk`, package `com.thegoldenpeanut.mobile`, minimal WebView opening `https://thegoldenpeanut.pages.dev/`. Exact archive SHA-256 `1102ab605e606ad6a81839f12f0be608f237cb40e20342ab162b30fb0c962ec5`; V1 signer fingerprint recorded in ANDROID-ORIGINAL.md. This **does not prove current device package, origin behaviour on current WebView, update key access or release compatibility**. No new native APK or permission needed/planned. Production untouched; staging, rollback and final gate remain INCOMPLETE.

Owner has NOT authorized implementation. No candidate is frozen. No merge/deploy,
release-request edit, Worker/D1 action, APK replacement or production-data migration.
Only the owner's **Implement**, after an evidence-backed final readiness report,
authorizes the prepared production operation.

Release architecture: prefer existing same-origin static assets, keeping installed
APK/package/signer, `https://thegoldenpeanut.pages.dev/`, IndexedDB/config/ledger and
all services unchanged. Existing guided-ui-production.yml checks main/project,
runs source/Python/JS/browser checks, embeds exact source commit, deploys app/, checks
every asset SHA-256 and runs live swipe smoke. It auto-deploys main app changes;
therefore no merge before final authority. Existing rollback is frontend-only revert
through the tested pipeline; never clear storage or roll back account databases.

Before readiness, implement/test a controlled release wrapper and record:

1. Frozen candidate commit/tree, lockfile hash, complete asset manifest, all tests
   and isolated synthetic staging URL/deployment identity.
2. Exact current production source/assets and last known good bundle/hash manifest.
3. Drift check against main/live identity; incorporate any intervening fixes in dev,
   rerun affected/full acceptance, freeze replacement candidate before approval.
4. Isolated staging deploy + exact hash/functional verification and rollback rehearsal.
5. Explicit authorization gate; single prepared release invocation with fail-closed
   preflight, compatible same-origin assets and postdeploy live-host verification.
6. Critical-smoke failure detection and immediate prepared frontend rollback, verifying
   old assets and both games without account mutation; report deployment identity.
7. Monitoring and all remaining platform/external failure limitations.

Staging is not yet configured. Full Pages source/build settings, preview write
isolation and production wrapper compatibility need evidence. Do not reuse private
monitor credentials/CORS or bind staging to production D1. No readiness declaration
or deployment command is authorized by this document.

## Current preparation checkpoint

Intermediate implementation 51e95269e3cbfd5873e9772539160f8ef28bafc9/tree 181340c1cc538feedd27f6e7034b60fdf8e8a656
has37 source distributable assets (generated build-info adds one at deployment),
exact hashes and unchanged lock identity in evidence/implementation-identity.json.
This is NOT the final candidate manifest. Main/live 097f012 is the current predecessor,
not a permanently pinned rollback target; recheck intervening releases at readiness.
No staging, frozen candidate or executable rehearsed release operation exists yet.
Original package/signer unavailable; source repository Android package is separate
QA and must never be substituted for installed-app compatibility proof. No native
source change required by current web implementation. All production data protected.
