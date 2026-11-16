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
