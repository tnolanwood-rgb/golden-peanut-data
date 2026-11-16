# Compact stats deployed and verified — 16 November 2026

BATCH: COMPACT-STATS. STATUS: LIVE, https://thegoldenpeanut.pages.dev/.
FIXED: equipment panel now shows slot, explicit requirements and non-zero bonuses/penalties only. Removed all-zero rows/groups, duplicated generic properties and verbose boilerplate. Non-equipment keeps useful item properties; no user storage, credentials, collectors or schemas changed.
TESTED: full local baseline (129 JS, 56 Python and all assembled browser suites), exact-head CI 43836290111 and production run 43836621817 all passed. Deployed SHA 097f012c1f912411790dd7dce21434a9cdc497d2, PR #64. Production verified exact hashes of every served file and real hosted touch navigation. Separate fresh mobile Chromium test on actual public production passed for Occult necklace: 70 Magic, Neck, Magic attack +12, Magic damage +5%, Prayer +2; no +0 rows. Inspection used the workspace proxy with local proxy certificate bypass, not a TLS/physical-phone test.
EVIDENCE: https://github.com/tnolanwood-rgb/golden-peanut-data/pull/64; https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43836621817; ignored artifacts/audit/compact-stats-live.{json,png,log} and baseline logs. Exact tested implementation ced4598ed556c0f32c89c01853de08caf545f6c7.
NEXT: reopen the hosted app if an already-open page still shows the old tables. No new APK needed. Physical phone acceptance remains unverified. Rollback only frontend code through the same tested Pages workflow; never clear saved data.
CHECKPOINT: final documentation saved on feat/compact-item-stats-20261116; git log -1 -- docs/audit/STATE.md there. Documentation-only checkpoint does not redeploy or alter the served SHA.

---

# Compact item stats — 16 November 2026

BATCH: COMPACT-STATS. STATUS: implementation and focused checks passed; full local baseline/PR CI and hosted release verification pending.
FIXED: compact item properties list replaces all bonus tables. Equipment shows slot, explicit requirements and only non-zero bonuses/penalties; zero-only groups and duplicated access/GE/property rows are removed. Non-equipment retains relevant item properties. Negative bonuses remain visible. Quiet source attribution and hidden empty status reduce vertical clutter. No account storage or collector changes.
TESTED: focused actual-Wiki browser test confirms Shield/80 Defence, +55/+8 and negative values survive while +0 and zero Stab attack are absent; variants, outages and safe rendering still pass. Source/Python/JS baseline passed; assembled browser suite pending at this checkpoint.
EVIDENCE: ignored artifacts/audit/compact-stats-*; exact implementation SHA/CI/production runs on its PR.
NEXT: finish and release to the hosted app under the user's continuing instruction, verify live compact stats. Preserve user data; rollback only frontend code through the tested Pages workflow. Previous full-table stats release 94b1242bd8f3e51dddf8ed84a496580c2ea8b7fe deployed successfully in run 43835488440 (PR #63). Direct local Rondache selection in that hosted release timed out and was not counted as a passing live item check.
CHECKPOINT: git log -1 -- docs/audit/STATE.md on feat/compact-item-stats-20261116. No new APK or database migration.

---

# Practical item stats release — 16 November 2026

BATCH: ITEM-STATS. STATUS: implemented; local full baseline passed; awaiting exact-head CI and hosted release verification.
FIXED: replaced lore/examine/acquisition paragraphs with practical properties, requirement, slot and attack/defence/other bonus tables. Wiki HTML is parsed inertly; only text/numeric fields render. Retains membership, GE limits, alch values on Wiki outages. Ambiguous variant pages omit equipment bonuses and requirements instead of selecting an arbitrary variant. No storage, credentials, collectors or database migrations changed.
TESTED: 129 JavaScript, 56 Python and all assembled browser suites passed. Added real public Rondache Wiki fixture with 80 Defence, +8 strength and +55 Ranged defence; variant, non-equipment, stale-selection, outage and safe rendering checks pass. Public fixture source: OSRS Wiki Rondache parse API, captured 2026-11-16; CC BY-NC-SA 3.0.
EVIDENCE: ignored artifacts/audit/item-stats-* and baseline logs. Source branch feat/item-stats-20261116; exact tested commit and CI/deployment results recorded on its PR.
NEXT: release to the existing hosted app under the user's continuing release instruction, verify exact deployed bytes and live stats, then record final evidence. Physical-device tests remain unverified. Rollback only frontend code via tested Pages workflow; never clear user storage.
CHECKPOINT: git log -1 -- docs/audit/STATE.md on this branch. Previous lore release was deployed as 918702e73a64336ce3135249c4fe54acba56bd6e via PR #62; no new APK is required for the hosted update.

---

# Hosted item guide release — 16 November 2026

BATCH: ITEM-GUIDE-LIVE. STATUS: prepared for the user-authorized production release; confirm the PR and exact served hashes before claiming deployed.
FIXED: item context is an always-visible section directly beneath the OSRS item name (not a collapsed details control). Includes examine text, attributed Wiki summary, membership/acquisition guidance and source link, with bounded independent requests/cache and stale-response guards. Based on current production main, retaining its swipe/owned-sale fixes. No collector/schema/persistence changes from audit PR #52 are included.
TESTED: dedicated visibility/item-switch/escaped-text browser case and source checks passed. Full local source/Python/JavaScript/assembled browser baseline passed; exact-head PR CI must pass before merge; production workflow reruns checks, verifies every deployed asset hash and real hosted swipe navigation.
EVIDENCE: ignored `artifacts/audit/item-context-*` and baseline logs, release PR/production workflow. No private account data accessed.
NEXT: merge only the tested frontend release, wait for the production workflow and verify exact live bytes; preserve all user storage and production databases. User explicitly requested hosted release rather than another APK. Rollback: revert only this frontend commit through the same tested Pages workflow; no data migration/reset.
CHECKPOINT: `git log -1 -- docs/audit/STATE.md`; release branch `feat/item-info-production-20261116`. Do not confuse audit PR #52 or an embedded APK with this hosted release.

---

# Purchased-item sale entry repair — 16 November 2026

BATCH: OWNED-SALES. STATUS: implementation verified locally; full baseline/CI and Pages verification pending. User could not record a Maple logs sale after the item left recommendations. Added a persistent Purchased items list derived from all existing ledger records, with sale entry independent of recommendations/search/GE purchase limits. Partial sales and reload retain remaining quantity; original FIFO validation and storage keys unchanged. No user trade data or credentials accessed or edited. Synthetic browser regression passes; see `tests/owned-sales.browser.cjs`. NEXT: finish checks, publish the website fix, verify assets; no APK change.

---

# Latest navigation delivery — 16 November 2026

SWIPE-R2 web repair is complete and deployed: PRs #58/#59, production `99fcd36ac9eed80a56362f8a5de465052a5367f2`. Exact-head CI 43780386225 and existing Pages production workflow 43780619441 passed. All 129 JavaScript, 56 Python, release and four browser programs passed, including 26 native-touch cases and delayed loading of each desk script. The final production job adds native-touch smoke and publishes its artifact.

Independent production readback matched all 38 asset hashes. Actions and the task browser each completed six switches (OSRS gestures started inside the recommendation box), with 0px vertical discontinuity, retained selected item, 225px native vertical scrolling in the same box and no page errors. See [report](SWIPE-REPAIR-2026-11-15.md) and [evidence](SWIPE-EVIDENCE-2026-11-15.json).

Physical Android feel/frames remain unverified; reopen the existing app at the unchanged Cloudflare origin for that acceptance. No replacement APK or storage/identity change is needed or authorized. Do not repeat the completed source release or claim the broader audit/OSRS v4 migration complete. Earlier unrelated audit gates below remain separate.

---

# Latest tested UI delivery — 15 November 2026, 23:27 UTC

PR #57 merge `ec01fea4725ae53534429811f950867561622025`; exact-head regression `43774621881` succeeded; native preview `43774621875` succeeded; exact hash verified production Pages `43774776938` succeeded. New UI: smoother 145–315ms compositor-only game switching, idle OSRS prewarm, native vertical scroll retained inside OSRS idea box, horizontal swipe from the nested scroll area recovered via Touch Events, no DOM or ledger reset. No original native APK is required for a Cloudflare update. Still request real-phone gesture confirmation before closing physical UX gate.

Original Golden Exchange v4.0 source is available in the user's ChatGPT Library archive `The-Golden-Exchange-v4.0-complete-delivery.zip`; nested `The-Golden-Exchange-v4.0-source.zip` inspected and confirmed 167 project entries with original OSRS modules/tests. Not committed to this repository. Current `app/dual-hub.js` OSRS importer still accepts only `golden-hub-osrs-v1` backups. Original `golden-exchange-backup-v3` contains richer corrections, tickets, owned, settings, audit; NEVER discard these on import. Full v4 parity/migration is still OPEN, as are physical Android proof and prospective model calibration. Don't imply full audit completion.

---

# Latest verified delivery — 15 November 2026, 22:53 UTC

PR #56 merge `247dab5cc78c370027e578954c1f4559c1a23a7e`; full exact-head regression check `43771445550` successful. Approved Worker/D1 release `43771653374` successful. Private read-only follow-up `43771726600` successful, `RECENT_WRITES_VERIFIED`: 1 active/fresh monitor, 49 recent polls, 197 recent trade records, 299 recent events, 0 monitor warnings, 0 observed complete order nights. Private D1 opt-out SQL triggers and GitHub-only fallback Worker mode are now deployed. Existing user trading history remains; no live order actions.

The current Cloudflare Pages UI was successfully checksum-verified at run `43768703959` for commit `bbb4c958f9f2ba5b38531875cfb239e91acfce69`. Later main changes are backend/docs only. The separate Android debug preview is **not** an in-place replacement for an original installed app. Major unresolved acceptance gates: physical-device checks, original package/signing continuity, complete OSRS v4 migration/feature parity, long-run live user evidence and held-out calibration. Remain honest about those gates.

Next safe work: preserve source/data as-is, perform non-destructive phone/profile checks when accessible, and implement versioned OSRS v4 migrations only with the complete source/export schema; never discard unknown fields. Keep the GitHub fallback monitor singular. Re-run aggregate readback after a **new** scheduled GitHub poll, since this same-minute check proves data preservation but not a fresh post-migration poll. No extra D1 migration or release needed for PR #56.

---

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
