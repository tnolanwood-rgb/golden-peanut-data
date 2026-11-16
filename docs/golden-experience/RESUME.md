# Resume Golden Experience

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
