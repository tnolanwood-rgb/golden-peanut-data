# Golden Peanut — authoritative engineering state

Updated 2026-11-08 UTC. Read RESUME.md next. User prioritises competitive acquisition
repair and allowance-conscious, pushed checkpoints. Full repair remains PARTIAL.

- **Current batch:** CE-001, CE-002, CE-003a and CE-003b1 VERIFIED locally; CE-003c next. No complete
  phase or live forecasting accuracy improvement claimed.
- **Branch/PR:** `audit/competitive-exposure`, main `4b8bd13` merged in commit 01b7c86;
  draft [PR #31](https://github.com/tnolanwood-rgb/golden-peanut-data/pull/31).
  PR #30 already merged/deployed upstream. Latest verified remote CI for earlier
  head 4f22f02: run 42429705868 passed; latest new head CI must be checked.
- **Latest implementation:** `a0d131c` (bulk research); `2509b86` (inactivity repair).
  Collector/relay commit d87971a. Checkpoint SHA resolves using
  `git log -1 --format=%H -- docs/audit/STATE.md`.
- **Completed CE-003a/b1:** removed inactivity quantity discounts and discovery
  penalties, retained historical overnight fills, removed age-dependent experimental
  expansion multipliers, stopped inactivity alone flagging capital redeployment,
  rejected future quote evidence. Bulk research accepts user-entered quantities
  beyond 250; integer arithmetic and stack-fee oracle guards, unknown maximum market
  capacity and no automatic funding. Preserved main's startup performance fixes.
- **Completed CE-002:** GitHub collector captures public bid/ask and remaining buy
  quantities in a stable intraday cohort of up to 200 orders, rotating daily.
  One private D1 JSON batch per poll; additive schema, explicit coverage/cache age,
  missing-price states, bounded retry and authenticated paged /exposure relay.
  Client imports at most 25 batches per refresh. Evidence and cursor commit in
  one IndexedDB transaction. Item/day config shards preserve concurrent writes,
  backup unions and old legacy data. Details read recent 90 days, maximum 10,000
  observations; partial reads labelled and sampled rate suppressed.
- **Tests:** final implementation passed all baseline stages: 109 JavaScript,
  41 Python, source/workflow validation, desktop/mobile assembled app, and separate
  collector-to-browser evidence pipeline. Six inactivity and three quantity/fee
  regressions added. CE-003a-baseline.json / CE-003b1-baseline.json. The latter's
  dirty flag is solely the untracked CE-003a evidence JSON; implementation committed.
- **Production:** current main HTML/opportunity/focus assets independently matched
  live bytes on 2026-11-08. Main already deployed unpriced-night repair (#32) and
  startup performance changes (#33). CE-002 and this session's CE-003 changes are
  NOT deployed. PR #31 remains draft/open/unmerged; newest CI pending.
- **Exact next action:** CE-003c: trace GPExecution.forecast/plan and legacy research
  consumers of cap/researchCap/activeWeekCap. Baseline fixed-lot joint outcome
  estimates against priced exposure, censored full lots, outbid periods and separate
  resale. Define identifiable maintenance policies before producing any numeric
  forecast. Remaining legacy evidence/volume caps must not be labelled maximum
  market capacity. Add high-margin/low-volume versus high-volume/resale-limited
  portfolio tests; then CE-004 walk-forward evaluation and verified release.
- **Open limitations:** legacy quantity/active-week caps, evidence factors and survivor-wait adjustments remain;
  conditional examples still reflect historical practice. Inactivity age discounts targeted in CE-003a are removed. No new funded forecasts.
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
