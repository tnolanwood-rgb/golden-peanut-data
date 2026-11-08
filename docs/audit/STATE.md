# Golden Peanut — authoritative engineering state

Updated 2026-11-08 UTC. Read RESUME.md next. User prioritises competitive acquisition
repair and allowance-conscious, pushed checkpoints. Full repair remains PARTIAL.

- **Current batch:** CE-001 and CE-002 VERIFIED locally; CE-003 next. No complete
  phase or live forecasting accuracy improvement claimed.
- **Branch/PR:** `audit/competitive-exposure`, base main `0aae3f1` unchanged on fetch;
  draft [PR #31](https://github.com/tnolanwood-rgb/golden-peanut-data/pull/31).
  PR #30 already merged/deployed upstream. Latest verified remote CI for earlier
  head 4f22f02: run 42429705868 passed; latest new head CI must be checked.
- **Latest implementation:** `11f556619b7da859e51ffac5610e9efb11f3d6a0`.
  Collector/relay commit d87971a. Checkpoint SHA resolves using
  `git log -1 --format=%H -- docs/audit/STATE.md`.
- **Completed CE-002:** GitHub collector captures public bid/ask and remaining buy
  quantities in a stable intraday cohort of up to 200 orders, rotating daily.
  One private D1 JSON batch per poll; additive schema, explicit coverage/cache age,
  missing-price states, bounded retry and authenticated paged /exposure relay.
  Client imports at most 25 batches per refresh. Evidence and cursor commit in
  one IndexedDB transaction. Item/day config shards preserve concurrent writes,
  backup unions and old legacy data. Details read recent 90 days, maximum 10,000
  observations; partial reads labelled and sampled rate suppressed.
- **Tests:** clean implementation passed `python scripts/audit_baseline.py`: source,
  Python (41), JavaScript and original desktop/mobile Chromium, plus actual Python
  collector -> synthetic SQLite -> Worker -> browser HTTP -> IndexedDB integration.
  Backup restore, interrupted writes, replay, isolation, concurrent writes, legacy
  migration and retained 10,001-record evidence passed. CE-002-baseline.json.
- **Production:** NOT deployed. Last live byte check: five app assets matched main
  0aae3f1 before CE-001. No private D1 credentials/readback available locally.
  CE-002-DEPLOY.md records the existing deployment sequence and verification.
- **Exact next action:** CE-003a: baseline `findQuantity` in opportunity-engine.js
  and `activeBookScenario` around its ageScale; reproduce identical markets with
  stale personal activity versus recent activity. Replace unsupported inactivity
  discounts/lot ceilings without assigning unsupported expected fills. Preserve
  joint acquisition/resale and wallet guards. Follow with independently supported
  maintenance policies, resale/capital ranking tests and CE-004 evaluation.
- **Open limitations:** legacy quantity/active-week caps and age multipliers remain;
  conditional examples still reflect historical practice. No new funded forecasts.
  Worker-native encrypted-account polling still has no priced collection (relay
  reports worker-unpriced); the active GitHub collector path is covered locally.
  Snapshot endpoints do not prove continuous competitiveness or queue priority.
  Cohort gaps, missing quotes and unobserved times remain unknown. Sampling 200
  orders does not establish complete portfolio coverage. Actual D1 billing,
  live persistence, historical calibration and physical S23 tests remain unverified.
- **Merge/deploy safety:** reviewable tested batches, but full critical repair
  incomplete; PR remains draft. No release-request files changed. User authorised
  deployment when repair verified. Apply additive schema/relay before relying on
  new collection, then Pages; verify live readback separately. No game orders,
  credential resets, destructive migrations or private fixtures.
- **Environment:** /workspace/gp-audit; shell network/browser servers need network
  permission. No secret bindings/direct Cloudflare credentials. All continuation
  must use repository checkpoints, not VM memory. No automatic future work promised.

## Verified source inventory (not a claim of live health)

| System | Current code / consumer | Boundary |
|---|---|---|
| Pages app | `app/index.html`, `focus-edition.js`, `gw2-rarity.js`, legendary modules | Same-origin `golden-peanut-clean-v1` IndexedDB; local private ledger/config |
| Public daily data | `public-market-data.yml` → `scripts/public_market_snapshot.py` → `data/market_*.json` → `public-market-feed.js` | Quotes/depth/recipes; never completed volume |
| Public D1 | `Golden_Peanut_Background_Collector.yml` → quote/depth/shadow tables; public Worker URL embedded in HTML | Source of deployed public Worker still absent; HTTP 200 with browser-style User-Agent |
| Private monitoring | `private-account-collector.yml` (11,41 minutes hourly) → `services/account-monitor/github-collector.py` → `gp_monitor_*` D1 tables | Opt-in Actions secrets; no key read locally |
| Private relay | `services/account-monitor/worker.js`, `schema.sql`; `account-monitor-client.js` reads authenticated `/events`, `/status`, `/nights` | API data isolation/lineage requires Phase 2 proof |
| Decisions | execution/opportunity/market-board/capacity/portfolio/growth modules | Joint cohorts and conditional research coexist; F003 labels repaired |
| Release | `pages-production.yml`, `pages-preview.yml`, `account-monitor-deploy.yml` | Release-request files gate production; do not edit them in ordinary audit work |
