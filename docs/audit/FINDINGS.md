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

# Findings

| ID | Severity / certainty | Root cause and consequence | Repair / next test |
|---|---|---|---|
| F001 | Critical / CONFIRMED | `github-collector.py` caught API/D1/poll errors and returned normally. `__main__` discarded result; workflow could report successful collection after failure. Synthetic HTTP 503 exited 0 although original 10 tests passed. Secondary error-write failures could expose traceback. | P0-001, implementation `e81d770`: explicit 0/1 exit; safe failure reporting; 7 new process tests. No-key/disabled are explicit successful skips, not collection proof. |
| F002 | High / CONFIRMED | Main release-labelled 7.24 still uses `7.16.0-evidence` in integrity/release gates and package version. `pages-production.yml` checks old substring/static signatures; `pages-preview.yml` pins old 7.16 branch. Stale source can satisfy version checks; green deployment is insufficient identity evidence. | P0-002: exact source/asset/version negative tests. No production change in this batch. |
| F003 | High / CONFIRMED | `execution-engine.js` returns `calibrated:false`, while `market-board.js` marks forecasts `calibrated-24h` and `focus-edition.js` displays “CALIBRATED 24-HOUR OPPORTUNITIES”. Presentation asserts evidence the model explicitly lacks. | REPAIRED in 003c52b: observed/estimated labels; engine→board and assembled UI regressions. No live improvement claim. |
| F004 | High / UNVERIFIED PATH | Source has private collector, D1 schema and authenticated app import. Latest inspected run logs a success marker, but no independent persisted-row/readback-to-UI proof was accessible. | P2-001. Trace bounded private observations without exposing rows/account secrets. Do not confuse this with F001 reproducer. |
| F005 | High / SUSPECTED | Current `market-board.js` has equipment/name preferences (`souvenir`, Pearl/exotic kinds); later changes may reintroduce category bias despite complete public catalogue. | P4-001 category-neutral fixtures and full trace through shortlist budgets before concluding whole categories excluded. |
| F006 | Medium / CONFIRMED | 7.16 documentation claimed no Worker, no private collector, no GitHub write access long after these existed. No durable session state; conversation-only continuation would regress current main. | P0-001 adds authoritative audit directory, AGENTS startup protocol and historical-note links. |

No real-account profitability, missing transaction count, data corruption or physical
Android defect has been proved in this batch. Those remain tests to perform, not facts.

## Follow-up confirmed repairs

- **F007 / High:** expected-profit validation used full-lot margin only; positive
  profit with zero expected resales passed. 003c52b bounds profit by expected sold
  units (before rounded fees, so this is a necessary upper bound), rejects infinite
  sample counts, and proves invalid bids are rejected by engine and displayed UI.
- **F008 / High:** board checked each order against current wallet separately, even
  when total exceeded it. 003c52b reuses allocator across eligible rows; preserves
  hypothetical/funded kind instead of upgrading all rows to funded.
- **F009 / High:** scan quotas could consume the budget before public and recipe
  lanes. Prefix allocations were 25%+25%+16%+23%+34%; taking in sequence starved
  later categories. P4-000 reserves 25/20/10/15/10/10/10 percent for catalogue,
  positions, history, public, recipes, cheap equipment and equipment families;
  dedup/spare-slot filling retained. This does not remove downstream F005 filters.

- **F010 / High, CONFIRMED and REPAIRED:** public quote screening admitted positive
  small-unit margins, but board silently required at least 50 copper per item.
  7e15c00 removes that mismatch without inventing volume; 220 additional material
  and 124 consumable entries survive the offline snapshot replay. Coverage counters
  expose remaining gates. F005 is now partly confirmed: name/unlock/ROI policies
  reject thousands of otherwise screened research entries; needs P4-001b review.

- **F011 / High, repaired:** public seeds grouped only price/depth, so categories
  with lower spreads could get zero slots despite eligible quotes. c09ad57 adds
  metadata category to grouping; failing crowded-category fixture now passes.

- **F012 / High, repaired 2e29aa6:** research visibility depended on English name
  tokens (Mini, Recipe, Tonic etc.) and collection unlock subtype. Rename-invariance
  and unlock fixtures failed despite identical viable quotes. Removed these gates
  without adding execution quantities/income. Remaining numeric policies stay explicit.

- **F013 / High, repaired a456967:** board rejected valid public research above
  250,000 copper regardless of research capital. Removed ceiling; actual wallet
  affordability and funded-allocation checks remain. Browser confirms expensive
  row is only in unfunded watchlist, never funded or cheap-primary suggestions.
- **F014 / Medium, repaired a456967:** public quote screener did not validate IDs
  and accepted NaN/infinite/fractional/string standing quantities through coercion.
  It now requires positive safe integer IDs/prices/depth, retaining the existing
  minimum standing quantity policy until separately audited. Book size is not fills.

- **F015 / High, repaired 8e5bc43:** ROI/depth gates and an arbitrary 3% exit
  discount hid positive-margin quote research. Now use inside-quote prices, retain
  positive net research, caution wide/thin books in secondary watchlist, no income claim.
- **F016 / High, repaired d19ae75:** Object.keys(metadata) ran on each family-loop
  iteration. Cache cardinality once; 1002→2 enumerations at 1000 rows, same candidates.

QH-001 CONFIRMED/repaired 5cecc05: renderConnectedMarkets multiplied every public quote by ui.marketResearchLot (up to250), producing unaffordable 425,000g scenarios and attractive bulk-profit headlines. Arithmetic was conditional, but display looked actionable. Public quote view now has null quantity/cost/expectedProfit and explicit affordability; individual scenarios remain expandable.

## 2026-11-15 deep integrity audit (PR #43)

- **F017 / Critical — corrected in reviewed source:** Worker-enrolled /disable previously deleted `gp_monitor_credentials` outright. A still-configured independent GitHub collector secret could bootstrap the supposedly disabled account again. Worker now retains an inactive nonreversible token-digest tombstone regardless of backend, while deleting cloud observations and encrypted credentials. Separate removal of GitHub secret is still required for full source-secret revocation; validated by new Node fault-injection test. Production Worker deploy must be verified separately from Pages.
- **F018 / High — corrected in reviewed source:** A two-page first-run private history scan or bounded 12-page later scan could be treated like complete 90-day history. New explicit `HistoryBatch.coverage` and persistent `history_backfill_incomplete` warning distinguish capped from API-end; later overlap of known transactions cannot clear an old gap. No historical trades are invented or erased. Added Python tests, including D1 REST SQL-null compatibility.
- **F019 / High — corrected in reviewed source:** Browser asynchronous monitor requests could finish after a selected account changed, with cursor/status/evidence written against mutable account state. Refresh now snapshots account/key/DB, validates every page and monotonic cursor, deduplicates event replay, and marks unfinished pagination. Tests simulate account changes and malformed cursors. This prevents cross-account reporting but live crash/power-loss write atomicity still requires observation.
- **F020 / High — corrected in reviewed source:** Two main-branch production Pages workflows used separate concurrency locks. A publish success could refer to obsolete files and an old build string. Redundant workflow removed; remaining workflow writes build-info with SHA and verifies exact SHA-256 for each served public app asset, failing closed on mismatches. Manual preview no longer pins deleted development branch.
- **F021 / High — audit instrument, not live proof:** Independent 140k+ FIFO accounting oracle (partial unknown cost basis, rounded 5%/10% fees, UK DST), private monitor aggregate-only D1 readback script and checksum tests added. Production data still unobserved until controlled actions verify it.
- **F022 / High — remains an evidence blocker:** GitHub private collector and Cloudflare Worker can both write D1 for an account. Event idempotency is not a globally serializable per-account lease. Dual-scheduler race and 90-day historic gaps cannot safely be marked solved until an independently tested D1 lease/migration and live replay exist.
- **F023 / High — remains empirically unverified:** `GPExecution.backtest` does not allow automatic model promotion. Real out-of-sample calibration, phone-closed contiguous observation windows and live queue execution must be demonstrated with prospective data. Public asks/bids and standing depth are not sales.

Full source-to-consumer and P0–P12 evidence map: `COMPLETE-COVERAGE-2026-11-15.md`.


## HUB-R1 — 15 November 2026

The current full-scope Hub reliability repair batch is documented in [HUB-RELIABILITY-2026-11-15.md](HUB-RELIABILITY-2026-11-15.md) with sanitized [evidence](HUB-RELIABILITY-EVIDENCE.json). Local tests/build pass; PR exact-head CI pending. Cross-scheduler write/consent atomicity, physical/native acceptance, preview cloud-monitor CORS, real-account continuity/forecast calibration and complete standalone v4 parity remain OPEN. No deployment, migration, user-data reset or original-app installation/uninstallation was performed.

Saved implementation `54313199b2921822d7ba706c30d3551d97181c31`; [PR #52](https://github.com/tnolanwood-rgb/golden-peanut-data/pull/52) submitted. Full local checks passed. Final-head CI is tracked by the PR; no deployment occurred. Resume the documented OPEN gates after those results, without restarting verified baselines.

- **SWIPE-R2 / High, CONFIRMED:** #57 positioned incoming content at the outgoing document scroll, then restored the destination only after animation. Native touch/frame geometry reproduced a 360px jump despite 16.7ms frame p95. Duplicate pointer/touch processing, stale interrupted scroll, hidden-scroller zero snapshots, skipped GW2 resume saves, cached blank startup and pending background DOM/storage work also required repair. Repaired in merged #58/#59 and deployed as `99fcd36`; final CI and Pages verification passed, including 38 asset hashes and 12 live native-touch switches across two browser vantage points, all 0px discontinuity. Physical Android acceptance remains separate. See [repair report](SWIPE-REPAIR-2026-11-15.md).

- **OWNED-SALES / confirmed UX defect:** sell entry was coupled to the current recommendation. Purchased items could become unreachable for sale entry after market/filter/GE-limit changes despite their ledger records remaining saved. Added independent ledger-derived open holdings and explicit Record sale actions; synthetic partial/reload/completion regression passes. No data migration.
