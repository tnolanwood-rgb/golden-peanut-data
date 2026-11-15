# Golden Peanut audit — 15 November 2026, release gate

Read `AGENTS.md`, `docs/audit/STATE.md` and `docs/audit/COMPLETE-COVERAGE-2026-11-15.md`. Main previously included merged navigation/performance PRs #41 and #42. The current full integrity audit is PR #43, branch `audit/complete-integrity-release-20261115`. Do not mistake a successful unit test, merge or Pages upload for verified live monitoring or forecast calibration.

## Work already implemented in PR #43

1. Preserve non-reversible inactive private-monitor token digest on any /disable (Worker and GitHub enrolled); delete observation rows and encrypted key. The GitHub secret itself remains for the user to remove separately.
2. Mark capped private 90-day history backfill explicitly incomplete. Later overlapping recent pages must not erase a previously incomplete-history warning.
3. Bind browser private-monitor imports to the original account, key and DB. Reject nonmonotonic cursor pages; deduplicate replayed event rows; continue long imports without declaring complete.
4. Add independent FIFO/DST/fee/missing-cost basis 140k+ transaction oracle tests and account-monitor fault-injection tests.
5. Remove duplicate Pages production pipeline. The single protected workflow validates source, verifies existing project and branch, embeds the exact GitHub commit and checks SHA-256 of every publicly served distributable asset.
6. Fix manual preview checkout to follow the selected branch, not an obsolete 7.16 branch. Public static assets permit conditional revalidation, but private API responses remain uncached.
7. Add aggregate-only D1 readback and tests, safely run in GitHub Actions with existing Cloudflare secrets; it emits only counts/status, no account IDs or private records.

## Verification protocol

Check PR #43's **latest head SHA** and its entire GitHub PR CI workflow (source, Python, JS, Chromium 390px and desktop, actionlint) before merging. Review the `artifacts/audit` files if a failure occurs; do not substitute an earlier successful run. On a tested production merge, wait for the single Pages pipeline and check that its **final exact SHA-256 live verification** passes, not merely the Wrangler deploy step. Deploy the Worker only via the separate approved `account-monitor-deploy.yml` release path with its D1 safeguards, then use `private-readonly-audit.yml` and existing GitHub secrets for privacy-safe counts. Run the existing `public-market-data.yml` collector to publish `data/market_index.json` and 32 shards, verify generation parity before claiming reduced real network transfers.

## Open external evidence

- Actual D1 readback may be unavailable if secrets are missing, the Worker isn't enrolled or no recent polls exist. Report BLOCKED/STALE, not success.
- A phone-closed prospective 24h GW2 cohort, queue position, cancellations, missing fills and unbiased held-out prediction validation require real time series; source fixtures cannot establish them.
- Physical Android WebView cold/warm p50/p95, memory/rotation/native Back cannot be inferred from desktop/mobile-width Chromium.
- The two schedulers (Worker Cron and GitHub Actions) may race on one account; only a validated account-level D1 lease and migration can prove full serialization. Do not add a speculative live migration.
- User's existing account-scoped IndexedDB, ledger, source public data and TP orders must never be deleted for cleanup or speed.

If evidence is blocked, record it in the audit report and leave the corresponding gate explicitly open. No autonomous order placing/cancelling or automatic forecast model promotion.
