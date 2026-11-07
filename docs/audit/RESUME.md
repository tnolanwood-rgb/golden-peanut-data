# Resume — read after STATE.md

Repository `tnolanwood-rgb/golden-peanut-data`. Branch
`audit/discovery-category-seeds`, PR #30. Read root AGENTS.md.

1. Fetch/status; check PR #30 merge state and newest CI. Base main d3b9688;
   implementation 2e29aa6d6697fa8fd5d22243d1493959f6c0fdde. Earlier cca2728
   passed CI 42398829818. New code passed local assembled baseline, not deployed.
2. Do not restart the audit. Category seed fairness and name/unlock exclusion
   repairs are complete. Untraded catalogue name/ID search is browser-tested.
3. Next **P4-001c**: remaining ROI/price/depth gates and rejected-item access.
   Use `node scripts/audit_discovery.cjs`; consider refresh rotation and small
   budgets before claiming complete coverage. Public depth is not completed volume.
4. Later: independent accounting oracle, learning evidence and quantity/ranking.
   P0-002 version cleanup still deferred by user priority: market discovery first.
5. Verify with `python scripts/audit_baseline.py` when shared code changes. Reuse
   existing fixtures and prior evidence. Update checkpoints, commit/push and PR.

PR #20 was merged/deployed previously; do not reopen it. The later PR #30 repairs
are NOT deployed by this session. No automatic game orders or private-data writes.
