# Golden Peanut — authoritative engineering state

Updated: 2026-11-07 UTC. Start here, then RESUME.md. Historical 7.16 documents are
release history, not the current architecture/access record.

- **Phase / batch:** Phase 0 (partial), P0-001 VERIFIED — trustworthy, resumable baseline and collector failure status.
- **Branch:** `development/audit-p0-checkpoint`, based on `origin/main` at
  `d7d2a243b490c382a3c2bf6f1be3fdad764302a7` (release-labelled 7.24).
- **Latest implementation:** `e7e6e57e5af36c096362ae1846890b500eade67e`.
  Checkpoint commit: resolve `git log -1 --format=%H -- docs/audit/STATE.md`.
- **Prior work reconciled:** 7.16 branch tip `bf46c44` is already an ancestor of main;
  PR #19 (7.24 UI/performance) is merged. Do not reopen the obsolete 7.16 PR proposal.
- **Last independently verified production version:** UNVERIFIED this session.
  Production deployment run [42320412771](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/42320412771)
  reports success for main `d7d2a24`. Direct Pages/public Worker HTTP probes returned
  403/error 1010 with Python default User-Agent, then 200 with Mozilla/5.0.
  Live HTML still advertises 7.16; exact deployed asset identity needs P0-002.
- **Completed:** current repository/workflows inventoried; synthetic baseline run;
  collector API/D1 failures now exit 1, intentional opt-out/no-key skips remain 0;
  subprocess/privacy regressions; fail-closed baseline runner and CI integration;
  durable seven-file audit system and root session instructions.
- **In progress:** none; stopped at a clean batch boundary to conserve allowance.
- **Review:** [PR #20](https://github.com/tnolanwood-rgb/golden-peanut-data/pull/20)
  is open, unmerged and conflict-free as checked this session. Main remains d7d2a24.
  [CI 42324153790](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/42324153790)
  passed at checkpoint `6776e3fc25ff00194badf904c7081eadff078d7b`, including the
  assembled baseline and actionlint. Final checkpoint changes are documentation only;
  any newly triggered CI must be checked next session.
- **Failures/blockers:** F002 stale release identity/gates; F003 uncalibrated estimates
  labelled calibrated; F004 actual private D1-to-app lineage unverified. No direct
  Cloudflare credentials, account key or real Android device in this session.
- **Exact next action:** P0-002: reproduce the release gate accepting old assets that
  contain `7.16.0-evidence`; implement exact version/asset identity tests without
  changing production release-request files. Then P1-001 accounting oracle/DST/coverage.
- **Tests completed:** baseline d7d2a24: source check (31 JS programs), 20 Python tests,
  8 JS test files including 141,879-row synthetic scale fixture, desktop/mobile
  assembled browser. New collector targeted suite: 17 tests; harness: 4 tests.
  Final baseline: 31 Python tests, 8 JS test files, source validation, desktop/mobile
  Chromium and actionlint passed locally and in CI. See EVIDENCE.md.
- **Still required:** real private persisted-row → authenticated API → app lineage;
  correct production static assets; physical S23 Ultra; independent financial oracle;
  real forecast calibration. None is implied by mocked green tests.
- **Authority / release:** push/PR permitted. No merge or production deployment done
  by this batch. Local and remote implementation checks passed; ready for PR review; production release is NOT approved
  by this checkpoint. No migrations, schema changes, secret changes or game orders.
- **Environment:** `/workspace/gp-audit` is the current worktree; `/workspace/repository`
  retains old 7.16 checkout. Shell networking/local servers need network permission.
  Node 24 locally versus Node 22 CI; Chromium available locally. Do not rely on /tmp
  or either worktree surviving: committed checkpoints are authoritative.

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
