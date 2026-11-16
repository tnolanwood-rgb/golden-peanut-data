## GE-07 independent repeated-session CI — 16 November 2026

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
