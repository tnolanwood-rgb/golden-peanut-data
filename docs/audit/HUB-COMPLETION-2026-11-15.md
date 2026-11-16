# Golden Trading Hub completed source repairs — 15 November 2026

Dedicated branch: `audit/hub-reliability-20261115`. Pull request: [#52](https://github.com/tnolanwood-rgb/golden-peanut-data/pull/52). Base: `12c09d9a85e3236f177fec8eedb6c2237eb34d03`.

This report supersedes the **code backlog** in the earlier [R1 report](HUB-RELIABILITY-2026-11-15.md). R1's stopping point was premature. The remaining collector serialization, preview CORS and full Golden Exchange v4 integration have now been implemented, rather than left as recommendations. Production deployment, private-account acceptance and physical Android tests are separate, unexecuted gates. A successful synthetic suite is not evidence of profitable forecasting or actual closed-phone collection.

## Implemented changes

The R1 repairs remain: honest OSRS discovery and feed failures, stale/future-data handling, tax/FIFO/limits corrections, lossless legacy identities and recovery copies, bounded chart/request caches, repeated-rotation/draft/chart restoration, GW2 scroll isolation, safe native navigation/file export, bundled frontend and protected production workflows. The public API capture and controlled replay are documented in R1; no opportunities, fills or predictive accuracy were invented.

### Golden Exchange v4 integrated without replacing GW2

The actual supplied standalone v4 source is now available through **Advanced trading desk** in the OSRS research view. It includes transactional personal-state IndexedDB, complete v3 backup import/export (journal, tickets, held/owned stock, settings, watchlist, correction audit), inventory adjustments, actual sale tax, paper research tickets, reserve/slot/held-stock-aware multi-item allocation, comparison and sensitivity/error tools. Its original 47 calculation/migration tests and 40 browser tests are retained, with two new conversion tests and two assembled Hub browser journeys. UI changes serve integration and reliability, not cosmetic redesign.

The integrated engine uses a separate `golden-hub-osrs-v4` database and `golden-hub-v4:` legacy namespace. It does not open or migrate the original `golden-exchange` database or the GW2 database. The earlier Hub journal is copied only after full validation. The exact source string and configuration are archived in the same transaction as the converted personal state. Source identities are stable, repeated handoff is idempotent, equal legitimate fills survive, advanced corrections cannot be overwritten by an unchanged source, and conflicting edits to an already handed-off source fail closed with both journals retained. Original localStorage strings remain unchanged. Normal writes retain the previous complete personal state. Explicit user deletion affects only the new isolated workspace and is marked to prevent silent re-import on reload.

The v3 import path preserves tickets, owned stock and audit entries. Legacy Hub JSON is converted into stable v3 journal identities; merge retains existing portfolio/settings. Unsupported or invalid backups are rejected without partial writes. The basic research view routes recording/import/export to the canonical advanced journal after handoff, preventing two competing personal ledgers. Research filters/budget remain research controls; the advanced allocator has its own explicit portfolio controls.

Embedded-only view snapshots preserve active view, selected research/chart, comparison selections, open items, correction identity and unsaved safe form values on recreation. They exclude file/password inputs and never contain API keys. Both games retain their original navigation; the native asset server now serves `.mjs` correctly.

Source provenance: the owner's `Golden-Trading-Hub-v1-source.zip`, SHA-256 `99a122a3f3b9ceb2e979b298b7f1551f5bda5e567be5231dcaf2a65d70a98bc4`, extracted under the separate build workspace. Authored modules and notices are retained in `app/exchange/`; pinned esbuild generates `desk.mjs`. CI builds this bundle before regression and Android packaging. No signing key is included.

### Shared private-collector fencing and atomic events

Worker and GitHub private collectors now share an account lease backed by the database clock. Acquisition is atomic, only one live owner can write, and every private mutation includes a live-owner/current-credential/enabled-consent predicate. Expired owners cannot renew, release successors or write after takeover. Disable removes the lease and invalidates old in-flight writes even when the same API key is subsequently reused. Bootstrap cannot overwrite another credential or reactivate a disabled account. A consent generation captured before enrolment's network checks prevents an old request from undoing a newer opt-out.

An additive schema creates the lease/consent tables and atomic trade/order event triggers. Source row and its event are committed by the same SQLite statement, eliminating the interrupted row/event gap. Replays do not duplicate events. Order disappearance remains explicitly unknown, not a fabricated fill. Existing historical rows are neither rewritten nor retrospectively synthesized. Existing explicit opt-out erasure semantics are retained; this audit did not invoke them.

Nine real-SQLite protocol tests exercise SQL generated by **both actual writers**, including 20 competing connections, expiration/takeover, stale release, disable/re-enable, cross-account rejection, failed transactions, replay/partials, credential races, idempotent additive schema and 1,300-row D1 parameter-bound batching. These are substantially stronger than mocks but are not a live Cloudflare D1 rollout test.

### Exact preview origin and safe rollout gate

The authenticated monitor permits the existing production origin and the exact Hub preview origin only. Other preview hosts, spoof suffixes and wildcard origins are rejected. Account/key/explicit-consent authorization remains required. The Android package/origin remain separate from the original apps.

The Worker deploy workflow requires `main`, manual dispatch and an explicit `collectors_quiesced` acknowledgement. Schema parsing uses `sqlite3.complete_statement`, so multi-statement trigger bodies are preserved. A release-request push alone cannot silently migrate the collectors. No production workflow, schedule, Worker, schema or database was changed by execution during this audit.

## Completed checks

- 124 root JavaScript tests plus 49 integrated Exchange tests: **173 passed**.
- Python suite including actual dual-writer SQLite races: **61 passed**.
- Existing GW2 desktop/mobile and Hub browsers, reliability/outage/rotation/recreation suite, advanced handoff and 1,002-fill integrity journeys: **passed**.
- Retained Exchange browser suite: **40 passed**.
- Android `assembleDebug`, `testDebugUnitTest`, `lintDebug`: **passed**; three native policy tests, zero lint errors, five disclosed warnings.
- Source/workflow/credential checks, actionlint and whitespace checks: **passed**. Optional local shellcheck/pyflakes are unavailable; remote CI uses its normal actionlint checks.
- APK signature v2 and ZIP alignment verified. Package `com.goldenhub.dual.preview`, version `0.4-audit-qa`, code 3, min SDK 26/target 34. All **69 embedded frontend files** match repository bytes; no private key is packaged.

Evidence: [sanitized JSON](HUB-COMPLETION-EVIDENCE.json). Full synthetic logs, APK verification, asset hashes and baseline are retained in ignored `artifacts/audit/`. The baseline records a dirty working tree because it runs before the source commit; final exact-head GitHub Actions results are authoritative and are recorded on PR #52. No private records are in committed evidence.

## Remaining verification limits

1. Physical Android rotation/process death, OEM background policy, gestures/Back, native document picker/blob export, memory/FPS and installed-app coexistence have **not** been exercised on a phone. Chromium resizes, reloads and lifecycle notifications cannot prove those behaviors. No device installation or uninstall was performed.
2. Collector protocol and preview CORS are implemented and locally tested, but their live behavior requires the reviewed, backed-up coordinated rollout below. Real-account D1 continuity, phone-closed polls and complete historical cost basis are **unverified**. No account was enrolled, disabled or queried for private data in this audit.
3. Forecasts remain research estimates, without a prospective matched-resale holdout. Current-rule historical sale tax is labelled as assumed unless actual tax is supplied. Unknown unrecorded purchases/costs cannot be inferred.
4. This is a signed debug QA build, not store release certification. It retains target 34 pending physical inset testing and requires an owner-controlled release key for a store build. Five lint warnings are retained and disclosed.

These are external acceptance gates, not unfinished implementations of the R1 code backlog. Production remains unchanged; PR #52 is unmerged.

## Non-destructive rollout and rollback

**Do not run the new collector against a partly upgraded schema or mix old and new writers.** Before an owner-approved rollout, export and verify a D1 backup and each original app's local backup outside app storage. Pause both private schedules and drain all in-flight polls. Keep the public collector running. Verify no private writer remains, then apply the additive schema and deploy the reviewed protocol-v2 Worker and GitHub collector together. Confirm lease/epoch tables and all four triggers exist, run a single controlled account poll, verify counts/consent/idempotency without exposing records, then resume schedules. The deployment input acknowledges these completed prerequisites; it does not perform or prove the backup/drain itself. No step in this checklist was executed on production here.

Rejecting this PR requires no production rollback. For a later application rollback, preserve all original keys/databases and the new v4 personal state/source archives; issue a higher-code APK using the same retained QA signer. Do not run the old truncating journal writer or convert a complete v3 backup into the earlier reduced format. CI debug keys may differ from the retained local key; never uninstall either original app to resolve a signature mismatch.

For a later collector rollback, pause and drain both writers first. Prefer rolling forward with the protocol-v2 fences and triggers retained. Redeploying an old writer while the new triggers remain can duplicate the old explicit event writes; it is not a safe source-only rollback. A reviewed coordinated rollback must restore a mutually compatible writer/event protocol and retain all existing observation/credential rows; never drop data tables or restore a stale database merely to revert code. Take a new backup before such work.

## Resume without repeating completed work

Read `STATE.md` and `RESUME.md`, verify the PR head and check results, and use `git log -1 -- docs/audit/STATE.md` for this checkpoint's exact commit. The next work is owner-approved production rollout or physical/live-account acceptance, not another implementation pass over the completed R1/R2 repairs. Do not merge/deploy or mutate private data merely to turn an external gate green.
