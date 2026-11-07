> Latest checkpoint: P4-001b1 category seed selection, branch `audit/discovery-category-seeds`,
> based on main d3b9688 (upstream D1-write and mobile changes preserved).
> Implementation SHA: c09ad575fbf45cd9a0517149f719b1f7b9e46819. Not deployed.
> Category-aware price/depth buckets prevent dominant equipment spreads excluding
> smaller metadata categories. Next: P4-001b2 name/unlock filters and real catalogue
> search; do not repeat the completed seed-category repair. PR/CI status: new review pending.

# Golden Peanut — authoritative engineering state

Updated: 2026-11-07 UTC. Read RESUME.md next. User priority: **market discovery
first**, then calculation correctness and useful bids; defer release cosmetics.

- **Phase / batches:** P0-001 VERIFIED. P1-000, P4-000 and P4-001a VERIFIED locally;
  CI and production deployment verified. Discovery and calculation audit remains ongoing.
  Full phases 0/1/4 are not complete.
- **Branch:** resume from `main`; local release checkout is `release/audit-discovery`.
  PR #20 merged at `09e49acc68c83fe5dd6eb53a66da2f212b02021c`. User explicitly
  authorised deployment. Release commit `e5d67e6cfcda8086e06e0f23fae13d9fcd413cc0`.
- **Latest implementation:** 7e15c007887c50876b9468601f6b35cc13bd1543. Recommendation repair `003c52b`.
  Resolve latest checkpoint SHA with `git log -1 --format=%H -- docs/audit/STATE.md`.
- **Completed:** impossible resale/profit combinations and invalid sample counts
  rejected; board suggestions share actual wallet; uncalibrated estimates no longer
  labelled calibrated. Public and recipe scan lanes now receive reserved budget;
  early equipment/history lanes cannot consume it all. Full catalogue rotation retained.
  Removed arbitrary 50-copper research display floor; added per-category rejection
  accounting and offline replay. Low-margin commodity/food UI regressions pass.
- **Production:** deployed and exact assets verified against e5d67e6 on 2026-11-07.
  [Deploy 42369046821](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/42369046821)
  passed target checks, regression tests, deployment and live smoke tests. Separate
  SHA256 verification matched all 14 referenced HTML/JS/CSS files on Pages.
  Legacy version labels remain inconsistent (P0-002); no private D1 readback claim.
- **Review/tests:** PR CI 42355743535 passed at a140386 before merge; production
  regression stage also passed. Exact live hashes in DEPLOY-e5d67e6-assets.json.
- **In progress:** none; deployment complete and checkpoint saved on main.
- **Exact next action:** P4-001b: reproduce name/unlock-policy exclusion and
  category seed starvation using the saved replay. Decide research visibility
  separately from bid eligibility; preserve explicit unknown execution evidence.
  Add category-based coverage/rotation tests and an actual catalogue-search journey.
  See P4-001a-discovery.md for counts and remaining gates.
- **Deferred:** P0-002 exact release identity, at user's request to prioritise discovery.
  After discovery bottlenecks: P1-001 independent fee/FIFO/DST/partial-history oracle;
  P3/P5 evidence-to-quantity learning. Do not infer standing depth is completed volume.
- **Outstanding:** F002 stale release identity; F004 private data lineage unverified;
  F005 name/ROI/unlock filters confirmed to exclude research; audit remains open. No claim of
  complete discovery or improved live profitability. Physical S23 Ultra untested.
- **Release authority:** user explicitly requested deployment this turn. PR merged
  and existing production workflow triggered through release-request file. No
  database migration, private account write, credential change or in-game order.
- **Recovery/environment:** current worktree `/workspace/gp-audit`; old 7.16 checkout
  remains `/workspace/repository`. Committed GitHub checkpoints, not VM files, are
  permanent memory. Network/local browser servers require network permission.

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
