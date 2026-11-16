# Item background addition — 16 November 2026

BATCH: HUB-R3. STATUS: implemented and packaged in a signed debug APK; production not deployed.
FIXED: OSRS research cards now have an expandable item background/acquisition guide, mapping examine text, attributed Wiki introduction, membership label and exact item guide link. Wiki requests have an 8-second deadline, bounded in-memory cache, no credentials, escaped text, and selected-item/abort guards. Failed summaries leave trading and the source link usable; no drop sources are invented.
TESTED: new selected-item/stale-response/escaped-text browser journey passed; 15 Hub integrity tests and source checks passed. Android build/unit/lint passed, signature/alignment and 69 embedded assets verified. APK: `artifacts/delivery/Golden-Trading-Hub-item-guide-debug.apk`, SHA-256 `17fde6c857ba7e08b5c064d2a13c196b64130aa5ece0f21c879ec7ab0a48e0ca`. R2 full-suite results remain historical evidence, not a new complete R3 test run.
EVIDENCE: `artifacts/audit/item-context-{browser,integrity,source}.log`; new browser case is included in normal CI.
NEXT: review PR/build evidence; physical/live-account gates in HUB-R2 remain unchanged. Production and original applications remain untouched.
CHECKPOINT: `git log -1 -- docs/audit/STATE.md`. Previous session was interrupted during R2 publishing; verify PR head rather than assuming it was updated.

---

# Active Hub completion checkpoint — 15 November 2026

BATCH: HUB-R2. STATUS: source repairs implemented; final local/remote evidence recorded below and on PR #52.
FIXED: all R1 repairs plus actual Golden Exchange v4 integration, lossless transactional handoff/full backups, shared collector leases/write fences/atomic events, in-flight consent protection and exact preview CORS.
TESTED: 173 JavaScript, 61 Python, 40 Exchange browser tests plus all assembled GW2/Hub suites; three native unit tests; Android assemble/lint (0 errors, 5 warnings); signature/alignment/69 embedded file checks. See completion evidence for final results.
EVIDENCE: [completion report](HUB-COMPLETION-2026-11-15.md), [sanitized evidence](HUB-COMPLETION-EVIDENCE.json), ignored local full logs.
NEXT: exact-head PR CI confirmation; external physical-device/live-account acceptance and separately approved backed-up collector rollout. No R1 code backlog is deferred. Production unchanged, no migrations or original-app installs/uninstalls performed.
CHECKPOINT: discover with `git log -1 -- docs/audit/STATE.md`; branch `audit/hub-reliability-20261115`, [PR #52](https://github.com/tnolanwood-rgb/golden-peanut-data/pull/52). Source identity is pinned in completion evidence/PR after commit; this file does not invent its future SHA.

The signed APK retains `com.goldenhub.dual.preview` at the unchanged preview origin, code 3 / `0.4-audit-qa`. GW2 original data/credentials/brain, standalone Exchange database, collectors and Cloudflare production data have not been mutated. Physical hardware, real private-account collection and predictive accuracy remain unverified, not implied by passing tests.

---
The following entries are historical checkpoints. Their old NEXT/open-code statements and release permissions are superseded by HUB-R2 above.

# Active Hub reliability checkpoint — 15 November 2026

Branch `audit/hub-reliability-20261115`, based on `12c09d9a85e3236f177fec8eedb6c2237eb34d03`.
See [repair report](HUB-RELIABILITY-2026-11-15.md) and [evidence](HUB-RELIABILITY-EVIDENCE.json).

BATCH: HUB-R1. STATUS: local repairs/full checks verified; PR #52 submitted, remote exact-head CI in progress at this save.
FIXED: discovery/state/persistence/native/workflow defects listed in the report; GW2 engines and user data retained.
TESTED: 123 JS, 52 Python, 3 native unit tests; all browser scripts; Android build/lint (0 errors, 5 warnings); actionlint. Public payload replay is observational, not predictive validation.
EVIDENCE: committed sanitized report/JSON; ignored local full logs, APK/signature/alignment/frontend manifest in `artifacts/`.
NEXT: verify the final head checks on PR #52; then address cross-scheduler consent/write fencing, safe v4 parity and native/live-account gates. No deployment/migration/installation authorized by this checkpoint.
TESTED IMPLEMENTATION: `54313199b2921822d7ba706c30d3551d97181c31` (tree `6c27b0d5e8fb0abbf624aa963a1221fbc72f6cab`). PR: https://github.com/tnolanwood-rgb/golden-peanut-data/pull/52. Final PR-head checks are authoritative; this documentation checkpoint does not invent its own future SHA.
CHECKPOINT: discover via `git log -1 -- docs/audit/STATE.md`; never invent a self-referential future SHA.

Original production installations, IndexedDB, credentials, learning, collectors and Cloudflare records were not mutated. The new APK bundles reviewed web assets at the unchanged preview origin and separate `com.goldenhub.dual.preview` package. Debug QA only. The private monitor race, preview CORS boundary, physical device checks and full v4 parity remain OPEN.

---
Historical checkpoint follows; its release instructions do not authorize deployment for this audit.

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
