# Resume — read after STATE.md

Repository: `tnolanwood-rgb/golden-peanut-data`. Audit branch:
`development/audit-p0-checkpoint`; base main `d7d2a24` (release-labelled 7.24).
Implementation `e7e6e57e5af36c096362ae1846890b500eade67e` repairs private collector
false-success exits and adds `scripts/audit_baseline.py`. Root AGENTS.md governs work.

1. Fetch GitHub; inspect status and instructions. Read STATE, then relevant roadmap,
   findings/evidence. Verify implementation SHA exists; inspect whether PR #20 merged.
   CI 42324153790 passed at 6776e3f; subsequent checkpoint changes are docs only.
   Confirm any newer CI before continuing. P0-001 is verified; no code is in progress.
2. If unmerged, continue its branch or a dependent review branch; do not reset main
   or overwrite other changes. Old 7.16 branch is already contained in current main.
3. Next: **P0-002**, release identity. `package.json`, `check_release.py`, and production
   gate still use 7.16 while release commits/assets advertise 7.24. Write a rejecting
   test for a stale deployment first; fix exact static identity/gate. No deployment.
4. Then **P1-001**: independent cost/fee/FIFO/partial-history/DST accounting oracle
   at small and >140k scale. Today's recorded profit hero already exists: audit it,
   do not add a second card. F003 calibration claims are a high-priority follow-up.
5. Baseline: `npm ci --ignore-scripts`; PyYAML 6.0.3; Chromium (or
   `npx playwright-core install --with-deps chromium`); `python scripts/audit_baseline.py`.
   Artifacts record tested SHA, dirty flag, commands, exits, timings. `--skip-browser`
   is PARTIAL/nonzero. Reuse prior evidence unless affected by changes.
6. Update seven audit files as relevant, commit, push, open/update PR, record exact
   next action. Report BATCH/STATUS/FIXED/TESTED/EVIDENCE/NEXT/CHECKPOINT briefly.

Production probes: default Python User-Agent gets 403/error 1010; use
`User-Agent: Mozilla/5.0` for HTTP 200 on Pages and public Worker status.
Live HTML still identifies 7.16; exact deployed assets need reconciliation. Recent Actions runs report success, but
actual private database contents and downstream freshness were not verified. Never
print private logs/keys or infer health from workflow status. No unattended work after
usage reset is promised; this checkpoint is the continuation mechanism.
