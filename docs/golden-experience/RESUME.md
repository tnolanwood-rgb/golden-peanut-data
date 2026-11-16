# Resume Golden Experience

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
