# Current release / Codex resume — 15 November 2026, 21:00 UTC

**PR #52 MERGED AND PRODUCTION PAGES VERIFIED.** It merged as `441c528f30bb033cb7c2623888540ffb3026f107` into `main`.
The main-branch GitHub Actions workflow [43761054610](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43761054610) completed **success**. Steps for source/Python/JavaScript/browser validation, Cloudflare project verification, existing Pages deployment, and **38 exact served-asset SHA-256 matches** at `https://thegoldenpeanut.pages.dev/` succeeded. A transient stale `build-info.json` at the first verification attempt cleared before the final success. This proves the **web/PWA release**, not that a previously installed standalone Android APK was recompiled or auto-updated.

Latest tested PR head: `ab4d262d36cb4033367bd3d4f3661d558bed36cd`, exact-head regression run [43749900810](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43749900810) and Android preview build [43749900799](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43749900799), both success. The Android build artifact is [golden-hub-cloudflare-preview-apk](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43749900799/artifacts/14175821653), a **separately identified, debug-signed QA preview**, not an update of the owner's original Android installation. Do not install it to transfer an existing GW2 account database: origin/package storage isolation remains.

**Remain OPEN:** high-severity cross-scheduler Worker/GitHub private poll serialization and in-flight opt-out fencing; preview-vs-production Worker CORS; real-device Android orientation/back/file picker/process-death acceptance; private D1/phone-closed account readback and held-out forecast verification; complete standalone OSRS Exchange v4 parity and safe v3 backup migration. Worker request-hardening SOURCE was merged but the private monitor Worker itself was **not** deployed by the Pages workflow; no Cloudflare D1 schema migration or account data deletion occurred. No independent direct Cloudflare dashboard or Codex cloud-task inspection was available: proof is from actual GitHub run logs and original Codex audit handoff in PR #52.

**NEXT safe batch:** validate consent/write fencing using non-destructive synthetic tests and a migration/rollback plan; keep private Worker deployment blocked until authenticated aggregate-only D1 evidence and explicit owner consent. Independently work on OSRS v4 parity behind safe, versioned import schemas without dropping legacy state. Recheck actual phone persistence before claiming native release. Don't repeat the already completed PR #52 baseline; preserve the original GW2 IndexedDB schema and both game's backups.

---

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
