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

# Navigation repair released — 16 November 2026

BATCH: SWIPE-R2. STATUS: DEPLOYED AND AUTOMATICALLY VERIFIED. PRs #58 and #59 are merged; production commit `99fcd36ac9eed80a56362f8a5de465052a5367f2` at `https://thegoldenpeanut.pages.dev/`. Final exact-head CI [43780386225](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43780386225) and Pages run [43780619441](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43780619441) succeeded.

FIXED: scroll-compensated full-screen movement, single pointer/touch ownership and fallback, interruption/reversal, nested recommendation scrolling, hidden-scroll and GW2 resume persistence, deferred expensive work, and complete two-desk startup before exposure. TESTED: 129 JavaScript, 56 Python, release integrity, all four browser programs, 26 native motion cases plus both delayed-script boot cases. Production: 38 exact served hashes independently repeated; six deployed switches in Actions plus six independent browser switches, all 0px vertical discontinuity, vertical card scroll 225px, selected item retained, no page errors.

EVIDENCE: [repair report](SWIPE-REPAIR-2026-11-15.md), [aggregate evidence](SWIPE-EVIDENCE-2026-11-15.json), [production screenshots/frames/report](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43780619441/artifacts/14188561398). No replacement APK, signing/package/origin/credential/storage changes, data reset or in-game order action. NEXT: physical-phone acceptance in the original Android app remains OPEN; browser automation is not physical WebView FPS. The broader audit remains open. CHECKPOINT: discover via `git log -1 -- docs/audit/STATE.md`.

---

# Live UI repair checkpoint — 15 November 2026, 23:27 UTC (PR #57)

**PR #57 MERGED, CLOUDFARE PAGES RELEASE VERIFIED:** Merge commit `ec01fea4725ae53534429811f950867561622025`, exact-head regression run `43774621881` successful, Android preview build `43774621875` successful, main-branch production Pages run `43774776938` successful including exact SHA-256 of every deployed asset. Existing website origin `https://thegoldenpeanut.pages.dev/` unchanged; original Android WebView continues to load this URL, so no APK reinstall is required for these website changes.

**FIXED SWIPE/UX:** OSRS suggestion box now supports horizontal game-switch gestures while retaining native vertical scrolling; added WebView Touch Events fallback and vertical/horizontal axis lock, moved OSRS prewarm to idle, removed scan/render work from pointermove, shortened drag release to 145–315ms compositor-only transform, removed layout-thrashing height animation, bounded stalled animations. Browser suite covers nested card touch movement, vertical gesture noninterference, account data and scroll state. Real owner-phone acceptance remains to be observed rather than presumed.

**RECOVERED ORIGINAL OSRS V4 SOURCE:** The user's persistent ChatGPT Library contains `The-Golden-Exchange-v4.0-complete-delivery.zip`, and inspection in session extracted nested `The-Golden-Exchange-v4.0-source.zip`: 167 source entries, including `www/core.mjs`, `www/storage.mjs`, `www/database.mjs`, `www/workspace.mjs`, `www/intelligence.mjs`, `www/simple-plan.mjs`, `www/studio.mjs`, and the original automated tests/Android project. The archive itself was NOT added to GitHub, and full v4 integration remains a separate audited task. Do not claim OSRS advanced parity or original v4 backup migration implemented.

---

# Live repair checkpoint — 15 November 2026, 22:53 UTC (PR #56)

**PR #56 MERGED AND PRIVATE WORKER DEPLOYED:** Source merge `247dab5cc78c370027e578954c1f4559c1a23a7e`; exact-head CI `43771445550` completed successfully. Isolated Worker/D1 deployment `43771653374` completed successfully, including schema deployment, encryption checks and health/preflight verification. Post-deployment aggregate-only D1 audit `43771726600` completed successfully with `RECENT_WRITES_VERIFIED`, 1 active/fresh monitor, 49 recent polls, 197 recent trade records, 299 recent events, zero warned monitors, and 0 observed complete nights (not equivalent to no partial fills). No user account IDs, trade rows, keys or private logs were output.

**FIXED:** Opt-out write fences on all five private observation tables; no GitHub bootstrap reactivation of disabled enrollment; delayed Worker status writes are conditional on enabled=1. Deployed Worker now advertises and obeys GitHub-only collector fallback (no competing Worker cron/initial snapshot) while the GitHub private collector remains active. Existing personal records survived migration. The public Pages app's latest checksum-verified release remains `bbb4c958f9f2ba5b38531875cfb239e91acfce69`, run `43768703959`; latest performance fixes #53–#55 are on the live web app.

**STILL NOT FULLY VERIFIED:** Real Android hardware and original APK signing/upgrade, complete standalone OSRS v4 state parity/migration, a complete zero-inclusive 24h personal execution cohort (0 observed nights as of readback), external real-world fill/forecast calibration, 90-day/prehistory coverage and all remaining audit roadmap phases. Do not call the entire application or audit complete based only on green CI. No original app package/IndexedDB was deleted, replaced or migrated, and no Trading Post orders were modified.

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

# Golden Peanut — source audit and live-verification checkpoint

**15 November 2026. Reviewed source PRs #41, #42 and #43 are merged.** Main includes Previous/Next-only navigation; compact public metadata, per-item chart history, coalesced search and market-plan caching; corrected private-monitor opt-out, history coverage, account switching and cursor safety; and one checksum-verified Pages deployment workflow. Full source/Python/JavaScript/desktop+mobile-width Chromium/actionlint CI passed for PR #43 at tested head `15c1b1e3d668def3516a0486d6c2c91db82e584d`. Source merge commit `f0aba45489c0734391c8941c8937d9b6be9cbd95`.

**Public dataset successfully published.** The new `data/market_index.json` and all 32 `data/market_history_shards/[0..31].json` files exist on main as of collector commit `f8c79dd064d8b4057233131e89118539bc132eb9` (data generation `ba90589eb46091f11dd9`, generated `2026-11-15T01:20:31Z`). Each shard parsed, shared the exact generation, had the expected modulus index, and its IDs mapped uniquely to its own shard. Together they held **28,009 unique item histories and 280,040 dated price observations** (the history need not have the same ID count as the current quote catalogue). Raw on-repo file sizes: full public snapshot 15,657,485 bytes vs metadata index 1,550,013 bytes (~90.1% less); full daily-history JSON 7,282,058 bytes vs mean history shard 227,764 bytes (~96.9% less per selected item). This is a file-size reduction, **not a measured phone startup latency or network-compression comparison**. No real executed market turnover was inferred.

**Live verification still open.** Requested public snapshot regeneration, approved Worker release and privacy-safe aggregate D1 readback via main-path trigger commits `b66af46`, `9233fef`, `9a46f53`. The public collector emitted the new data commit above, proving its publication. The connected GitHub interface has not exposed a confirmed successful Worker deployment, private D1 readback or Pages exact-checksum production run for the source merge. The hosted URLs were inaccessible to direct verification in this session. **Do not claim the installed Android app or Worker has the latest revision** until the workflows themselves report success and Pages served-asset checks pass.

**Remaining empirical gates:** actual enrolled account and phone-closed private poll continuity; completeness of 90-day transactions/earlier historical cost basis; a real prospective 24-hour matched buy→resale holdout with censoring and queue positioning; dual scheduler race/inflight opt-out protection; Android WebView performance/Back/rotation/memory measurements. These are deliberately flagged BLOCKED/UNVERIFIED rather than invented.

Primary audit: `docs/audit/COMPLETE-COVERAGE-2026-11-15.md` covers P0–P12. `docs/audit/FINDINGS.md`, `docs/audit/PERFORMANCE.md`, `docs/audit/ROADMAP.md` and `docs/audit/RESUME.md` track details. Historical work `audit/competitive-exposure` draft #31 is not merged. No deletion of user IndexedDB, API key, personal ledger, private D1 records or actual GW2 Trading Post orders.

**Resume:** Confirm successful runs of `guided-ui-production.yml`, `account-monitor-deploy.yml`, and `private-readonly-audit.yml` via GitHub Actions. Their manual workflow_dispatch buttons may be needed if repository API commits do not trigger push workflows. Use the exact current source and verify no stale files; do not bypass checks. Then perform real-device and real-account independent validation before asserting model calibration.

**2026-11-15, 01:48 UTC — verified OSRS-style chart release.** PR #44 source merge `3eee015e3fb4b3a1a94f1c4a6b5eae8c8c1dd988`, Pages release-request commit `9af8a6b98c0f698cef24e1f8cb9109d4d48f8227`. GitHub Actions workflow run #43664749794 completed **success**, including the existing Pages project/production-branch check, source/Python/JS + mobile/desktop browser tests and the final `scripts/verify_live_release.py` check: **33 exact served asset SHA-256 matches** at `https://thegoldenpeanut.pages.dev/`. This confirms Cloudflare Pages deployment, **not** a newly packaged Android APK or real-device FPS. The chart is an independent native modal with date inspector, 7 calendar-day / all-recorded range and touch pan/pinch; no invented hourly data.
