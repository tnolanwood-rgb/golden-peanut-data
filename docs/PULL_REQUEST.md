> Historical 7.16 record. For current state, architecture, verified access and remaining work, read [audit/STATE.md](audit/STATE.md). Do not treat the old deployment/permission claims below as current.

## Problem and resulting behavior

The 7.15 application was absent from GitHub, and its primary ranking used conditional
spreads and active-day throughput rather than verified 24-hour buy-and-resale outcomes.
This PR restores the Pages app, integrates the supplied full-market collector, and
funds the primary list only from comparable prospective execution evidence. Markets
without sufficient evidence display Research instead of invented expected profit.

The public pipeline records every current commerce ID, rich metadata, all recipe
categories, daily price history and rotating depth with explicit coverage. Existing
D1 collection stays unchanged. New personal learning remains account-scoped in
IndexedDB and private backups. No game orders are placed/cancelled/modified.

## Validation

- 22 JavaScript regression tests and 10 Python collector tests passed.
- Assembled Chromium app passed at 1440 px and 390 px: HTTP fixtures through ingestion,
  IndexedDB, engine and displayed recommendations; search pagination, trade details,
  Legendary Planner, backup verification, malformed forecasts and mobile overflow.
- 26 inline/external JS programs, workflow Python/YAML, assets, versions and credential
  guards passed; actionlint 1.7.7 passed.
- Live public scan: 27,999 quoted items, 27,973 metadata, 13,213 recipes, 1,200 depth
  samples. Missing metadata IDs are explicit. No private account data was available.

## Review/deployment limits

Synthetic tests are not live forecasting accuracy. Eight exact-size prospective
cohorts and strict coverage/comparability gates are required; expect Research until
real evidence accrues. Always-on private collection, learned censoring/queue/supply
models, globally optimized recycling and calibrated uncertainty remain future work.
No production deployment or D1 mutation occurred. Cloudflare credentials and the
existing Pages project name remain unavailable. See `docs/ENGINEERING_AUDIT.md`,
`docs/MODEL_AND_DATA.md`, and `docs/DEPLOYMENT.md` for assumptions and exact rollout.
