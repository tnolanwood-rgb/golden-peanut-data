# Protected release and rollback — INCOMPLETE, DO NOT EXECUTE

## 18 Nov 2026 — exact PR head `cca17780` verified; automated gates green; external release gates open

PR #65 is still DRAFT at `cca17780315ca8c923f3506edb931fc586d1ff99`. All three workflows passed on this exact head:
- [Full regression/audit #430](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/44411058077) — PASS. Source, Python, JavaScript, browser regression, synthetic visual acceptance, startup/performance and repeated-session retention probes, main-drift check and actionlint completed successfully. Browser screenshot artifact **14477850583**.
- [Android 35 AOSP emulator #59](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/44411058180) — PASS. All nine functional/lifecycle cases passed: cold launch, focus, input diagnostics, forward/reverse swipe, OSRS nested vertical scrolling, rotation and background/resume. Artifact **14477253148**. This uses the separate `com.goldenhub.dual.preview` package, not the user's installed app or physical phone. Emulator screenshot framebuffer remains unusable/black; no native visual sign-off.
- [Separate Android preview APK #91](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/44411058155) — PASS. Preview build, manifest/signing and exact frontend embedding checks passed. Artifact **14476838797**. Not installed and not an approved replacement.

The runtime application source tested by the audit is `73ec2f83ea45f88bcdd2a0efd025ed2a7e9db01f`; commits after it in this PR are test, workflow and documentation safety work. The paired six-trial synthetic desktop Chromium profile recorded baseline ready median 211.7ms and candidate 223.6ms, with zero long tasks in all six trials on both revisions. That is a modest 11.9ms sample delta, not a main-thread long-task regression and not Android/real-network performance. Repeated-session retention and all current audit gates pass.

Current `main` independently reads `41e3ef709059922ccae7f7e5570ac7764eeb3817`; there is no main drift at this checkpoint. No production deployment, merge, APK installation, Worker/D1 write, production data change, Cloudflare project mutation or credential change occurred.

**Release is not READY:** real Cloudflare staging project/readback and hosted rollback have not been performed; no physical-phone visual/performance acceptance; actual installed package, signer and storage state remain unknown. AOSP framebuffer is black. The old remote-WebView APK and later bundled Capacitor APKs behave differently; do not assume a website deploy updates bundled copies. Preserve the current installation.

**My-side work complete for this checkpoint:** application implementation, regression hardening, reproducible CI, native emulator function/lifecycle QA, preview APK packaging, performance/retention probes, offline rollback rehearsal, staging fail-closed guard, and evidence/docs are complete. I cannot access Cloudflare account secrets, dispatch the protected workflow with this GitHub connection, inspect the user's physical phone or verify hosted rollback. Do not merge/deploy or replace the APK. Owner-side Cloudflare/device verification and explicit `Implement` remain required.

## 18 Nov 2026 — exact candidate passed CI; release still BLOCKED
Candidate `60557fd95111350bbe6b8282bfb97721ea830968`; full regression 44404036193, separate preview APK 44404036054 and Android 35 AOSP ATD 44404035839 all PASS. Native artifact 14472403954 passes all nine functional/lifecycle checks with zero long tasks; screenshots all black. Synthetic browser visual acceptance passes. Three repeated 100-cycle session probes show 961 stable DOM nodes and no errors. Compact startup index and history-shard fixture benchmarks reduce payloads by 84.5% and 96.9%, respectively.
Residual: six-round desktop Chromium cold-start profile has 50–54ms long tasks in 4/6 candidate trials versus 0/6 baseline, with no script attribution; medians are nearly equal. Keep this diagnostic open. This is not Android WebView evidence.
Production main remains `41e3ef709059922ccae7f7e5570ac7764eeb3817`; PR #65 DRAFT/unmerged. Real Cloudflare synthetic staging/readback, original installed package/signature/storage identification, physical phone visual/performance acceptance, and hosted rollback verification are still open. AOSP framebuffer is black. **DO NOT EXECUTE / NO READY FOR IMPLEMENT.** No production deploy, merge, user APK replacement, D1/Worker/data/credential mutation.


## 17 Nov — all three source/native CI suites pass; real release remains explicitly BLOCKED
Exact green protected source `00665acdfc279bcf57720acbb9c58e849396213c`: 44054851632 full regression, 44054851607 independent preview APK, 44054851609 Android 35 ATD native actual forward/reverse/vertical/rotation/resume — all PASS. Native emulator screen capture is wholly black; screen visuals and real hardware smoothness are NOT verified. ~1sec browser long animation frame still demands performance analysis.
New critical installation finding from read-only user APKs: original `com.thegoldenpeanut.mobile` points to existing Pages origin, while newer Capacitor v1-v4 use DISTINCT `app.goldenpeanut.tradinghub` / `tradinghu2` / `tradinghu3` / `tradinghu4`, bundle static frontend and disable Android backup. A website-only release cannot update those packaged copies. Exact app currently installed and its signer/export path unknown. A separate preview package cannot automatically replace or share private data with them. See ANDROID-ORIGINAL.md.
Remaining mandatory gates: actual original installed device source/package/storage/back/keyboard/smoothness; independent Cloudflare credential-free synthetic staging with read-only binding inventory and rollback; hosted byte-for-byte preflight; full financial and visual acceptance; main drift verification; frozen candidate and final owner readiness report. Owner must explicitly say **Implement** afterwards. Continue no-new-feature scope. No production changes or APK install done.


## 17 Nov exact-head gate result: NO RELEASE
At `80f3857d`, full regression CI 44049887597 PASS and separate Android preview 44049887575 PASS; native AOSP WebView 44049887731 FAIL first actual horizontal gesture after valid app focus, with touchcancel and severe input-duration/long-task stalls. **A real release is blocked.** The offline rollback rehearsal in full CI does not replace isolated Cloudflare staging or verified hosted rollback. PR #65 remains DRAFT and all production/frontend/account/Android user state untouched by this project. No owner Implement after a readiness report has occurred.


## 17 Nov — offline rollback dry-run is TESTED; final readiness remains BLOCKED
New `scripts/golden_experience_rollback_rehearsal.py` simulates source-locked static frontend upgrade then rollback byte-for-byte inside an ephemeral filesystem. Four local tests passed; mandatory GitHub PR CI offline rehearsal step on run 44049406065 passed. This **cannot** certify the actual hosted predecessor, Cloudflare asset hashes, independent staging, production deployment/rollback or original Android data continuity. This is preparation, not a release action.
Main advanced by one data-only automated snapshot commit `02f0e864`, not an app update. Final candidate must independently read real main, hosted build identity, staging project/bindings and original package compatibility; abort on drift. The native emulator has not consistently passed first swipe/nested scroll. Maintain a complete production freeze and draft PR. Only after ALL gates, final readiness report, and subsequent owner's explicit **Implement** can a production release be performed.


## Owner's 16 November stabilisation / maximum-safe-subset release request
Stop new feature development. Polish, test and release only existing completed work and its necessary safety prerequisites. No subset is currently certified safe to ship: genuine Android native swipe remains intermittent and vertical nested scroll has failed strict tests, isolated binding-free Cloudflare staging has not been established, original installed Android/storage behaviour is unverified, and a production-safe rehearsal/rollback has not been completed. User wants eventual live launch, but the established **final readiness report followed by explicit Implement** release gate remains in force. Do NOT merge/deploy the current branch or point an Android debug APK at production. Preserve working production website/installed app/credentials/storage.


## Verified incremental Android acceptance — release remains BLOCKED
At exact source `e538b648d1d2d48eb360b8615f7fbd8707b73486`, full [source CI 43965081086](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43965081086), [independent preview APK 43965081112](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43965081112) and [Android 35 emulator 43965081137](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43965081137) passed. Native emulator swipe no longer touch-cancels; rotation/resume succeeded. This is **not** a frozen release candidate, original installed APK signoff, physical-phone performance evidence, distinct Cloudflare staging or tested production rollback. Existing main `097f012c1f912411790dd7dce21434a9cdc497d2` remains frozen. No change permitted to production deployment/origin/credentials/data until all remaining gates and explicit later owner “Implement”.


## Additional fail-closed source identity preflight (new CI pending)
The helper now checks that the local checkout's true Git HEAD/tree equal the supplied candidate identifiers and that tracked/untracked source is clean. Candidate lock JSON must stay within ignored artifacts/; it never enters app/. The verified predecessor 10a32e1 passed CI 43959179383 and separate Android 43959179409. The new hardening is not yet exact-head CI-verified. Checking local Git does not check remote main; final release workflow MUST independently read/compare remote production and staging identities and verify a rollback. Do not deploy.


## Source-lock helper exists but release remains BLOCKED
Use scripts/golden_experience_candidate.py prepare and verify with trusted actual source commit, source tree and main SHA to prepare an offline exact app-file and dependency lock. The utility never deploys, checks remote identity, accesses accounts or proves staging. A future controlled release must collect remote identities, verify distinct synthetic staging, original data/native compatibility and rollback before owner signoff. Do not ship or mistake this utility for the complete release procedure.


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
