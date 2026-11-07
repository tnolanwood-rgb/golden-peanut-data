# Golden Peanut — authoritative engineering state

Updated: 2026-11-07 UTC. Read RESUME.md next. User priority: market discovery,
then calculation correctness/useful bids. Keep releases separate from ordinary audits.

- **Current phase/batch:** P4-001b2 VERIFIED locally: remove name/unlock research
  exclusions and verify untraded catalogue search. Full Phase 4 remains incomplete.
- **Branch:** `audit/discovery-category-seeds`, based on main `d3b9688`.
  [PR #30](https://github.com/tnolanwood-rgb/golden-peanut-data/pull/30) open/unmerged.
  Upstream 7.30 mobile styling and D1 write reductions preserved.
- **Latest implementation:** `2e29aa6d6697fa8fd5d22243d1493959f6c0fdde`.
  Seed category repair c09ad57 also on this branch. Checkpoint SHA resolves with
  `git log -1 --format=%H -- docs/audit/STATE.md`.
- **Completed:** category-aware seed budgets; positive small-margin research;
  names and collection unlock use no longer silently block quote research.
  Freshness, valid prices, positive net margin and other numeric policies remain.
  No public-only entry gains a funded order, execution probability or expected profit.
- **Tests:** all four audit_baseline.py stages pass on clean implementation above.
  Board tests 12/12; desktop 1440x1000 and mobile 390x844 prove research visibility
  and untraded catalogue name/ID search. Prior PR head cca2728 CI 42398829818 passed.
  CI for the newest commit remains pending; see EVIDENCE.md.
- **Production:** this batch NOT deployed. Last independently hash-verified audit
  release e5d67e6 via run 42369046821 (14 assets matched). Main subsequently added
  7.30 mobile changes and D1 write reductions; not independently deployed-verified here.
- **In progress:** none; next bounded discovery batch not started.
- **Exact next action:** P4-001c: audit remaining ROI/price/depth policies and
  exposure of rejected research through catalogue search. Use saved offline replay
  to distinguish numeric safety checks from speculative profitability filters;
  inspect bounded refresh rotation before claiming complete category coverage.
- **Outstanding:** no private D1-to-app readback proof; no live profitability or
  calibration improvement proven; real S23 Ultra untested. P0-002 release identity
  and P1-001 independent accounting oracle remain deferred, not complete.
- **Authority:** push/PR permitted. No new release authority inferred from ordinary
  “Continue”. No migrations, game orders, credential changes or private fixtures.
- **Environment:** `/workspace/gp-audit`; network/local browser servers need network
  permission. No direct private keys or Cloudflare credentials. GitHub checkpoints
  are the recovery source; do not rely on VM or conversation history.

## Verified source inventory (not a claim of live health)

| System | Current code / consumer | Boundary |
|---|---|---|
| Pages app | `app/index.html`, `focus-edition.js`, `gw2-rarity.js`, legendary modules | Same-origin `golden-peanut-clean-v1` IndexedDB; local private ledger/config |
| Public daily data | `public-market-data.yml` → `scripts/public_market_snapshot.py` → `data/market_*.json` → `public-market-feed.js` | Quotes/depth/recipes; never completed volume |
| Public D1 | `Golden_Peanut_Background_Collector.yml` → quote/depth/shadow tables; public Worker URL embedded in HTML | Source of deployed public Worker still absent; HTTP 200 with browser-style User-Agent |
| Private monitoring | `private-account-collector.yml` (11,41 minutes hourly) → `services/account-monitor/github-collector.py` → `gp_monitor_*` D1 tables | Opt-in Actions secrets; no key read locally |
| Private relay | `services/account-monitor/worker.js`, `schema.sql`; `account-monitor-client.js` reads authenticated `/events`, `/status`, `/nights` | API data isolation/lineage requires Phase 2 proof |
| Decisions | execution/opportunity/market-board/capacity/portfolio/growth modules | Joint cohorts and conditional research coexist; F003 labelling defect |
| Release | `pages-production.yml`, `pages-preview.yml`, `account-monitor-deploy.yml` | Release-request files gate production; do not edit them in ordinary audit work |
