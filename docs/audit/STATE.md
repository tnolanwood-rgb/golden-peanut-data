# Golden Peanut — authoritative engineering state

Updated: 2026-11-07 UTC. Read RESUME.md next. User priority: **market discovery
first**, then calculation correctness and useful bids; defer release cosmetics.

- **Phase / batches:** P0-001 VERIFIED. P1-000 recommendation integrity and P4-000
  discovery budget repair implemented; final checks recorded in EVIDENCE.md.
  Full phases 0/1/4 are not complete.
- **Branch:** `development/audit-p0-checkpoint`; [PR #20](https://github.com/tnolanwood-rgb/golden-peanut-data/pull/20)
  remains the review boundary. Main advanced to `7379ede` (release-labelled 7.29)
  and was merged locally in `124f332`; upstream Delivery Box/history work preserved.
- **Latest implementation:** baf7c16d292fc65f8f575f2cfef700c31b3b1823. Recommendation repair `003c52b`.
  Resolve latest checkpoint SHA with `git log -1 --format=%H -- docs/audit/STATE.md`.
- **Completed:** impossible resale/profit combinations and invalid sample counts
  rejected; board suggestions share actual wallet; uncalibrated estimates no longer
  labelled calibrated. Public and recipe scan lanes now receive reserved budget;
  early equipment/history lanes cannot consume it all. Full catalogue rotation retained.
- **Production:** NOT deployed or independently version-verified this session.
  Prior live probe returned HTML labelled 7.16; main now advertises 7.29. Default
  Python User-Agent returned Cloudflare 1010; `Mozilla/5.0` returned HTTP 200.
  No direct credentials or independent private D1 readback available.
- **Review/tests:** prior PR head bda60d9 passed CI 42324339781. New implementation
  local verification and remote CI status are in EVIDENCE.md. No merge/deploy done.
- **In progress:** next discovery audit not started; checkpoint/PR reconciliation only.
- **Exact next action:** P4-001a: measure category coverage from `data/market_public.json`
  through `researchQuoteScore`, `gatherPublicSeeds`, `publicResearchCandidates` and
  `GPMarketBoard.build`. Reproduce low-unit-margin commodity/consumable exclusion
  and equipment/name-only gates with fixtures before changing them. Track scanned,
  rejected (with reason), surfaced and searchable counts by metadata category.
- **Deferred:** P0-002 exact release identity, at user's request to prioritise discovery.
  After discovery bottlenecks: P1-001 independent fee/FIFO/DST/partial-history oracle;
  P3/P5 evidence-to-quantity learning. Do not infer standing depth is completed volume.
- **Outstanding:** F002 stale release identity; F004 private data lineage unverified;
  F005 equipment/name/price filters may still exclude useful research. No claim of
  complete discovery or improved live profitability. Physical S23 Ultra untested.
- **Release safety:** reviewable after required checks; no production release approval
  requested. No new release markers, database migrations, account writes or orders.
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
