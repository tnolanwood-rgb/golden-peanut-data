# Resume Golden Experience

## Latest executable handoff — 16 November 2026
Protected feature `feature/golden-experience`, draft PR #65. Exact tested source `8662a06c61721443f419a9a4d4207bf4c5360e23` full [CI 43882425654](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43882425654) **PASS**; main `097f012c1f912411790dd7dce21434a9cdc497d2` unchanged. Resume from GE-02 visual finishing, GE-07 native/long-history measurement and GE-08 deep form QA, not release: GE-09 isolated staging and GE-10 freeze/rollback are TODO. Current implementation and tests: responsive full-width cards for 200% Android-style fonts, compact GW2 seven-day card/flex direction, stable GW2 history DOM and accurate change invalidation, exact 250m OSRS budget string at 320px, screenshot start at scroll top. See STATE.md for full evidence and artifact 14233731101. **Do not merge/deploy or modify production/Cloudflare/native APK** until user authorises “Implement” after READY FOR IMPLEMENT gate. If current CI source differs, inspect branch and restart from newest.


## 16 November 2026 — latest protected visual and synthetic data checkpoint
**STATUS: IN PROGRESS; latest implementation TESTED, not READY FOR IMPLEMENT.**
- Branch `feature/golden-experience`, draft PR #65, source `4e377852dab66d837b86f6c4b112a8560c3f33a5`. [CI 43877907764](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43877907764) **SUCCESS**. Production main independently checked unchanged at `097f012c1f912411790dd7dce21434a9cdc497d2`; no deploy, merge, Cloudflare/worker/D1, native APK, data or signing change.
- GE-01/02 visual: developed scoped premium instrument fascia, substantial financial hero/readouts, sculpted recommendation housing, GW2/OSRS differentiated identities; latest CSS commit adds more cohesive GW2 advanced instrument surfaces and a bounded layout at 200%-font zoom. The revised UI is much more visually distinct than the previous flat stack. It is still one *reviewed design iteration*, not final pixel-perfect acceptance.
- GE-08 visual: `tests/browser.cjs` now captures **populated synthetic GW2** (8 Delivery Box item types, FIFO ledger, guided view, enlarged font and advanced desk) alongside standard 16-state screenshots. CI screenshot artifact **14231456749** on latest green run. Tests and screenshot capture do not equal real-user acceptance or prove Android physical FPS.
- GE-07 diagnostics: intermittent +39 DOM node jump identified precisely as **initial lazy GW2 Focus Today mount** (seven-day week strip and account summaries). The synthetic retention probe now explicitly paints that panel **before** beginning its 100-cycle retained-session measurement, records that one-time mount separately and keeps the same +10 DOM-growth failure limit afterward. CI 43877197639 was green for the diagnostic code, and CI 43877907764 green for current CSS. **Not proof of zero Android leak, smoothness or long-duration RAM behaviour.** Avoid calling initial intended mount a retained leak; continue real lifecycle/large-account tests.
- Remaining GE-02/03/04/05/07/08: evaluate visually dense advanced forms, error/slow/offline screens, OSRS long titles, huge amounts at enlarged fonts, native device press/swipe/rotation/resume/scroll/CPU/memory and all timing distributions. GE-09 isolated staging is TODO; GE-10 frozen integrated RC, release/rollback rehearsal are TODO. Entire project remains protected until owner says **Implement** after verified readiness.
**Next action:** review populated screenshots from artifact 14231456749 against DESIGN-ACCEPTANCE.md; refine concrete dense screen problems without weakening official colours, accounting, touch controls or performance. Build isolated staging only with proven separation from production. Keep PR draft.


## Newest successful visual-development checkpoint — 16 November 2026
Resume on `feature/golden-experience`, draft PR #65. Tested commit `27169f6e9dbdb2fe3ea73bb6828881db45631b1b` passed [CI 43874452456](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43874452456) with full Python/JS/ten-browser suite, visual matrix, chart + swipe including nested scroller/drag cancellation, profiler, four 100-cycle Chromium retention probes and actionlint. Current major visual work in `app/dual-hub.css`: premium instrument fascia, dominant financial gauge, differentiated GW2/OSRS surfaces, structured recommendation chassis; no JS external dependencies, touch handler/ledger/API modifications for this visual batch. Earlier performance-only changes to `app/index.html` keep unchanged currency artwork, delivery rows and action buttons mounted.
Review screenshot artifact `14230105976` from the run; 390, 320 doubled text, 844 landscape manually reviewed. First visual pass is noticeably stronger, not final polish. Synthetic unconnected GW2 screenshot is not a fully-populated account. Don't revert the existing swipe fixes; updated `tests/swipe.browser.cjs` dynamically hit-tests real noninteractive surfaces because fixed device y-coordinates can land on protected inputs once headers grow.
**FIRST UNFINISHED:** create/populate synthetic GW2 account/Delivery Box/recommendation visual fixtures, review long names/small/large/landscape and advanced full-screen workflows, refine where needed; diagnose the intermittent `#focus-today` late 39-node initial mount (source now identified), quantify performance and native impact. Isolated Cloudflare staging and Android signer/device verification still BLOCKED; GE-09/GE-10 not started. Full instructions BRIEF, STATE, ROADMAP, VISUAL-QA, BENCHMARKS, RELEASE and DESIGN-ACCEPTANCE.md. Production main `097f012` at last read; do not merge/deploy/modify native data/Cloudflare before owner explicitly says “Implement” AFTER final readiness.


## Most recent — retained-session four-pass CI
PR #65 remains draft, production frozen. CI 43860812627 PASSED at 889f383: ten browser suites and original+three repeated 100-cycle retention runs all pass (400 cycles across four independent Chromium sessions). The intermittent 43854807834 DOM-growth failure remains unresolved; do not delete its evidence or assert native leak-free. Resume from GE-07 diagnosis (full-session/scroll/large-history/press), GE-08 populated GW2 and advanced accessibility states, then GE-09/10 isolated staging/integration/release rehearsal. No native device/signer or isolated staging verified. Current state in STATE.md; runtime code unchanged since 51e9526.


## Most recent green acceptance checkpoint

Exact source `c803e4fa5ba269a6bc248d69820a6389555a970a` passed PR CI 43857515705 (source/Python/JS/ten browser programs, CPU profiling, retained session, actionlint). New protected acceptance test `tests/golden-experience-states.browser.cjs` covers OSRS settings, 40 recommendation round trips, purchase ledger persistence, 320px enlarged fonts, cross-game switch, failed Wiki feed and recovery. `docs/golden-experience/VISUAL-QA.md` records screenshot review and actual limitations. No main release. Next: diagnose intermittent DOM-growth failure from run 43854807834 (diagnostics are installed), continue quantitative press/scroll/long history, full GW2 populated view and native/staging/release gates. No READY FOR IMPLEMENT until all are proven.


## Latest continuation: GE-07 diagnostics
Branch `feature/golden-experience`, draft PR #65. New paired OSRS cold-start CPU profiler `scripts/profile_golden_experience_cold.cjs`; its PR CI job now fetches pinned baseline history, runs six paired trials per revision and uploads synthetic artifact JSON. Two completed runs: 43854807834 (CPU probe PASS, retention FAIL DOM growth), 43855536154 (full PR CI PASS including retention). Evidence: `docs/golden-experience/evidence/osrs-cold-cpu-paired-20261116.json`. Do not call the intermittent failure resolved. Source/runtime app implementation is still 51e95269e3cbfd5873e9772539160f8ef28bafc9; only profiling/test/CI/documentation changes followed.
First act: reproduce intermittent growth with retained tag/subtree output from failed test (new diagnostic writes report on failure). Then quantify press/navigation/scroll/chart and longer sessions; continue visual/accessibility populated/error states and native isolated staging/release gates. Treat device/production verification as OPEN. Never merge/deploy until final owner Implement authorization. Recheck main/feature SHAs, PR checks and live identity before any release-related action.


Read AGENTS.md, BRIEF.md, STATE.md, ROADMAP.md, TESTS.md, BENCHMARKS.md and ISOLATION.md
here. Verify local edits, actual origin refs, PR #65 checks and live build-info first.
Branch feature/golden-experience, draft PR #65, tested implementation 51e95269e3cbfd5873e9772539160f8ef28bafc9.
Checkpoint: git log -1 -- docs/golden-experience/STATE.md. Main/live 097f012 at last
readback. Production freeze applies: no merge/deploy/auto-merge, release requests,
native identity/origin/storage, Worker/D1/private monitor/collector changes. Do not
follow historical global-audit release NEXTs or restart completed audit batches.

FIRST UNFINISHED: GE-07 profile
OSRS cold-start tail. Corrected serial evidence: current cold median/p95 645/798ms
vs original 671/726ms, n=10; no no-regression claim. Warm current 198/307 vs 190/311.
Use same transport/fixture/runtime and randomized/repeated order; collect traces/
long tasks, diagnose actual cause. Measure press/scroll/item/chart latency and longer
sessions. Then finish full populated-account/form/error/advanced visual/accessibility
matrix (see TESTS) and independent native/staging/release gates.

Completed: contract/discovery/isolation; shared tokens/press/Delivery Box hierarchy;
chart one-frame scheduling/cancel correctness/adaptive readable axes/exact taps/
stable loading/cache; visible confirmed-fill feedback; one stylesheet request saved.
Design layer now lives at the END of app/dual-hub.css, not a separate file. Preserve
existing rarity/value tiers, engines, lifecycle, data, owned sales and swipe repairs.
No runtime dependency or lock change. Exact implementation CI 43852759439 passed (including actionlint/session probe).
Original full baseline and updated nine browser
programs passed; 26 CPU 4 swipe cases passed for both sources; 100 cached-cycle probe
recorded stable DOM/requests and +~5% heap, not native leak-free proof.

Tools installed: /usr/bin/chromium, Playwright-core 1.58.2, PyYAML 6.0.3. Full tests:
python scripts/audit_baseline.py --output artifacts/audit/golden-experience/<batch>.
Benchmark: GE_ASSET_REF=097f012 GE_OUTPUT=artifacts/audit/golden-experience/<before>
node scripts/benchmark_golden_experience.cjs; omit ref for current. Run serially.
CPU 4 replay: SWIPE_CPU_RATE=4 [SWIPE_ASSET_REF=097f012] SWIPE_OUTPUT=<dir>
node tests/swipe.browser.cjs. Retention: node scripts/benchmark_golden_experience_session.cjs.
Use synthetic credentials only. Existing staging projects have NOT been created;
Cloudflare read-only inspection is available through branch pages-preview workflow
operation=inspect ONLY. No preview/deploy dispatch until staging isolation checked.

Native device/signer/emulator unavailable, haptics not enabled; don't invent support
or install debug QA over original app. Complete OSRS v4 migration/parity remains a
separate audit. Preserve all unknown legacy fields. No readiness declaration while
any source/acceptance/performance/native/staging/release gate remains open. Save
actual checks/SHAs/evidence/next actions and commit/push each completed batch.
