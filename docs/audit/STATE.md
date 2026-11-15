# Active Hub reliability checkpoint — 15 November 2026

Branch `audit/hub-reliability-20261115`, based on `12c09d9a85e3236f177fec8eedb6c2237eb34d03`.
See [repair report](HUB-RELIABILITY-2026-11-15.md) and [evidence](HUB-RELIABILITY-EVIDENCE.json).

BATCH: HUB-R1. STATUS: local repairs and full checks verified; PR/remote exact-head CI checkpoint pending.
FIXED: discovery/state/persistence/native/workflow defects listed in the report; GW2 engines and user data retained.
TESTED: 123 JS, 52 Python, 3 native unit tests; all browser scripts; Android build/lint (0 errors, 5 warnings); actionlint. Public payload replay is observational, not predictive validation.
EVIDENCE: committed sanitized report/JSON; ignored local full logs, APK/signature/alignment/frontend manifest in `artifacts/`.
NEXT: save branch/PR and verify exact-head CI; then address cross-scheduler consent/write fencing, safe v4 parity and native/live-account gates. No deployment/migration/installation authorized by this checkpoint.
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
