# Golden Experience — authoritative checkpoint

## 17 November 2026 — native test final result at source 80f3857d
Exact protected `80f3857d53199d5e5c91582f1298fc1dd657db7a`: full source/Python/JS/browser CI [44049887597](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/44049887597) **PASS**; separate preview Android build [44049887575](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/44049887575) **PASS**; Android 35 AOSP 4-core/4GB native emulator [44049887731](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/44049887731) **FAIL**. The app had native focus; first GW2→OSRS native swipe produced 4 touchmoves, 0 touchend, 1 touchcancel; `adb input swipe ... 350` actually took **7,671ms**, with a 1,504ms WebView long task. This is unresolved native reliability, not proof the app/OS alone caused it. Do not mark native gesture fixed or successful. No new product features, Cloudflare staging or original device operations were performed. Draft PR #65 remains protected; release blocked.


## 17 November 2026 — release-focused stabilisation and offline rollback (NO RELEASE)
Owner scope is **no new product features**: polish, verify and prepare the largest proven-safe release of existing Golden Experience work. No main merge, Cloudflare production deploy, installed Android package/origin/signing change or user account/storage mutation before full READY evidence and later explicit **Implement**.
Protected branch source after current QA harness edits `80f3857d53199d5e5c91582f1298fc1dd657db7a`; draft PR #65. New Cloudflare Pages guard `scripts/staging_guard.py` now validates exact `subdomain` separately from optional custom-domain list: `domains: []` is valid only with exact independent `golden-experience-staging.pages.dev`, correct project/branch, no Git source and empty reported private bindings. Seven synthetic tests. This fixes an incorrect earlier assumption about Cloudflare API metadata; it does **not** establish actual staging.
New `scripts/golden_experience_rollback_rehearsal.py`, four local passing synthetic tests, and mandatory PR CI step read exact Git-object frontend snapshots of previous main and current candidate, verify byte identity on predecessor→candidate→predecessor under a temporary directory and write evidence only to ignored artifacts/. Exact CI 44049406065 passed the offline rehearsal step. **No Cloudflare upload or real live rollback verified.**
Android emulator now AOSP Android 35, 4 cores/4 GB, test harness handles only specifically identified stock/Google launcher ANR before requiring Golden Hub's window focus. First AOSP 2-core native run 44048617724 failed first swipe with `touchcancel=1` and a measured 858ms WebView long task; higher-resource run 44049406063 instead hit an **AOSP launcher** ANR before input acceptance. New conditional recovery was corrected at source `80f3857d`; native CI must be inspected before any success claim. Full source regression and Android preview separate pipelines continue; native physical handset still unavailable.
Upstream `main` advanced independently to `02f0e8640b5a22be590f55e9598937cb3f6e7161` through one data-only public market snapshot commit. Reviewed files: only `data/market_*.json` / history shards, no `app/` frontend change. Preserve new data without reset. Remote live-host identity was not independently fetched this session. **Still NOT READY FOR IMPLEMENT:** native reliable swipe/vertical/rotation/resume, actual original phone, separate credential-free staging, deep visual/data acceptance, sealed candidate and real rollback.


## 16 November 2026 — owner release-focused scope freeze; Android native reliability still BLOCKED
The owner has **paused new feature/product work** and asked for the largest actually safe, fully polished and tested release of existing work. Only stabilisation, tests, visual defect correction and essential release engineering are in scope until readiness. **Production is frozen** until a final evidence-backed readiness report and owner's later explicit **Implement**; "launch once safe" is not permission to bypass the gate. Draft PR #65 only.
Current Android result: original app/dual-hub.js and CSS matched prior emulator-green e538 exactly, yet Android run 43975810994 had touchcancel=1/end=0 with a multi-second event gap. Minimal finger pointer-capture removal at 88e6e27 (pen capture retained) and CI path fix at e3314f8 passed complete source/browser checks 43977050401 and standalone preview APK 43977050518. Android run 43977050512 passed actual **GW2→OSRS and reverse OSRS→GW2** horizontal native swipes, but strict OSRS inner vertical scroll failed with top=0. Enhanced hit-tested native run 43978013622 on 22fdf4b failed again on first horizontal touchcancel after a 3-second event gap. **Do not claim the regression fixed or Android accepted.**
Current unverified harness  a3af7567 moves CDP screenshot until after swipe and measures long tasks plus native ADB execution time, preserving strict swipe, nested-scroll, rotation and resume assertions. Follow-on offline Cloudflare staging guard 2434543 and synthetic test 3d5915b now reject an empty reported staging domain; no real staging exists. All changes remain feature-branch only. Visual QA reviewed both 390px desks, populated GW2 and OSRS feed-error/chart screenshots; no new product features.
Remaining blockers: repeated native QA green; actual independent binding-free synthetic staging; physical installed original-package gesture/back/resume/storage/backup/performance; deep visual and account acceptance; frozen release cut with exact asset lock and rehearsed rollback. Owner wants a launch only when genuinely safe. Production main last confirmed 097f012c1f912411790dd7dce21434a9cdc497d2 unchanged. NOT READY FOR IMPLEMENT.


## 16 November 2026 — distinct Cloudflare staging configuration guard prepared (offline TESTED; remote staging BLOCKED)
Added a fail-closed offline Pages project metadata validator and six synthetic Python tests. It only accepts distinct `golden-experience-staging` project/branch/domain and requires explicit empty preview+production D1/KV/R2/service/DO/environment bindings; unknown nonempty bindings and incomplete inventories fail. Locally exercised six synthetic tests; exact full PR CI must confirm after this commit. No staging project was created, no deployment or production configuration was changed. Real Cloudflare read-only project metadata and independent staging deploy/rollback remain OPEN. Production freeze continues. The concurrent native-emulator run must be evaluated separately.


## 16 November 2026 — remove intrusive native focus-tap probe (CI pending)
The 800ms-delayed preflight still reproduced `touchcancel` in Android run 43971116706; full CI 43971116702 and preview APK 43971116747 passed. Added tap was absent from exact native green 43965081137 and its timing was not proven causal; remove the entire extra ADB preflight interaction, preserving capture-phase native touchstart/move/end/cancel assertions and the expanded native OSRS reverse/vertical tests. This is a controlled A/B source-identical comparison, NOT a verified fix. Do not weaken the existing swipe requirements or claim READY. Production main frozen.


## 16 November 2026 — isolate native emulator preflight from swipe (CI pending)
Restoration of e538 source passed full regression CI 43970182830 and debug APK build 43970182737, but emulator 43970182876 still failed: touchstart=1, touchmove=4, **touchcancel=1**, touchend=0. Read the only changed pre-forward-swipe test sequence versus green e538: new ADB `input tap` at the exact subsequent swipe coordinate, followed ~200ms later by a swipe. Android may interpret second touch as double-tap-drag zoom and cancel app stream. The emulator harness now waits 800ms after focus preflight and asserts GW2 remains active. This is a **hypothesis pending exact emulator run**, not proven root cause. App gesture/CSS remain precisely the earlier tested e538 blobs; no production change. If the run still fails, investigate device event stream and WebView viewport rather than assuming success. NOT READY.


## 16 November 2026 — restore native-tested swipe geometry; expanded emulator suite PENDING
**STATUS: IN PROGRESS, not release-ready.** Latest Android 35 CI 43969237871 failed at touchcancel=1/touchend=0 during GW2→OSRS horizontal drag; full browser and preview APK checks at effefc86 passed, which did not catch this. Compared e538b648 (full source, APK and native emulator green at 43965081086/43965081112/43965081137) against current HEAD. Subsequent source changes to app/dual-hub.css and app/dual-hub.js made the outgoing panel position:relative and moved pointer capture before scene creation. These experiments introduced a touch-stream regression; restore exactly those two files from the earlier emulator-passing SHA while **preserving the expanded reverse-swipe and vertical-scroll emulator tests**. Next confirm exact GitHub Actions. This revert is NOT yet verified at this checkpoint; if further failure appears, record and diagnose without weakening touch assertions. Production main unchanged 097f012. DRAFT PR #65; no deployment. NOT READY FOR IMPLEMENT.


## 16 November 2026 — actual Android WebView swipe recovery VERIFIED on emulator
**BATCH: GE-03/GE-08. STATUS: TESTED increment, overall IN PROGRESS; NOT READY FOR IMPLEMENT.**
Protected exact implementation `e538b648d1d2d48eb360b8615f7fbd8707b73486`, PR #65 draft. Exact-source [full regression CI 43965081086](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43965081086) PASS, [Android preview build 43965081112](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43965081112) PASS, and **real Android 35 emulator WebView [run 43965081137](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43965081137) PASS**. Evidence artifact [14277315133](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43965081137/artifacts/14277315133) contains raw JSON plus GW2 portrait, OSRS native-swipe, landscape and resumed screenshots.
**Root cause:** Before the change, an Android ADB horizontal swipe on the GW2 recommendation card generated touchstart=1, touchmove=4, touchcancel=1, touchend=0 and never switched games. Moving panels had `pointer-events:none`, invalidating the original touch target. `app/dual-hub.css` now retains pointer events during compositor transition; the receiving panel remains inert and drag-click guards remain. Repeat trace: start=1, move=4, **end=1, cancel=0**; actual GW2→OSRS switch succeeded. Landscape rotation and HOME/resume preserved the same WebView JS document and OSRS selection. Native preview package `com.goldenhub.dual.preview` is separate from the owner's installed app; no production credential, backend, D1 or account data was exercised.
An earlier emulator attempt [43962176115](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43962176115) failed due unsupported Playwright browser-level CDP commands; page-level CDP correction `b643ca4` advanced to genuine gesture test [43963187603](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43963187603), which exposed the real touch cancellation. Both failures were retained; successful run is evidence of a tested correction, not a fabricated first-pass result.
**Production freeze verified:** read-only main still `097f012c1f912411790dd7dce21434a9cdc497d2`; no merge, production deploy, APK replacement, user storage/Worker/D1 or collector changes. **NEXT:** further physical installed-Android performance/touch/back/backup/accessibility QA; fully independent synthetic Cloudflare staging; deeper error/chart visual review; frozen integrated RC and tested release/rollback. Phone and staging gates remain OPEN.


## 16 November 2026 — isolated Android emulator acceptance attempt (CI PENDING)
**Previous exact green candidate-lock source:** 2b1e436c5e63843b93018eacf8087ce71da92592, [full CI 43960570264 PASS](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43960570264) and [Android preview build 43960570183 PASS](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43960570183). Subsequent CI wiring for offline lock was added in separate preceding commit b589ee8; check its run. This batch adds a separate Android 35 emulator workflow with a pinned Action, independent debug package, native adb swipe, rotation, resume, screenshots and JSON. Debug-only WebView CDP has no release permissions. **Do not mark TESTED until new exact emulator run passes**; physical device and original installed package remain unverified. Production/Cloudflare/collector unchanged. Overall NOT READY FOR IMPLEMENT.


## 16 November 2026 — offline candidate-lock green + local Git identity hardening
**Last fully verified exact source** 10a32e1208e42a263aad7d640cd6d4982d5ef765: [full regression CI 43959179383 PASS](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43959179383), [Android preview build 43959179409 PASS](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43959179409). Offline candidate lock and seven synthetic tests are TESTED. New follow-on implementation now also verifies checkout HEAD/tree and a clean Git working tree, and confines candidate metadata to artifacts/; eight-case gate awaits new exact CI. The tool has no deploy function. No main/Cloudflare/account/installed-app change. Staging, native runtime and rollback still OPEN; **NOT READY FOR IMPLEMENT**.


## 16 November 2026 — candidate-lock preflight code (CI PENDING)
Introduced a deterministic offline source/asset/lockfile fingerprint and main-drift verification script with seven synthetic regression tests. It includes app/_headers as deploy configuration. This is **GE-09/10 preparatory implementation only**, not staging, release, mobile performance evidence or readiness. Full PR CI still pending. Main/Cloudflare/installed APK must remain untouched.


## 16 November 2026 — GW2 Delivery Box first, trade guidance immediately after · verified
**Newest code:** `e178eabc07c50ab5dc46566e0d68e247fb662af8` on protected `feature/golden-experience`; [full CI 43955710086 PASS](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43955710086), [separate Android build 43955710065 PASS](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43955710065). A material GW2 mobile first-screen hierarchy correction: full-width Delivery Box hero remains the first financial instrument; the currently qualified recommendation follows it as a sibling and shows item name plus first buy instruction within a 390×844 phone viewport. Wallet/today/7-day readouts, Delivery Box detail drawer, charts, orders, official 70px item artwork and ledger are retained below. The trade identity now uses a compact icon+title row. No wallet/trade/profit calculations or APIs changed. The initial nested-grid attempt `cdd11bf` and first repair `7fdbf4f` failed browser CI due to nested metric-count/overlapping grid/artwork constraints; **do not use those as acceptance checkpoints**. Correct source `e178eabc07c50ab5dc46566e0d68e247fb662af8` passes browser, touch/swipe/200%-text, startup and retained-session audits and APK source-integrity packaging. The app **has not been installed or verified on physical Android**; isolated synthetic staging and release/rollback remain open. PR #65 stays **DRAFT**, main `097f012c1f912411790dd7dce21434a9cdc497d2` untouched. **OVERALL IN PROGRESS, NOT READY FOR IMPLEMENT.**


## 16 November 2026 — OSRS first-screen action hierarchy verified
**Verified source:** `e654b1d496e8582c9176a2cd5db29506842e5d4f`, [full CI 43944884562 PASS](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43944884562), separate [Android preview CI 43944884652 PASS](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43944884652). On a synthetic **390×844** phone viewport the existing OSRS trade instrument now follows the identity fascia directly and contains the original liquid/high-value market mode controls above the item. Measured card top **325.53px**, item name top **576.31px**, whole first buy instruction **763.55–816.86px**, visible without scrolling. Budget, realised figures, market-status evidence, search/filters, charts, owned-sale ledger and OSRS backup remain in the DOM and test suite. First implementation `d9fec38` failed CI 43943953280 because the swipe test touched hard-coded y=690 (no longer inside the scroller); `e654b1d` selects a verified visible contact point and requires real native vertical scrolling without document movement. Screenshot artifact **14264082706**, `audit/golden-experience/states/osrs-action-first-390.png`. No production app/site change; DRAFT PR #65; production main `097f012c1f912411790dd7dce21434a9cdc497d2`. **OVERALL NOT READY FOR IMPLEMENT.**


## 16 November 2026 — separate native preview APK built and source-locked
**Newest verified executable source:** `bf84c76e5d4ad68c99cd3fafa3c1235777a4e9e8`; [full cross-game CI 43941763243 PASS](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43941763243) AND [separate Android build 43941763186 PASS](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43941763186). Native workflow verified compilation, unit tests, Android lint, distinct package `com.goldenhub.dual.preview`, APK signing and **37 bundled frontend files byte-for-byte matching checked-out source** (APK SHA-256 `545e9f9773a2a34413e0321fcb8d4e3c60f937d2c7be167d9175070743f463aa`, artifact 14263147726). `NavigationPolicy.isBundledFrontendAsset` and `MainActivity` now refuse silent remote fallback for missing packaged HTML/JS/CSS/manifest or icon files; dynamic market/account API endpoints still use network. The previous full source/CI and finance/gesture checks are preserved. This does **NOT** mean physically Android-tested or production-compatible/signable. PR #65 remains DRAFT; production main `097f012c1f912411790dd7dce21434a9cdc497d2` remains frozen. **NOT READY FOR IMPLEMENT.** See ANDROID-PREVIEW-BUILD.md.


## 16 November 2026 — GW2 financial workspaces verified and retained
**Latest code** `4e9574fa0d226ca539db90701b17b2d1d6af30af` [full CI 43935010936 PASS](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43935010936). Previous source `3934db49390c934bb0f982559bf8c6b3df4b2372` [CI 43934107914 PASS](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43934107914). GW2 Today operating book and trading outlook now retain their DOM/buttons across six unchanged refreshes; in-place changes to conditional market profit or unallocated capital still invalidate and update exact displayed figures. The outlook labels overnight returns explicitly **conditional on execution**, never realised/given profit. Full browser/retention/startup regression green; **native Android timing and independent synthetic Cloudflare staging NOT complete**. Feature PR #65 DRAFT, main `097f012c1f912411790dd7dce21434a9cdc497d2` unmodified. **NOT READY FOR IMPLEMENT.**


## 16 November 2026 — verified GW2 next-action DOM retention
**CHECKPOINT SOURCE:** `66eb0b9a4b4cf070b614b82ad565f810f4282010` passed [full CI 43922372800](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43922372800). PR #65 remains **DRAFT**, production main `097f012c1f912411790dd7dce21434a9cdc497d2` unchanged. The GW2 Today action card and action button now stay mounted over six identical refreshes, while changed Delivery Box/account data updates the actual recommendation in place. Latest executable regression: `tests/browser.cjs`. The first attempt `0f91bbe` failed because a prior `replaceChildren()` in `renderToday()` still removed the card; corrective commit `66eb0b9a4b4cf070b614b82ad565f810f4282010` removes it and the exact full suite is GREEN. No production deployment or native APK update. **Overall still IN PROGRESS — NOT READY FOR IMPLEMENT.**


## 16 November 2026 — newest tested accessibility and financial-action checkpoint
**STATUS: VERIFIED incremental GE-02/GE-08 sub-batch, overall IN PROGRESS; NOT READY FOR IMPLEMENT.**
Exact source `9e6bf9e589c4fbe0d9037257e3e9590a01016ab1` on draft PR #65 passed complete [CI 43913882902](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43913882902), screenshot artifact **14248134183**. Source only `app/dual-hub.css` and browser test `tests/golden-experience-states.browser.cjs` changed in this latest visual batch. Baseline/main independently verified unchanged `097f012c1f912411790dd7dce21434a9cdc497d2`; no prod deployment/merger, APK/signing, Cloudflare Worker/D1/collector, key or account data change.
The OSRS trade canvas now scales with accessibility type: 320x740 **normal root 16px -> 570px canvas**, **24px root -> 840px**, **32px root/200% -> 1040px**. The full first buy instruction, including precise GP amount, fits before the fixed action dock at 200%: measured inner pane 834.03px; first instruction bottom 765.81px. Essential OSRS evidence font 22px and observed value-tier qualifier 20px. No page horizontal overflow (320/320px). Exact figures and next/previous controls remain intact, item details scroll separately, whole cross-game UI/regressions pass. Actual before/after 200%-font screenshot reviewed: prior 900px card showed only part of the buy price; strict whole-instruction assertion introduced and passed after 1040px cap. A previous failed CI [43912398962](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43912398962) detected a real partial-price visibility regression; the latest green exact-source run resolves it rather than weakening the assertion.
Previous same-turn verified work also includes OSRS inner-scroll reset on new item, action-first research hierarchy, and deferral of supplemental Wiki stats during rapid navigation. Latest synthetic 40 Next/Previous cycles produced one optional Wiki stats fetch; no trade-engine, fees, ledger, market truth or GW2 account mutation.
**FIRST OPEN:** continue visual refinement at deep OSRS/GW2/error/chart and 200% text states; actual physical Android WebView FPS/touch-to-paint/rotation/resume/memory, isolated synthetic-only staging and GE-09 integrated candidate / GE-10 rollback/readiness are still **NOT VERIFIED**. Production frozen until complete readiness report and owner's later explicit **Implement**.

## 16 November 2026 — full development RESUMED; latest verified Golden Experience
**OWNER AUTHORITY:** The earlier safe-partial-release request was explicitly withdrawn: “Ignore my release request, continue development.” PR #65 conversation comment 6921040309 records the superseding instruction. All full-design development continues exclusively on protected branch `feature/golden-experience`, PR remains **DRAFT**. No production website/Android APK/Cloudflare Workers/D1/collector/account/credentials touched; production `main` checked unchanged at `097f012c1f912411790dd7dce21434a9cdc497d2`. **No implementation before completed final readiness report and owner's later explicit “Implement”.**

**Latest exact source** `93e7aa9184072f275121fabb513b01d567deb929` passed full CI [43902534973](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43902534973) **SUCCESS**: source/Python/JS, ten synthetic browser suites and 16-state visual matrix, chart/swipe/ledger/backup, CPU/startup profiling, four synthetic 100-cycle session probes and actionlint. Prior sub-batches passed CI 43899171142, 43900114372 and 43901563581. The 43901563581 screenshot artifact **14241952075** includes realistic empty OSRS/GW2 mobile states, extreme synthetic item-name stress at 320px / 200%-text, and dense GW2 advanced views; screenshots were visually inspected. It does **not** establish native Android FPS/performance or live account correctness.

**Actual latest improvements:**
- `app/focus-edition.js` memoizes only *unchanged* GW2 Advanced Today wallet/week coin artwork, retaining live DOM/decoded images across repetitive account re-renders, while a real amount change immediately invalidates only the appropriate figure. Plain status labels avoid redundant text replacement.
- `app/dual-hub.css` allows even artificially unbroken long GW2/OSRS item names and populated GW2 research-row labels to wrap at 320px/200% text rather than clip or force horizontal page overflow; preserves official rarity/value-tier colouring and exact names.
- `app/dual-hub.js` marks OSRS nested trade detail as a named keyboard-focusable scroll region, retaining the stationary action dock and original native touch/sideways game swipe logic. `tests/golden-experience.browser.cjs` proves keyboard PageDown works, a synthetic title's final glyph is reachable by scrolling the inner region and a game swap is not falsely triggered.
- A concurrent feature commit `93e7aa91` resets OSRS inner recommendation scroll to **top** when choosing another idea (not on ordinary in-card scrolling), with regression in `tests/golden-experience-states.browser.cjs`. This aligns with the owner’s reset-to-beginning preference. Full combined CI passed.
- New browser tests assert six unchanged real GW2 wallet/week icon nodes stay mounted, updated wallet and week amounts repaint, large item-name geometry fits within both cards, and inner OSRS content is reachable without hiding persistent buttons.

**Truth/remaining gates:** The OSRS title may not fit *simultaneously* into a finite-height research viewport, by design, but the complete title can be read by scrolling. No fake quote, predicted fill or profit is asserted from verified feed status. Physical Android WebView startup/press/FPS/rotation/background resume and original installed APK compatibility remain unverified, as do isolated staging, integrated release candidate and rollback rehearsal. **IN PROGRESS — NOT READY FOR IMPLEMENT.**


## 16 November 2026 — GE-02 200%-font GW2 status correction (newest)
**TESTED incremental fix; overall IN PROGRESS, NOT READY FOR IMPLEMENT.**
Exact source `df9ba69b4a8eb2bf6dc4a81b9ba10225eeddbd1c` passed full [CI 43891226109](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43891226109) including the ten browser programs, rendered mobile/200%-text font and viewport assertions, full source/Python/JS, touch/chart/ledger/backup, synthetic cold/retention and actionlint. Screenshot artifact **14237111960**. Manual review of 390px/200%-font populated GW2 advanced screenshot confirms the previously oversized secondary research notice and action are now bounded/readable without hiding any text; exact GW2 financial figures remain unchanged and large. Changed `app/dual-hub.css` and `tests/browser.cjs`, no engine changes or new assets/dependencies. The earlier note below identifies the *prior* screenshot defect; this latest source corrects it.
Open: further populated-state pixel polish, hardware WebView touch/FPS/battery/lifecycle, uncommon long financial values, isolated staging and rollback. Main remains `097f012c1f912411790dd7dce21434a9cdc497d2` at preflight; PR #65 draft, not merged or deployed. Do not call READY FOR IMPLEMENT.

## GE-02 cross-game deep-tool finishing — 16 November 2026 (latest)
**TESTED incremental implementation, NOT fully VERIFIED and NOT READY FOR IMPLEMENT.**
Protected branch `feature/golden-experience`, draft PR #65; exact tested source `d76ed0fd43200b4b9ea1eb5d0b4242a16437c740`, production main `097f012c1f912411790dd7dce21434a9cdc497d2` unchanged at preflight. Three successive full green CI runs:
- [43886786971](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43886786971) at `20a217ef`: premium OSRS research, real-observation vs hypothetical-order price cards, item stats, settings/ledgers, 320px enlarged-font owned sale geometry. Screenshot 14235586167.
- [43888028689](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43888028689) at `1d7943f`: title/quantity separation and sale control; screenshot 14235782831.
- [43889263582](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43889263582) at `d76ed0fd43200b4b9ea1eb5d0b4242a16437c740`: populated GW2 advanced research rows, 390px font geometry and 200%-text screenshot; artifact 14235738208.
Source changes are scoped static CSS `app/dual-hub.css`, rendered browser tests `tests/golden-experience-states.browser.cjs` and `tests/browser.cjs`. Source/Python/JavaScript, ten assembled browser suites, charts/swipes, data/backup, 16 visual states, synthetic startup profiling, four 100-cycle retention probes and actionlint passed. **These are synthetic Chromium results, not Android physical measurements.** No production deploy/merge/Worker/D1/collector changes, APK, origin, signing, storage or engine changes.
**QA:** reviewed populated research and OSRS saved-sale screenshots. OSRS quantity/name collision fixed. GW2 enlarged-font research labels improve, but the 200%-text advanced status paragraph becomes extremely tall (open visual defect); no full artistic approval.
**Original APK:** read-only inspected earlier user Library archive `Golden_Peanut_Android_Installer.apk`; it is a 3,538-byte WebView APK with package `com.thegoldenpeanut.mobile` and existing production URL. SHA-256 `1102ab605e606ad6a81839f12f0be608f237cb40e20342ab162b30fb0c962ec5`, signer fingerprint in `ANDROID-ORIGINAL.md`. NOT proof current installed version or possession of signing key. No APK changes authorised.
**NEXT:** correct oversized GW2 200% advanced status without clipping, long names/advanced error-chart/form states, real Android lifecycle/touch performance and installer provenance; prepare separate synthetic staging, frozen RC and rehearsed rollback. GE-09/10 not started.

## 16 November 2026 — GE-02/07/08 responsive financial and repaint review (newest)
**STATUS: TESTED incremental sub-batch, NOT FULLY VERIFIED, NOT READY FOR IMPLEMENT.**
Exact feature source `8662a06c61721443f419a9a4d4207bf4c5360e23` passed full PR [CI 43882425654](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43882425654) including source+Python+JS checks, all ten browser programs, synthetic touch navigation, 16-state visual matrix, OSRS and GW2 account/ledger/backup fixtures, cold profiling, 100-cycle and three repeated 100-cycle retained-session probes, and actionlint. Visual screenshot artifact ID **14233731101**. Draft PR #65, production main remained `097f012c1f912411790dd7dce21434a9cdc497d2` after successful run; no live deploy, production data/worker changes, native package changes or signing migration.
**New implementation, not only documentation:**
- `app/dual-hub.css`: the secondary financial readouts in both game desks now use rem-aware responsive grid sizing. 390px default typography remains compact; enlarged Android-like typography stacks into usable full-width gauges. GW2 seven-day readout corrected from a visually observed oversized flex-column bug into a compact flex-row wrapping layout, with a strict measured-height and flex-direction screenshot guard.
- `app/dual-hub.css`: extremely prominent OSRS manually entered trading-budget figure uses bounded narrow-screen typography, preserving the exact `250,000,000 gp` without separating its final digit on a second line at 320px/24px-font test size.
- `app/focus-edition.js`: seven-day GW2 historical currency artwork/DOM no longer rebuilds when its seven displayed date/amount pairs are unchanged; it still updates verified changed profit, midnight rollover and verification state. Test asserts DOM/coin-asset identity, scroll preservation and a real changed historical day.
- `tests/golden-experience.browser.cjs`, `tests/golden-experience-states.browser.cjs`, `tests/browser.cjs`: enforce correct card stacking/compactness, exact budget number visual fragment, and repaints of authentic changes. Screenshot evidence starts at scroll-top to avoid a sticky navigation overlap caused by capture position.
**Manual QA:** reviewed 390px normal vs 200% GW2 and 320px enlarged OSRS screenshots. Caught and fixed a large unwanted empty GW2 seven-day card despite earlier green overflow tests. New screenshot changes are test-only; avoid attributing improved rendered performance to the test itself. Tests are synthetic headless Chromium, not Android hardware FPS/memory/battery evidence.
**Still OPEN:** full rich OSRS/GW2 advanced UI visual consistency and extreme large quantities, Android touch-to-paint/lifecycle testing, source-compatible Android wrapper/signer, isolated staged preview/rollback rehearsal, GE-09 integrated candidate and GE-10 readiness gate. Never tell owner to say “Implement” before those gates are met.
**Next action:** review newest artifact's advanced/detail/long-title screenshots, improve deep-tool finishing and measured long-history chart/scroll performance, prepare fully isolated static staging with synthetic data only when production triggers/bindings can be proven safe.


## 16 November 2026 — latest protected visual and synthetic data checkpoint
**STATUS: IN PROGRESS; latest implementation TESTED, not READY FOR IMPLEMENT.**
- Branch `feature/golden-experience`, draft PR #65, source `4e377852dab66d837b86f6c4b112a8560c3f33a5`. [CI 43877907764](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43877907764) **SUCCESS**. Production main independently checked unchanged at `097f012c1f912411790dd7dce21434a9cdc497d2`; no deploy, merge, Cloudflare/worker/D1, native APK, data or signing change.
- GE-01/02 visual: developed scoped premium instrument fascia, substantial financial hero/readouts, sculpted recommendation housing, GW2/OSRS differentiated identities; latest CSS commit adds more cohesive GW2 advanced instrument surfaces and a bounded layout at 200%-font zoom. The revised UI is much more visually distinct than the previous flat stack. It is still one *reviewed design iteration*, not final pixel-perfect acceptance.
- GE-08 visual: `tests/browser.cjs` now captures **populated synthetic GW2** (8 Delivery Box item types, FIFO ledger, guided view, enlarged font and advanced desk) alongside standard 16-state screenshots. CI screenshot artifact **14231456749** on latest green run. Tests and screenshot capture do not equal real-user acceptance or prove Android physical FPS.
- GE-07 diagnostics: intermittent +39 DOM node jump identified precisely as **initial lazy GW2 Focus Today mount** (seven-day week strip and account summaries). The synthetic retention probe now explicitly paints that panel **before** beginning its 100-cycle retained-session measurement, records that one-time mount separately and keeps the same +10 DOM-growth failure limit afterward. CI 43877197639 was green for the diagnostic code, and CI 43877907764 green for current CSS. **Not proof of zero Android leak, smoothness or long-duration RAM behaviour.** Avoid calling initial intended mount a retained leak; continue real lifecycle/large-account tests.
- Remaining GE-02/03/04/05/07/08: evaluate visually dense advanced forms, error/slow/offline screens, OSRS long titles, huge amounts at enlarged fonts, native device press/swipe/rotation/resume/scroll/CPU/memory and all timing distributions. GE-09 isolated staging is TODO; GE-10 frozen integrated RC, release/rollback rehearsal are TODO. Entire project remains protected until owner says **Implement** after verified readiness.
**Next action:** review populated screenshots from artifact 14231456749 against DESIGN-ACCEPTANCE.md; refine concrete dense screen problems without weakening official colours, accounting, touch controls or performance. Build isolated staging only with proven separation from production. Keep PR draft.


## GE-01/02 premium instrument-face visual pass — 16 November 2026 (latest)
**STATUS: TESTED visual/functional sub-batch, NOT RELEASE-READY.** Development branch `feature/golden-experience`, draft PR #65. Fully-tested current head `27169f6e9dbdb2fe3ea73bb6828881db45631b1b` on [CI 43874452456](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43874452456): source checks, 56 Python/129 JavaScript tests, ten browser programs including populated-account/ledger/backup workflows, synthetic swipes with contact hit-testing, paired CPU profiler, four 100-cycle retained-session probes and actionlint PASS. CI visual PNG artifact **14230105976** contains 16 viewport/font/game screenshots, plus other fixture screenshots. Actual screenshots at 390 portrait, 320/200%-text and 844 landscape were visually inspected, not just presence-tested. No actual Android/WebView hardware benchmark.
**New unmistakable visual composition:** CSS-scoped game-specific engraved fascia and identity markings, restrained metallic materials, one featured full-width financial gauge, intentional supporting metric grid (GW2 no dangling half-card), top-strip recommendation panel/index plaque, precise navigation dock and static game-specific surfaces. Approximately 11.4 KB stylesheet addition; zero third-party assets, no JS animation/gesture changes, no financial/data computation or API change. Existing dynamic DOM retention optimisations from preceding tested batch remain. The screenshot preview is **synthetic development** and GW2 unconnected—NOT representative of fully populated account data or production.
**Swipe regression diagnosis:** the larger header displaced old tests' absolute y=350/420px touch coordinates into form controls, where swipes must correctly be blocked. Adapted test to assert actual rendered, noninteractive recommendation/scroller contact points and preserve strict no-jump/finger-following/no-active-drag-write assertions. Early attempts failed as expected; exact head CI above is GREEN. This does not prove physical touch feel or FPS.
**Unresolved:** intermittent late first GW2 render after 25–50 navigation cycles adds 39 DOM descendants in `#focus-today` (28 week-strip descendants, 5 next-action); its timing sometimes fails a premature 100-cycle baseline. New id-scoped diagnostics capture the source, but root cause, lifetime-memory impact and stabilization gate still need resolution. Complete populated GW2 visual/a11y and advanced flows, real Android/WebView, isolated staging, full integrated candidate and controlled release/rollback remain OPEN. No READY FOR IMPLEMENT statement.
**Production freeze verified:** GitHub `main` remains `097f012c1f912411790dd7dce21434a9cdc497d2`, PR remains draft. No Golden Experience main merge, Pages deployment, Android update, production credentials/DB/Worker/collector, data or origin change. No live URL readback on this continuation. Owner has not authorised “Implement.”
**Next concrete action:** synthetic populated GW2 account + rich Delivery Box and OSRS long-title screenshots/QA, improve final premium hierarchy without regression, resolve late GW2 async mount, then Android and isolated staging gates. Never declare entire release ready on this synthetic pass.


## GE-07 repeated-session verification — 16 November 2026
STATUS: TESTED sub-batch, NOT VERIFIED on Android and NOT READY FOR IMPLEMENT.
CI [43860812627](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43860812627) passed on development commit `889f383d83c1ce511830463f42cb4bbe8a998a63`. In addition to the complete source/Python/JavaScript/10-program browser baseline, CPU cold profiler and actionlint, it passed the original 100-cycle retained-session test AND three separate extra 100-cycle repetitions (400 cycles across four independent synthetic Chromium sessions). Each repetition keeps strict DOM-growth, chart-cache, error and ledger-continuity assertions and writes its own report. Production main remained `097f012c1f912411790dd7dce21434a9cdc497d2`; PR #65 stayed draft, no deploy/merge/Cloudflare/worker/data/APK change.
Earlier intermittent failure in [43854807834](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43854807834) remains OPEN because four green synthetic repeats do not identify its cause. Failure-only subtree/tag diagnostics remain installed. Still needed: targeted quantitative scroll/large-history charts/press-contact-to-paint and physical Android WebView, comprehensive populated GW2/accessibility, staging, frozen release and rollback rehearsal. This continuation modified only CI workflow/tests/docs; runtime assets remain at tested implementation `51e95269e3cbfd5873e9772539160f8ef28bafc9`.
Checkpoint: `git log -1 -- docs/golden-experience/STATE.md`. Do not merge or deploy before final readiness report plus owner "Implement".


## 16 November: GE-08 OSRS user-state extension (latest)

IN PROGRESS, production protected. New `tests/golden-experience-states.browser.cjs` added to the full `npm run test:browser` script; original nine browser programs preserved (ten total). Exact tested source `c803e4fa5ba269a6bc248d69820a6389555a970a`. PR CI [43857515705](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43857515705) PASS including source/Python/JS/ten browser programs, paired cold profile, 100-cycle retention, actionlint. Screenshots reviewed. New test verifies 40 ranked recommendation round trips, member budget/settings, 320px 24px fonts without overflow, durable recorded purchase with zero realised profit, cross-game continuity, mapping API outage without ledger loss, and verified retry. Synthetic navigation click-handler p95 1.7ms, NOT physical press. Previous test-only rank assumption failure [43857095493](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43857095493) was fixed without trading engine changes. See `VISUAL-QA.md`. GE-07 intermittent DOM growth and native/staging/release gates remain OPEN. No runtime app files changed in this continuation. Latest main GitHub 097f012; PR draft. DO NOT MERGE OR DEPLOY.


## GE-07 continuation — 16 November 2026, protected branch
**STATUS IN PROGRESS — NO RELEASE AUTHORITY.** Added CPU-sampled paired OSRS cold-start tool `scripts/profile_golden_experience_cold.cjs` and read-only PR CI step; no web/runtime asset, ledger, account, Android, Cloudflare or production configuration change. Both 6+6 paired CPU profiling runs succeeded.
CI [43854807834](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43854807834) FAILED in the subsequent 100-cycle retention assertion (>10 DOM nodes); diagnostic instrumentation was added, without weakening that gate. Follow-up exact-branch PR CI [43855536154](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43855536154) PASSED full baseline, cold profiler, 100-cycle retention and actionlint. An intermittent node-growth issue is not closed by one green rerun.
Measured profiler readiness median baseline→candidate 288.6→281.6 ms (first job) and 357→343.4 ms (second); maxima 365.1→321.6 and 387.4→361.1 ms. Sampling and runner variation prevent definitive native speed claims. Dominant sampled work was browser startup/program/idle; no isolated OSRS trading algorithm bottleneck proven. Exact synthetic summary/hotspots in [evidence](evidence/osrs-cold-cpu-paired-20261116.json); full raw probe JSON stored in job artifacts. Separate earlier comparable no-profiler benchmark remains authoritative for broader before/after.
Branch after this checkpoint: discover with `git log -1 -- docs/golden-experience/STATE.md`; last observed GitHub main 097f012. Live hostname was not independently accessible in this connector session; earlier Cloudflare live verification remains recorded in ISOLATION.md. Do not imply new live readback. Draft PR #65 is NOT to be merged or auto-merged.
**FIRST UNFINISHED:** reproduce and diagnose intermittent retention node growth using saved subtree/tag diagnostics on failure, then measure press, scroll, item-navigation, large-history and long-duration performance, close visual/a11y matrix and representative Android/staging/release gates. No READY FOR IMPLEMENT declaration.


Date: 2026-11-16. STATUS: IN PROGRESS. Release incomplete; no implementation approval.
Branch: `feature/golden-experience`. Draft PR: https://github.com/tnolanwood-rgb/golden-peanut-data/pull/65
DO NOT MERGE / DEPLOY / ENABLE AUTO-MERGE. Historical global audit release authority
is superseded by this project's production freeze. Global audit files are untouched.

Tested implementation: `51e95269e3cbfd5873e9772539160f8ef28bafc9`.
Source tree: `181340c1cc538feedd27f6e7034b60fdf8e8a656`.
Checkpoint commit: `git log -1 -- docs/golden-experience/STATE.md`.
This identifies intermediate tested code, NOT a frozen release candidate.
Base/main/live production: `097f012c1f912411790dd7dce21434a9cdc497d2`.

## Completed tested source batches

- Permanent BRIEF, preservation map, roadmap, decisions, tests, performance/release
  documents and resumable checkpoints. Production isolation inspected before branch.
- Shared design tokens/surfaces/type/spacing/focus/press response for both desks;
  Delivery Box hierarchy retained; official colours, currencies and framed icons
  preserved. Premium layer is appended to dual-hub.css, avoiding an extra stylesheet
  request. No new runtime dependency, storage schema or native requirement.
- Both SVG chart engines coalesce pointer work to one render per animation frame,
  cache gesture geometry and avoid point selection on cancel. Exact data/windows
  preserved. Adaptive canvas widths keep tested phone axes >=12px; exact tap mapping,
  stable loading modal and cached OSRS reopen tested.
- Successful manual OSRS fill feedback remains visible after the form closes and
  only appears after durable validated save. Existing duplicate guard/FIFO/tax and
  purchase-vs-realised wording preserved. No in-game actions introduced.

## Evidence and limits

Full original and each implementation baseline passed source, 56 Python, 129 JS
and all NINE current browser programs. Final local report: evidence/consolidated-checks.json.
Asset hashes and unchanged dependency lock: evidence/implementation-identity.json.
16 game/viewport/font/reduced-motion states plus chart loading/cache/axes, keyboard,
financial contrast, touch targets, overflow, lifecycle/backup/owned-sale/stats tests.
Reviewed main desks, narrow doubled-font OSRS, phone charts and advanced GW2 entry.
All principal populated-account/forms/error/research states are not yet accepted.

Both original/current sources passed 26 swipe cases at 4× Chromium CPU throttle,
zero visible Y discontinuity and no active-drag content mutation/storage writes.
60-event chart burst: 40 OSRS /35 GW2 rebuilds before, one each after, exact final
windows unchanged. These are synthetic browser measures, NEVER phone FPS claims.
100 accelerated cached-navigation cycles: DOM961 throughout, one request/feed,
continuity sentinel retained, no ledger writes/errors; explicit-GC heap +~5%.
No hours-long memory, real WebView, CPU/battery or hardware lifecycle proof.

Corrected serial 10 cold +10 warm runs/game, identical asset interception:
ready median/p95 ms baseline→current: GW2 cold611/797→550/674, warm230/293→244/305;
OSRS cold671/726→645/798, warm190/311→198/307. Mixed tails: no universal speed or
no-regression claim. OSRS cold p95 needs follow-up profiling. p95/p99 choose the
maximum at n=10; GW2 useful-content measure is the unconnected desk shell only.
All raw samples/hashes/conditions committed; old exploratory results are superseded.

CI: exact tested implementation 51e9526 passed run 43852759439 (all source/Python/JS/
nine browser programs, repeated-session probe and actionlint). Full step evidence:
evidence/ci-51e9526.json. A documentation-only checkpoint follows that tested source;
no runtime assets changed. Check the PR's latest actual checks on resume.

## Isolation and production verification

All eleven Actions inspected. Feature pushes match no deploy trigger. Read-only
Cloudflare run 43851667207 confirms production main, source_type=null, no listed
preview/production D1/KV/R2/service/durable-object/environment bindings; all deploy
steps skipped. Sanitized evidence committed. No production deployment, merge,
release-request edit, private-data access, original APK/origin/storage alteration,
Worker/D1/collector/monitor configuration change. Protected paths diff empty.
Latest main and live build-info still identify097f012. Separate staging not created.

## First unfinished work and blockers

1. GE-07: profile/trace repeated OSRS cold-start tail with identical/rerandomized
   conditions; measure press p95, navigation/scroll/large-history chart costs and
   longer memory behavior. Keep distributions/limitations, no cosmetic workaround.
2. GE-02/03/08: complete populated-account, expanded Delivery Box, forms, errors,
   research/settings/history/backup and chart visual/accessibility acceptance at
   small/large/landscape/large-font/reduced-motion/slow/offline states. Existing
   trading workflows remain; do not rewrite engines or existing swipe fixes.
3. BLOCKED hardware: original installed Android WebView cold/warm/resume/rotation/
   process restoration/Back/long-session tests and real device performance. No adb,
   emulator, original package/signer or physical device available in this session.
4. GE-09/10: distinct synthetic staging project without private bindings/write
   access; integrate main fixes, complete acceptance, freeze exact candidate and
   prepare/rehearse controlled release/rollback/live verification. Not yet done.

Haptics are not enabled; repository QA wrapper has no vibration permission/bridge,
original wrapper support unverified. Preserve graceful no-haptics with no APK or
permission change. OSRS v4 parity/import and real-world calibration remain separate
unfinished audit work, not silently included or declared solved.
