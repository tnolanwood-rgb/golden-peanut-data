# Golden Peanut — authoritative engineering state

Updated: 2026-11-08 UTC. Read RESUME.md next. User prioritised the competitive
exposure/acquisition/inactivity repair over remaining discovery work; allowance is
constrained, so stop at a pushed, reproducible batch boundary.

- **Current phase/batch:** CE-001 VERIFIED locally. Overall competitive-exposure
  repair PARTIAL; CE-002 next. Full Phase 5 and the wider audit are incomplete.
- **Branch:** `audit/competitive-exposure`, base main `0aae3f1`.
  PR #30 merged upstream (`b7aa19b`); earlier discovery code is included in main.
  New repair PR/status: check this branch's GitHub PR; local validation below is
  independent of pending remote CI. No merge or release has occurred for CE-001.
- **Latest implementation:** `ef7f27c29aee7d983e46155e2fa7e0ff4332f915`.
  Checkpoint SHA: `git log -1 --format=%H -- docs/audit/STATE.md`.
- **Completed:** removed unpriced-night overrides of conditional research capacity
  and rankings; persisted account-scoped foreground buy/quote observations;
  separated sampled competitive/outbid/unknown periods, verified-fill lower bounds,
  gaps, cancellations, overlapping orders, stale tails and duplicates. Optional
  detail diagnostics report limits. No sampled rate becomes a funded forecast.
- **Tests completed:** clean implementation passed `python scripts/audit_baseline.py`:
  source/assets/workflow/credential checks (32 JS programs), 34 Python tests,
  94 JavaScript tests (18 new exposure cases), desktop 1440x1000/mobile 390x844
  assembled Chromium journeys, including existing accounting/Delivery Box guards.
  See CE-001-baseline.json, CE-001-comparison.json and EVIDENCE.md.
- **Production:** before editing, five live assets (HTML, execution, opportunity,
  capacity, market-board) matched main `0aae3f1` byte-for-byte. CE-001 NOT deployed.
  Mixed historical version labels remain; exact source identity is the evidence.
- **In progress:** full critical repair; no unfinished local code changes expected
  after checkpoint. Remote CI pending until independently checked.
- **Exact next action:** CE-002: inspect private collector `save_orders`/night paths,
  Worker schema/endpoints and account-monitor-client import; add bounded timestamped
  bid/ask observations with an additive migration and authenticated, deduplicated
  import to the exposure store. Preserve upstream D1 write reductions. Tests first.
- **Still required:** background prices/freshness/coverage; storage growth and
  concurrency controls; competing legacy lot/active-week caps and recency factors;
  maintenance-specific acquisition/resale/portfolio modelling; walk-forward outcome
  evaluation; real account integration and physical S23 checks. See
  COMPETITIVE-REPAIR.md for the acceptance matrix. Do not label these complete.
- **Outstanding limitations:** endpoint samples are not continuous competitiveness
  or queue priority. Historical unpriced nights cannot be retrospectively priced.
  Closed-app periods remain unknown without background evidence. Existing
  conditional active-day examples are not unbiased capacity estimates. No improved
  live profitability/calibration, new funded quantities or capital recycling proven.
- **Merge/deploy:** CE-001 reviewable with local checks passed; check remote CI.
  Not a complete acquisition-engine release. User authorised deployment of the
  verified repair, but do not claim this partial batch satisfies full acceptance.
  No destructive migrations, game orders or credential/account-data changes.
- **Environment:** `/workspace/gp-audit`; network/local browser servers need network
  permission. No direct private keys or Cloudflare credentials. GitHub checkpoint
  is the recovery source; no automatic continuation after allowance reset.

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
