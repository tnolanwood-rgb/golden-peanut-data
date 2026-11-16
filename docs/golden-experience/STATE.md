# Golden Experience — authoritative checkpoint

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
