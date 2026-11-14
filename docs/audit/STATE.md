# Golden Peanut — authoritative engineering state

Updated 2026-11-09 UTC. Read RESUME.md next. User prioritises competitive acquisition
repair and allowance-conscious, pushed checkpoints. Full repair remains PARTIAL.

- **Current batch:** CE-001, CE-002, CE-003a and CE-003b1 VERIFIED locally; CE-003c1 VERIFIED locally; CE-003c2 next. No complete
  phase or live forecasting accuracy improvement claimed.
- **Branch/PR:** `audit/competitive-exposure`, main `2669ed5` merged in commit 63d68a3;
  draft [PR #31](https://github.com/tnolanwood-rgb/golden-peanut-data/pull/31).
  PR #30 already merged/deployed upstream. Latest verified remote CI for earlier
  head 4f22f02: run 42429705868 passed; latest new head CI must be checked.
- **Latest implementation:** `86c55ae` (outcome integrity); assembled merge `63d68a3`.
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
- **Completed CE-003c1:** full-round probability now means all proposed units
  resold; separate any-sale and full-acquisition probabilities. Conflicting duplicate
  outcomes block forecasts; ambiguous backup versions become censored. Walk-forward
  holdouts are deduplicated, conflicting truths counted explicitly. Market maximum
  remains unknown and forecasts describe observed practice, not maintained bids.
- **Tests:** clean 63d68a3 full baseline passed, including original financial/browser
  guards and collector-to-browser integration. CE-003c1-baseline.json. Five new
  execution cases cover partial rounds, contradictory outcomes, high-margin vs
  high-volume, resale bottlenecks/shared wallet, duplicate evaluation/backup evidence.
- **Release:** PR34 merged at2669ed5 after CI42590825903 passed. Production run
  42591098367 FAILED before deployment on detached-row rarity assertion. PR35
  fixes that exact assertion and triggers the already-authorised isolated release
  through existing release-request gate after CI. No draft31 deployment. Production
  verification pending; previous live assets still differ from2669ed5.
- **Exact next action:** complete PR35 CI/release/live-byte verification, then
  CE-003c2: attach priced exposure to joint outcome cohorts and distinguish observed
  trading practice from maintenance-specific forecasts. Remaining legacy caps,
  evidence/wait multipliers and policy-specific resale models are unfinished.
  Do not fabricate numeric competitiveness/queue probabilities from endpoints.
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
