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
