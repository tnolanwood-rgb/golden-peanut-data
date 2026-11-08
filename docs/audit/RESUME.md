# Resume — competitive-exposure repair

Repository `tnolanwood-rgb/golden-peanut-data`; branch `audit/competitive-exposure`.
Read AGENTS.md and STATE.md. User has limited allowance: keep bounded checkpoints.

1. Fetch/status; check this branch's PR and latest CI/merge state. Base main
   `0aae3f1`; implementation `ef7f27c29aee7d983e46155e2fa7e0ff4332f915`.
   PR #30 merged/deployed upstream; do not repeat its discovery audit.
2. CE-001 passed all local baseline stages (94 JS, 34 Python, desktop/mobile).
   It removes unpriced-night capacity/ranking overrides and integrates priced,
   account-scoped foreground observation diagnostics. CE-001 NOT deployed here.
3. Next **CE-002**: additive private background bid/ask collection and authenticated
   app import, with D1 write-budget, freshness, deduplication and gap tests. Inspect
   `services/account-monitor/github-collector.py`, `schema.sql`, `worker.js`,
   `app/account-monitor-client.js`, `app/competitive-exposure.js`. Do not encode
   prices into existing quantity fields. Address growing config arrays/concurrency.
4. Then CE-003: replace competing findQuantity/capacity historical lot caps and
   inactivity factors; maintenance-specific acquisition AND resale evidence,
   capital conservation and rankings. CE-004: chronological evaluation/full
   acceptance/deployment. Read COMPETITIVE-REPAIR.md's acceptance matrix.
5. Sampled rates are descriptive only; all new expected forecasts remain unknown.
   Do not infer continuous queue position, disappeared fills or total market volume.
   Existing conditional scenarios remain biased by historical practice; full repair
   is PARTIAL. No live accuracy improvement claimed. Preserve fees/Delivery Box.
6. Only rerun prior checks if new changes justify it. Update checkpoints and push
   before stopping. User authorised verified deployment when repair is complete.
