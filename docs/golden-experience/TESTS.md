## 18 Nov — chunked worker native performance result and remaining test correction
Native run 44403468977 / artifact 14472878310 on `f0bd32b8`: all nine checks pass, zero long tasks; first-render/startup LoAF blocking 10ms and 33ms, gesture LoAF blocking 0ms. AOSP screenshots black; no physical-phone claim. Regression audit 44403469047: source, Python and browser verified; JS had one remaining assertion error because warm reload retains the two initial bounded writes. Corrected to assert cumulative count remains two. Exact-candidate rerun pending.

## 18 Nov 2026 — bounded-worker candidate audit found a missing helper; restoring it
The first chunked-worker candidate `491e85b5` triggered all three workflows. Preview APK packaging succeeded. The regression audit failed in the browser test stage because the helper replacement accidentally removed the existing `parseOwn` full-catalogue parser; the resulting repeated `parseOwn is not defined` errors are a real regression, not a test-only failure. Restored the original validated parser without changing its semantics. Re-run CI and native QA are required before accepting the chunked-worker change.

## 18 Nov — second worker diagnosis and bounded chunk follow-up
Native 44402383543 / artifact 14472881931: all nine functional checks passed, but a 1,707ms `Worker.onmessage` long task remained. Root cause: full 40k-row object was sent as one structured-clone message and then parsed into a Map / hydrated synchronously. Follow-up changes worker protocol to 250-row chunks, incrementally validates/builds the Map, and calls yielding `hydrateIndex`. CI 44402383428 also exposed two failing tests: a stale single-batch write expectation and a worker test not exercising a chunk protocol. These are corrected in the current candidate; verification pending.

## 18 Nov — worker offload reduced, but did not remove, the native long task
At `fbd59e0`, native 44401725555 artifact 14474096115: all nine native function/lifecycle checks pass, but the main thread still blocks for 1,072ms in `Worker.onmessage`. New test verifies the browser event loop runs between 500-row metadata batches and IndexedDB writes are bounded. This follow-up is pending exact CI and native rerun.

## 18 Nov — public market-index worker / Android latency follow-up (CI pending)
Native run 44055560918 artifact 14316026977: all nine functional checks passed, but one 1,663ms long task followed the successful first swipe. LoAF attribution points to `public-market-feed.js` `Response.json.then`; startup invokes only compact `market_index.json` (1,550,013 bytes) through `loadIndex`. The response URL is not recorded, so exact attribution remains inferential. New worker tests assert browser startup uses the dedicated worker and that missing index never triggers full-catalogue fallback. Full CI and new Android trace are pending; no performance pass claimed.

## Native Android 35 emulator touch ownership VERIFIED — 16 November 2026

## 17 Nov — all automated code + native interaction gates GREEN; visual phone gate remains OPEN
On exact feature runtime source `00665acdfc279bcf57720acbb9c58e849396213c`: full regression [44054851632](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/44054851632) PASS, isolated Android preview build [44054851607](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/44054851607) PASS, Android 35 AOSP ATD native [44054851609](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/44054851609) PASS. All nine native checks passed: cold launch, native window focus, actual native touch diagnostics, GW2→OSRS swipe, OSRS→GW2 swipe inside nested scroll, vertical nested OSRS scroll (>80px) without outer document jump, rotation, Home/resume. Earlier green [44053990881](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/44053990881) recorded scrollTop ~306.67px/bodyY0.
The native suite does NOT certify physical phone, actual original installed APK, smoothness or visual QA; ATD native framebuffer PNGs are solid black. The latest harness detects solid-black PNGs and flags them as unsupported visual evidence. Native first swipe 410ms vs requested 350ms, touchend/cancel correct. PerformanceObserver measured LoAF 1024ms / 967ms blocking with ~6ms endGesture JS and no >=12ms bounding-rect reads. Underlying rendering/scheduling cause unresolved. Full release remains blocked.


## 17 Nov exact-head results: release preflight PASS, native acceptance FAIL
At feature runtime source `80f3857d` the full [CI 44049887597](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/44049887597) PASSED all checks including seven staging-guard cases, four offline rollback-rehearsal tests and candidate source lock. Independent [preview build 44049887575](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/44049887575) PASSED. [AOSP emulator 44049887731](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/44049887731) FAILED: app focused but touchstart=1/move=4/end=0/cancel=1, no switch; ADB nominal 350ms swipe actually lasted 7,671ms, WebView long task 1,504ms. Forward/reverse/vertical/rotation/resume **not accepted** at this source. Keep failure evidence. Production APK/native phone not tested.


## 17 Nov — offline release rehearsal CI and native Android still open
Four local Python cases passed for exact-byte predecessor→candidate→predecessor replay; negative gates reject fabricated revisions, missing required frontend, symlinked Git asset, and output outside ignored artifacts. New mandatory protected PR CI `Rehearse frontend deploy and exact-byte rollback OFFLINE only` PASS in run 44049406065 (full suite separate). This tests local Git-object bytes, **not** hosted Cloudflare live assets/staging or installed Android.
Cloudflare Pages `subdomain` vs custom `domains` correction has seven synthetic tests; the real Pages project is not verified. AOSP Android 35 2-core run 44048617724 FAILED with touchcancel and ~858ms longtask during first swipe; 4-core run 44049406063 FAILED early due system AOSP launcher ANR. Source 80f3857d adds strict single launcher-only recovery. Inspect exact CI for current native outcome, do not report green until screenshot/JSON and touchend/no-cancel + OSRS vertical + rotation/resume all pass.


## 16 Nov 2026 — strict native WebView regression reproduction and release gate
The source/browser+Android APK builds are green at e3314f8 (CI 43977050401, separate build 43977050518). Native Android emulator 43977050512 then passed GW2→OSRS and OSRS→GW2 horizontal swipes with finger pointer capture removed, but failed nested OSRS vertical scroll (scrollTop=0, body scrollY=0). **Native total FAIL, not a certified pass**.
Further exact Android run 43978013622 at 22fdf4b, with hit-tested OSRS vertical fixture, failed earlier at first GW2 swipe: 5 touchmoves, 0 touchends, 1 touchcancel, trace showed ~3-second gap between consecutive events. The interrupted input starts on connected original DIV, computed ancestor touch-action pan-y pinch-zoom and no pointer capture. Root cause remains uncertain; possible emulator input starvation/renderer stall versus cancellation, not proven.
Latest a3af756 harness defers initial GPU/CDP screenshot, records native adb command elapsed time and WebView long tasks; preserve *all* strict native assertions. Latest staging guard test adds missing-domain case. Run exact-head CI and inspect artifacts before marking anything tested. No Android full acceptance or production readiness yet.


## GE-09 Pages staging guard — six synthetic tests
Test module `tests/test_staging_guard.py` checks valid sandbox metadata, production identity/branch/domain rejection, D1/KV/R2/service/DO/secret binding rejection in both environments, unknown nonempty config, incomplete inventory and unsuccessful/missing metadata. Passed six local Python tests in an isolated scratch directory; exact GitHub CI pending. No actual Cloudflare staging proof from these synthetic tests.


## A/B native interaction perturbation test — pending
Native reference 43965081137 succeeded with one ADB swipe and touchend=1. Revised tests added an ADB tap immediately beforehand; retries including run 43971116706 failed with touchcancel=1, even after an 800ms gap. The test now performs the original native swipe without extra tap and still captures touchstart/move/end/cancel; its extended OSRS reverse/vertical assertions remain. Await exact green emulator evidence.


## Android preflight interference hypothesis — awaiting new CI
Prior emulator 43970182876 failed first GW2 swipe with Android `touchcancel`, despite exact restored e538 app source that passed the earlier emulator run 43965081137. Only pre-swipe harness addition is an ADB focus tap at identical position; native double-tap-drag gesture is plausible. New 800ms separation tests this without weakening touch/game-state assertions. Not yet verified; retry green is required and original phone remains untested.


## Expanded native gesture test retry — CI pending
Previous exact emulator green: 43965081137 at e538b648. Latest effefc86 native fail: 43969237871. Error is real Android `touchcancel` after 4 moves, not a passing gesture. Recovered original two game-gesture source files from e538b648 and kept the stricter current emulator test, which now requires reverse OSRS→GW2 and OSRS vertical nested scrolling. Verify new exact-head run before making success claims. Original APK/phone not tested.

**Exact source** `e538b648d1d2d48eb360b8615f7fbd8707b73486`: [GitHub Actions emulator 43965081137](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43965081137) SUCCESS with direct Android ADB touch, debug WebView page-level CDP and independent preview package; screenshot/JSON artifact **14277315133**. `report.json` five PASS cases: cold launch at 412×842 CSS px; native swipe GW2→OSRS; orientation retains the active OSRS JS document; HOME/resume retains the same document and selection; event tracing confirms touchstart=1/move=4/end=1/cancel=0. Before: [emulator 43963187603](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43963187603) FAIL with touchstart=1/move=4/end=0/cancel=1 and no game switch. APK had compiled; this was a genuine input cancellation. Earlier harness [43962176115](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43962176115) FAIL due unsupported browser-level CDP, replaced with page CDP. Complete [source/Python/JS/Chromium regression 43965081086](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43965081086) PASS and [Android preview 43965081112](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43965081112) PASS.
Still NOT physical handset FPS, user-installed package signing/data restoration, offline/backup flow, hardware memory/battery, cloud-monitor preview CORS or production deployment. Do not call GE-08 complete.




## Real Android emulator WebView automation (pending CI)
New github workflow golden-experience-emulator.yml and scripts/verify_android_webview_emulator.cjs use a fresh separate preview APK with debug-only WebView inspection, adb OS-level swipe, forced rotation, Activity Home/resume and screenshot/JSON reports. Static regression checks that workflow contains no Cloudflare deploy or secrets. This test is NOT evidence of physical phone responsiveness, native original-package update compatibility or user account persistence. Exact head CI pending; do not declare success without result.


## Candidate manifest tests — verified prior SHA, new test pending
Exact 10a32e1208e42a263aad7d640cd6d4982d5ef765 passed [full CI 43959179383](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43959179383) plus [Android CI 43959179409](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43959179409). Seven new offline guard tests executed as part of full Python suite. The follow-on eighth test creates a genuine temporary Git checkout, exercises prepare/verify CLI with its actual HEAD/tree and rejects uncommitted modifications; **new exact CI pending**. No real-device/staging/live claim.


## Offline Golden Experience source lock — 16 November (CI pending)
Seven new Python unittest cases exercise stable exact hashes, deploy-only _headers, edited/added/deleted assets, dependency and origin changes, commit/tree/main drift, symlinks, required files and manifest output confinement. They are unverified until the remote full PR CI passes. No physical Android or Cloudflare tests were run.

## GW2 first screen / independent financial panels — 16 November 2026
Exact source `e178eabc07c50ab5dc46566e0d68e247fb662af8`, [complete synthetic CI 43955710086 PASS](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43955710086), [separate native Android APK build 43955710065 PASS](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43955710065). `tests/browser.cjs` on populated 390×844 layout asserts full-width Delivery Box first, trade card next, then 3 summary metrics, **4** original total summary values present (one isolated Delivery hero plus three secondary), item name and start of BUY instruction visible before first fold, 70px verified icon geometry, retained navigation/artwork and financial labels. `tests/golden-experience.browser.cjs` validates 320/390/480/844 screen layouts, 1x and 200% text, full-width financial reflow, no sideways overflow, min 44px touch targets and source semantics. Existing full suites exercise OSRS, chart, ledger, swipe, startup and 400-cycle synthetic retention. The two rejected exploratory designs `cdd11bf` / `7fdbf4f` failed CI: first for counting nested scenario metrics, later for actual grid-row overlap and 62px artwork. The corrected sibling-section implementation preserves 70px art and passed. Not physical Android confirmation.


## OSRS first action is visible on first phone screen — 16 November 2026
Exact source `e654b1d496e8582c9176a2cd5db29506842e5d4f` full [CI 43944884562 PASS](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43944884562), separate APK [CI 43944884652 PASS](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43944884652). `tests/golden-experience-states.browser.cjs` asserts 390×844 header→idea→budget DOM order, in-card market tabs before item, visible item title and first buy instruction, preserved all mode controls and research machinery. Measured synthetic fixture card top 325.53px, first buy instruction 763.55–816.86px. `tests/swipe.browser.cjs` no longer assumes y=690 is inside the scroller; it hit-tests a visible noninteractive scroller location, dispatches a real Chromium vertical touch stream, demands >80px inner scrolling, no game switch and no page scroll. Interim [CI 43943953280 FAILED](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43943953280) on obsolete fixed test coordinate; fixed and full CI then passed. Screenshots and report in artifact 14264082706. Synthetic Chromium is not physical Android certification.


## Android frontend version integrity — 16 November 2026
Exact code `bf84c76e5d4ad68c99cd3fafa3c1235777a4e9e8`. [Android CI 43941763186 PASS](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43941763186): Gradle `assembleDebug`, `testDebugUnitTest` (new policy tests include frontend assets versus dynamic APIs), `lintDebug`, `apksigner verify`, `aapt` package assertion, then SHA-256 / `unzip -p | cmp` byte-level verification of **37 packaged assets** (all repo `app/` except Cloudflare-only `_headers`). APK SHA-256 `545e9f9773a2a34413e0321fcb8d4e3c60f937d2c7be167d9175070743f463aa`. Artifact **14263147726** contains APK, SHA256SUMS and BUNDLED-ASSETS proof. [Full CI 43941763243 PASS](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43941763243) includes source/Python/JS/browser/retained-DOM. Android build evidence is NOT an on-device UX, install/update, touch or memory benchmark. Source checkout in PR build uses GitHub's temporary merge SHA, not necessarily the feature commit SHA; the artifact records its exact checked-out revision.


## GW2 Today active-book and outlook stability — 16 November 2026
Exact source `4e9574fa0d226ca539db90701b17b2d1d6af30af` passed [complete CI 43935010936](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43935010936); previous active-book-only `3934db4` passed CI 43934107914. `tests/browser.cjs`: the active-orders panel reuses first row and review button over six unchanged refreshes; a changed in-place conditional market profit updates the panel. Outlook similarly keeps its first node over six unchanged renders and updates on an in-place unallocated-capital change; its overnight number is labelled conditional. Full synthetic source, Python, JS, all browser suites, startup and retained-session audits pass. These checks do **not** measure physical Android latency or assert forecast accuracy.


## GW2 Today next-action retention — 16 November 2026
**GREEN exact source** `66eb0b9a4b4cf070b614b82ad565f810f4282010`, [CI 43922372800](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43922372800). Full regression includes `tests/browser.cjs` six repeated `GPFocus.render()` calls preserving `#focus-next-action` child and the existing action button, plus a real synthetic account/delivery change updating the advice without losing those nodes. Original commit `0f91bbe` **failed** CI 43921884154: the legacy pre-render `target.replaceChildren()` negated retention; corrective source `66eb0b9a4b4cf070b614b82ad565f810f4282010` removed that call, then passed the whole suite. Browser synthetic, not evidence of Android WebView FPS or battery.

## GE-02 OSRS enlarged decision evidence and fully visible BUY guidance — 16 November 2026
**PASS exact source** `9e6bf9e589c4fbe0d9037257e3e9590a01016ab1`, [CI 43913882902](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43913882902), browser artifact **14248134183**. `tests/golden-experience-states.browser.cjs` now visits 320x740 at default, 24px root and 32px root; checks 24px canvas expands to 840px and first buy text is visible; at 32px explicitly checks the **ENTIRE first buy instruction** fits before the dock (first instruction bottom 765.8125px within 834.03125px pane), 22px evidence font and 20px value-tier font, 320px document client/scroll width parity, no lost buttons, recorded OSRS fill/owned-sale data and a 40-cycle Next/Previous inner-scroll reset. Screenshot `audit/golden-experience/states/osrs-action-320-double-text.png`. Synthetic 40 rapid card changes triggered one supplemental Wiki stat fetch; no material trade changes.
Earlier intermediate full CI [43910034808](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43910034808) passed 150%-text scaling; [43911413625](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43911413625) passed initial 200%-text visibility. Increasing evidence typography at first exposed a too-small 200% canvas and [43912398962](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43912398962) FAILED the strict real instruction-visible assertion. Repaired the canvas, CI [43912980640](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43912980640) passed a first-line-only check, and manual screenshot review discovered incomplete BUY price. Final test checks the entire instruction and passed [43913882902](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43913882902). Full source, Python, JS, 10-browser, swipe/chart/fill/reload, paired synthetic cold-start, four repeated 100-cycle retention and actionlint green. **Not a real Android/WebView timing or full-app acceptance gate.**

## GE-02 new implementation and verified regression — 16 November 2026

## Newest exact full CI — 16 November 2026
Source `93e7aa9184072f275121fabb513b01d567deb929` passed [CI 43902534973](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43902534973). Earlier [43899171142](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43899171142) proved unchanged wallet/week GW2 coin nodes survived six same-value renders and real value updates still invalidated. [43900114372](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43900114372) passed cross-game 320px/32px-root long-word wrapping and 390px GW2 advanced text geometry. [43901563581](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43901563581) passed additional OSRS inner scroller keyboard PageDown, named focusable scroll-region, last item-name glyph reachability and persistent action dock. Latest combined CI adds new-item inner-scroll-top reset tests; runs entire source/JS/Python/ten-browser/visual/charts/swipe/CPU/400-cycle retention/actionlint. Screenshot artifact 14241952075 from prior matching visual batch. Headless Chromium fixture only; native WebView and real financial predictions not validated.

**PASS** exact-source CI: [43886786971](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43886786971) at 20a217ef, [43888028689](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43888028689) at 1d7943f, [43889263582](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43889263582) at `d76ed0fd43200b4b9ea1eb5d0b4242a16437c740`. Includes full reproducible source, Python/JS/ten browser suites, touch/swipe/chart, ledger/backup, synthetic CPU profiling and four cached 100-cycle probes, actionlint. OSRS 320px/large-font sale button stack, 44px hit height, ownership label separation and no overflow; GW2 populated 390px row label metrics and 200%-font increase with no horizontal overflow. Visual evidence artifacts 14235586167, 14235782831, 14235738208. No physical WebView, battery, native signing or real phone p95 verified.

## GE-07 independent repeated-session CI — 16 November 2026

## GE-02 final enlarged-font notice proof — 16 November 2026
**PASS** [CI 43891226109](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43891226109) on exact source `df9ba69b4a8eb2bf6dc4a81b9ba10225eeddbd1c`, browser screenshots artifact 14237111960. `tests/browser.cjs` now asserts 390px/200%-text GW2 advanced discovery-status computed size 16–21px, associated action 16–20px, verifies the complete notice sentence is not removed, and retains previous evidence labels >=16px and no horizontal document overflow. Manual comparison against prior screenshot 14235738208 confirms a shorter, controlled notice; financial data and trading logic are unchanged. Full source/Python/JavaScript/ten browser programs plus synthetic startup/long-session and actionlint passed. No physical Android timings measured.

## Latest full automated acceptance — 16 November 2026
[CI 43882425654](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43882425654) **PASS** on implementation `8662a06c61721443f419a9a4d4207bf4c5360e23`: complete source validation, Python/JS suites, all 10 browser scripts including new exact 250m budget fragmented-text guard at 320px with 24px root font, normal/200% responsive secondary metric geometry, compact GW2 seven-day card size, history DOM/coin image retention and changed-value rerender, swipe/cancel/inner-scroll, data/backup, cold profile, strict repeated 100-cycle retention and actionlint. Screenshot evidence artifact **14233731101**. Earlier previous full pass 43881637564 on source `90a9e4d`; last commit `8662a06` only made OSRS enlarged-font screenshot start at scroll top. No real-phone/WebView test run, no Cloudflare staging test, no claims of user-observed FPS.


## 16 November 2026 — latest exact current CI
Exact source `4e377852dab66d837b86f6c4b112a8560c3f33a5` [CI 43877907764](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43877907764) **PASS** source/Python/JS/ten browser programs, synthetic 16-state visual coverage, 26-case touch gestures, paired cold CPU profiler, strict 100-cycle and three repeat synthetic retained-session probes, actionlint. Populated synthetic GW2 guided/advanced/enlarged-font screenshots from real browser fixture: artifact **14231456749**. Prior CI 43875843978 failed an incorrectly early baseline due to lazy first Focus Today render; 43877197639 and latest run passed after priming *once*, recording mount separately while keeping strict growth assertions. No actual Android device or staging acceptance.


## Premium instrument-face tested batch — 16 November 2026
Exact development commit `27169f6e9dbdb2fe3ea73bb6828881db45631b1b`: [PR CI 43874452456](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43874452456) **PASS** including standalone 16-state visual test run BEFORE audit, source/Python/JavaScript/ten assembled browser suite, swipe at emulated mobile touch coordinate chosen from actual visible noninteractive content, chart tests, OSRS account/outage/ledger/backup tests, paired OSRS cold profiler, original and three extra 100-cycle Chromium sessions, actionlint. Artifacts: screenshot ZIP **14230105976**. Human review includes 390x844 first-screen GW2+OSRS, 320x740 with 2x root font, and 844x390 landscape. Neither physical Android/WebView nor populated GW2 data proves complete. No long-term memory, natural finger-to-paint, battery or real app continuity claim.
Failing intermediate CI jobs (43872648888, 43873269448, 43873645051) were from geometry-obsolete swipe test contacts that landed in input fields after the larger premium header. Actual touch protections correctly guard form controls; tests now assert hit-testing of a visible scroller/idea surface, retain all no-jump/true drag/DOM/storage assertions. Current CI green. Other intermittent late GW2 DOM growth failures (43854807834, 43861470490, 43868239864, 43871156325) still require diagnosis; passing current strict 100-cycle runs alone is not proof of leak freedom.


PR CI 43860812627 PASSED exact development head 889f383, including original 100 cached GW2↔OSRS/chart cycles plus three separate additional 100-cycle probes, all DOM/ledger/cache/page error guards unchanged. All source/Python/JS/ten browser programs, CPU-sampled OSRS profiling and actionlint also passed. Headless Chromium fixture only; no Android hardware acceptance, and the earlier intermittent DOM increase is not yet explained. Distinct reports: artifacts/audit/golden-experience/session-repeat-{1,2,3}.json in CI artifacts. No production data accessed.

## Latest verified state-matrix CI — 16 November 2026

PR CI **43857515705 PASSED** at source `c803e4fa5ba269a6bc248d69820a6389555a970a`: source/Python/JS, all ten browser programs, CPU profiler, accelerated retention and actionlint. The new OSRS acceptance script confirms 40 Next/Previous round trips, members budget, 320px 24px-font settings without overflow, completed purchase realises zero profit until sold, durable three-item holdings after cross-game navigation and Wiki outage, and successful feed recovery. Screenshots in CI artifact 14222210679. A previous failure run 43857095493 was due solely to the new test assuming a specific ranked item name; corrected to compare original selected item rather than replacing ranking logic. Quantitative handler p95 1.7ms is synthetic JS click latency, not physical press. Intermittent 100-cycle DOM growth from earlier run 43854807834 remains open. See VISUAL-QA.md.

## 16 November GE-07 continuation

Exact PR CI 43854807834: profiling PASSED but overall FAILED at accelerated DOM-growth assertion. After adding failure-only DOM subtree/tag diagnostics, CI 43855536154 PASSED all existing source/Python/JS/nine browser checks, synthetic profiler, 100 cached cycles, actionlint. This is a single passing rerun, not proof intermittent growth is gone. Browser profiling uses synthetic data and CPU instrumentation; physical Android remains BLOCKED. See evidence/osrs-cold-cpu-paired-20261116.json.

# Verification matrix — authoritative current results

Tested intermediate source 51e95269e3cbfd5873e9772539160f8ef28bafc9 (not a frozen RC).
Full local source/Python/JS/nine browser baseline passed; per-command reports record
precommit dirty trees honestly. No app changes occurred between final check and
implementation commit. Current source hashes match serial benchmark asset hashes;
dependency lock identical to base097f012. CI 43852759439 passed at exact implementation 51e9526, including all regression steps,
repeated-session probe and actionlint. Step results committed in evidence/ci-51e9526.json.
The following checkpoint changes documentation only; runtime source is unchanged.

| Gate | Actual evidence / status |
|---|---|
| Source/assets/Python/YAML | TESTED: check_release, protected path/lock/hash validation; 39 JS programs syntactically valid |
| Trading/accounting/security | TESTED: 56 Python +129 JS tests; original algorithms/storage unchanged |
| Assembled regressions | TESTED: all 9 browser programs in npm run test:browser, no original suites removed |
| Shared design | TESTED:16 states across320/390/480 portrait and844 landscape,100%/200% root font, reduced motion, financial label contrast>=4.5, >=44px buttons, page/money/tab overflow, keyboard switch |
| Swipe | TESTED:26 cases at ordinary CPU;26 original +26 current at4× Chromium CPU; no Y jump/content mutations/storage writes during drag; cancellation/reversal/nested scroll/resize/delayed work |
| Chart correctness/render | TESTED:60-event burst<=1 rebuild, exact zoom endpoints/tap observation, cancel does not select; >=12px axes; stable loading, cached reopen, responsive modal, stale request/rotation fixtures |
| Manual fills/owned sales | TESTED:FIFO/partial/reload/nonrecommendation sale, durable save/duplicate guard, visible confirmation and purchase-vs-realised wording |
| Lifecycle/backup/data | TESTED synthetic browser:rotation/resume/reload/draft/cache/backup validation/account sentinel; original native lifecycle remains BLOCKED |
| Startup performance | TESTED measurements only:10 cold+10 warm/game/revision, identical interception/raw samples; mixed tails, OSRS cold p95 follow-up OPEN |
| Repeated sessions | TESTED accelerated100 cycles:stable DOM/API counts, no errors, +~5% explicit-GC heap; hours-long/native leaks remain OPEN |
| Press/scroll/item latency | TODO quantitative distributions; CSS feedback existence/duration is not measured latency |
| Complete visual/a11y acceptance | IN PROGRESS: reviewed both main desks, narrow large-font OSRS, phone charts, advanced GW2 entry; populated account, forms, detailed tools, errors/partial/offline states and full contrast/focus review remain |
| Real Android WebView | BLOCKED:no original installed device/adb/emulator/signer available; cold/warm/frame/power/Back/process restore/rotation/resume not measured |
| Haptics | Graceful no-haptics; source QA wrapper lacks permission/bridge, actual original support unverified; no native changes |
| Staging/integration/release | TODO:distinct synthetic project, live exact hashes, complete acceptance, freeze and rollback/deployment rehearsal |

Reproducible commands:

- npm ci --ignore-scripts; PyYAML==6.0.3; Chromium/Playwright per AGENTS.
- python scripts/audit_baseline.py --output artifacts/audit/golden-experience/<batch>
- node scripts/benchmark_golden_experience.cjs (GE_ASSET_REF / GE_OUTPUT controls)
- SWIPE_CPU_RATE=4 node tests/swipe.browser.cjs (separate output per revision)
- node scripts/benchmark_golden_experience_session.cjs

Current environment:Node 24.22.1,Python 3.12.14,Chromium 156.0.8078.79, locked
playwright-core 1.58.2. Fixtures are synthetic/public Wiki only; no private accounts.
Ignored screenshots/logs uploaded by CI. Sanitized JSON is committed in evidence/.
Green browser tests are not physical Android, predictive accuracy or full acceptance.
