# Resume Golden Experience

Read AGENTS.md, BRIEF.md, STATE.md, ROADMAP.md, TESTS.md and ISOLATION.md here.
Verify git status/origin refs/current production build-info; preserve existing edits.
Branch feature/golden-experience, base main 097f012, design implementation 0288a66.
Checkpoint: git log -1 -- docs/golden-experience/STATE.md. No merge/deploy/auto-merge,
production request, native identity, storage, D1/Worker/collector changes. Production
freeze supersedes historical global audit authorizations. Do not restart that audit.

Completed: dedicated project contract/preservation/verification/release skeleton;
original full baseline; shared design CSS tokens and surfaces, immediate browser
press feedback; full design baseline including 16 design/accessibility states passed.
Preserve swipe/startup/owned-sale/stats fixes and official colours/icon dimensions.

First unfinished task: GE-04 chart main-thread work. Source profile confirmed
60 synchronous pointermoves cause 40 OSRS/35 GW2 full plot rebuilds. Local test
`tests/chart-frame.browser.cjs` is uncommitted for next batch; baseline output at
artifacts/audit/golden-experience/chart-before.json. Queue at most one chart render
per requestAnimationFrame, cache width on gesture start, cancel pending work on
close and prevent pointercancel selecting a point. Keep state updates synchronous,
existing APIs/accuracy/modal persistence intact. Run new test (without baseline
flag), existing browser chart/gesture suites, then checkpoint that batch.

Dependencies available: npm ci --ignore-scripts, PyYAML 6.0.3, Chromium
/usr/bin/chromium, locked Playwright 1.58.2. Full check:
python scripts/audit_baseline.py --output artifacts/audit/golden-experience/<batch>.
Final serial performance comparison is still required; exploratory JSON is labelled
and not Android proof. Native hardware/signer/staging unavailable; never claim them.
Finish independent work, maintain all affected project docs, commit/push each tested
batch and record precise next actions. No READY declaration while gates remain open.
