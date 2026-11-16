# Hosted item guide released — 16 November 2026

BATCH: ITEM-GUIDE-LIVE. STATUS: DEPLOYED AND VERIFIED at https://thegoldenpeanut.pages.dev/.
FIXED: always-visible What is it?/Where can I get it? section directly below OSRS item name, with examine text, attributed Wiki summary, membership/acquisition guidance and source link. Preserved current swipe/owned-sale behavior. No database, collector, credential, installation or schema changes.
TESTED: 129 JS, 56 Python and all assembled browser suites; exact-head CI 43832170856 passed. PR #62 merged as `918702e73a64336ce3135249c4fe54acba56bd6e`; production run 43832501313 passed, including exact hashes of every served asset and actual hosted touch navigation. Read-only build-info independently confirmed that same release SHA. Local headless production inspection requires the workspace proxy and is not physical-phone evidence.
EVIDENCE: https://github.com/tnolanwood-rgb/golden-peanut-data/pull/62 and https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43832501313; ignored `artifacts/audit/item-context-*` and baseline logs. No private records accessed.
NEXT: user can reopen the hosted app to load the released assets. Do not substitute the embedded test APK for the hosted app. R2 audit PR #52/backend migration is separate and was not merged by this release. Rollback: revert only frontend code through the tested Pages workflow, preserving all storage.
CHECKPOINT: final release evidence saved on `feat/item-info-production-20261116`; use `git log -1 -- docs/audit/STATE.md` there. This documentation checkpoint does not redeploy or change the served release SHA.

---

# Hosted item guide release — 16 November 2026

BATCH: ITEM-GUIDE-LIVE. STATUS: prepared for the user-authorized production release; confirm the PR and exact served hashes before claiming deployed.
FIXED: item context is an always-visible section directly beneath the OSRS item name (not a collapsed details control). Includes examine text, attributed Wiki summary, membership/acquisition guidance and source link, with bounded independent requests/cache and stale-response guards. Based on current production main, retaining its swipe/owned-sale fixes. No collector/schema/persistence changes from audit PR #52 are included.
TESTED: dedicated visibility/item-switch/escaped-text browser case and source checks passed. Full local source/Python/JavaScript/assembled browser baseline passed; exact-head PR CI must pass before merge; production workflow reruns checks, verifies every deployed asset hash and real hosted swipe navigation.
EVIDENCE: ignored `artifacts/audit/item-context-*` and baseline logs, release PR/production workflow. No private account data accessed.
NEXT: merge only the tested frontend release, wait for the production workflow and verify exact live bytes; preserve all user storage and production databases. User explicitly requested hosted release rather than another APK. Rollback: revert only this frontend commit through the same tested Pages workflow; no data migration/reset.
CHECKPOINT: `git log -1 -- docs/audit/STATE.md`; release branch `feat/item-info-production-20261116`. Do not confuse audit PR #52 or an embedded APK with this hosted release.

---

# Audit roadmap

Statuses: TODO / IN PROGRESS / BLOCKED / VERIFIED / FAILED. VERIFIED requires the
specified evidence, not merely implementation. Phases proceed in order except a
critical trust/data-integrity defect may be repaired early. User now prioritises
market discovery, followed by calculation correctness and useful bids. Release
identity remains TODO; next batch is P4-002 before the accounting oracle.

| ID / subsystem | Objective | Depends on | Impact | Required evidence / acceptance | Status |
|---|---|---|---|---|---|
| P0-001 / harness, monitoring | Establish current baseline, durable checkpoints; make collection failures visible | none | Critical | Reproduce false zero exit; real-entry-point failure/success/skip/privacy tests; reproducible baseline, GitHub checkpoint/PR; CI 42324153790 passed | VERIFIED |
| P0-002 / release | Reconcile stale version markers, exact deployed assets and CI browser prerequisites | P0-001 | High | Old/mixed release rejected; current source accepted; independently verify production assets or classify HTTP block | IN PROGRESS |
| P1-000 / bid integrity | Bound expected profit by completed resales; share wallet; preserve uncertainty | P0-001 | High | Impossible-profit and wallet regression plus assembled mobile/desktop UI rejection | VERIFIED |
| P4-000 / discovery budget | Prevent early lanes starving public/recipe scanning | P0-001 | High | Crowded disjoint lanes at budgets 20/800/6500; bounded unique IDs; existing catalogue rotation and browser regressions | VERIFIED |
| P4-001a / category gates | Trace catalogue to displayed research by category; repair exclusion at highest-impact gate | P4-000 | Critical/user priority | Reproducible counts/rejection reasons for commodities, consumables, equipment and upgrades; safe research beyond favourites; measured gate replay and low-margin browser regressions | VERIFIED |
| P4-001b1 / seed category diversity | Prevent dominant spreads starving smaller official categories | P4-001a | High | Failing 999-weapon/one-bag fixture; bounded distinct seeds; replay and assembled tests | VERIFIED |
| P4-001b / remaining category coverage | Audit name/unlock restrictions, category seed starvation and catalogue search | P4-001a | Critical/user priority | Replay + adversarial category fixtures + real browser search; research remains separate from bid eligibility | VERIFIED |
| P4-001c / remaining numeric gates | Audit ROI/price/depth exclusions, rejected-item search and bounded rotation | P4-001b | High | Rejection replay, safety-versus-policy distinction, positive-margin research with watchlist cautions; fixed-catalogue 18-pass coverage | VERIFIED |
| P4-001c1 / price and quote validity | Separate research prices from funding; reject malformed public quotes | P4-001b | High | Above-wallet browser regression, malformed-input unit cases, offline replay and assembled suite | VERIFIED |
| P8-000 / family-loop overhead | Stop repeated catalogue enumeration | P4-001c | High | Identical IDs/order, bounded enumeration and comparative benchmark | VERIFIED |
| P4-002 / live discovery coverage | Verify tradeability, freshness, interrupted scans and persistent rotation | P4-001c | High | Ingestion-to-displayed coverage and cursor recovery, explicit partial data | TODO |
| P1-001 / accounting | Verify all money definitions: dedup/pagination/partial fills, FIFO, rounded fees, unknown initial costs, realised/unrealised, UK day/7-day/DST, wallet/escrow/delivery, isolation, integer bounds | P0 | Critical | Independent oracle fixtures + >140k records; each displayed metric has source/coverage; today's matched profit remains first and incomplete totals labelled | IN PROGRESS |
| P2-001 / private monitoring | Trace ArenaNet → Actions → D1 → authenticated Worker → local persistence → decisions; prove closed-phone continuity | P1; live access for end-to-end | Critical | Recent successful persisted poll, idempotent event import, missed/duplicate/partial/zero/cancel observations; restart/no-reconnect, pagination/retry/D1 limits/error handling; no false-green attempts | IN PROGRESS |
| P3-001 / lineage | Catalogue all important datasets (personal trades/orders/exposure/zeros, quotes/history, metadata/recipes/families, allocations/evaluations), owners/schema/coverage/freshness/consumers | P2 | High | Each useful dataset has a causal-insertion test changing intended decision; otherwise explicitly archival; F003 labels repaired in P1-000 | IN PROGRESS |
| P4-001 / discovery | Whole tradable economy including all-tier commodities, food/utilities/upgrades/containers/components, salvage/forge conversions and seasonal markets | P3 | High | Deterministic category/ID coverage and rotating exploration budget; unseen candidates; eligibility/freshness/fees; behavioural analogues not name-only proof; verify F005 | TODO |
| P5-001 / execution | Separate acquisition/resale quantities at 24h/3d/7d when supported; small to commodity-scale lots, queue/exposure/cancellation/time uncertainty | P1,P3,P4 | Critical | Zero/censored outcomes retained; standing depth never execution volume; slower high margin vs faster lower margin counterexamples; no unsupported probability/calibration claims | TODO |
| P6-001 / capital | Wallet, escrow, inventory, delivery and hypothetical large budgets; incremental capital, concentration, holding time, queue preservation and recycling | P5 | Critical | Conservation/duplicate exposure adversarial tests; funded vs hypothetical/exploratory separate; alternatives do not automatically cancel good orders | TODO |
| P7-001 / evaluation | Chronological out-of-sample comparison of profit/turnover/spread/risk/analogue/capital-efficiency models | P5,P6 | High | No future leakage; profit/ROC/fills/turnover/loss/unfilled exposure/utilisation/calibration/error/concentration; preserve failures; simpler model wins unless independently surpassed | IN PROGRESS |
| P8-001 / performance | Profile cold/warm launch, restore/refresh/render/search/details/Back/scroll/icons/IDB/memory/long sessions on S23 Ultra where available | P0,P1; subsequent shared changes | High | Comparable recorded before/after; emulation labelled; inspect sorts/render loops/caches/DOM/observers/timers; no dropped evidence/stale quotes/hidden categories | IN PROGRESS |
| P9-001 / UX | Every enabled control and key journey: profit/opportunities, rarity/currency, history/orders/search/capital/planner/settings/privacy/back/reopen | P1,P6,P8 | High | Repeatable browser journeys incl system Back; real vs conditional vs forecast clear; remove clutter without hiding relevant decisions | IN PROGRESS |
| P10-001 / reliability/security | Secrets/auth/isolation/rate limits/input validation/dependencies; corrupted/incomplete/concurrent writes, migration/backup/restore/rollback | P1,P2 | Critical | Synthetic failures + safe read-only infrastructure checks; no keys/private fixtures in CI; no deletion/reset/destructive migration; recovery test proof | IN PROGRESS |
| P11-001 / adversarial stress | >140k trades, many orders/markets, sparse/bulk/zero fills, out-of-order records, interrupted imports, switches, 429/5xx/D1 errors, corrupt storage, slow network, rapid Back, memory/DST | P1–P10 | High | Bounded synthetic load and predictable errors; integrated failures reproducible, no live load attack | IN PROGRESS |
| REL-001 / authorized release | Deploy verified discovery fixes | PR #20 checks | High | Successful production workflow and exact live asset hashes (14/14) | VERIFIED |
| P12-001 / production | Independently reconcile deployed app/assets, runtime/monitor freshness/isolation and all backlog outcomes | P0–P11; authorized release/access | Critical | Exact live assets + backend persisted observations + user journeys; blocked paths labelled; no known critical finding silently omitted | IN PROGRESS |

Do not mark an entire phase complete because one representative test passes. Phase 0
remains partial until P0-002 resolves baseline identity. External access blocks only
dependent checks: continue safe local work, without inventing production evidence.

QH-001 / UI quote boundary: remove globally multiplied public quote quantities/profits. Critical screenshot defect. Depends on current main; acceptance: saved250/1700g footwear browser regression and original financial tests. VERIFIED locally; deployment pending.

## 15 November 2026 checkpoint

- P3-001: source-to-consumer connection inventory now documented in `SYSTEMS-2026-11-15.md`; full causal-insertion and authenticated private-D1 readback are still open. Do not call VERIFIED.
- P8-001: draft PR #42 reduces public startup/chart bytes, coalesces search and guided rerenders, adds source and Chromium checks and synthetic CI payload benchmark. Production Android p50/p95, memory and real transfer counts remain TODO.
- P9-001: PR #41 removes redundant Skip, restores Previous/Next and protects focused capital inputs. The rest of the full user journey and physical Back/rotation checks are still TODO.
- P0-002, P1-001, P2-001 and P10-001 are **not** closed by a performance PR; exact hosted release, accounting oracle, private polling and authenticated reliability proofs are separate gates.

## 15 November 2026 full-scope follow-up, PR #43

- **P0-002 IN PROGRESS:** single guarded production Pages pipeline with per-file SHA-256 verification and exact commit identity; source tests and release workflow must pass, live hashes still unverified until deployed.
- **P1-001 IN PROGRESS:** independent FIFO, fee rounding, unknown opening stock, DST and >140k record stability tests added. Live account completeness and historical missing basis remain unknown.
- **P2-001 IN PROGRESS:** Worker opt-out tombstone, bounded history coverage, browser account/cursor isolation fixed and tested. Live D1 aggregate-only checker added; closed-phone complete observations not yet established.
- **P3-001 IN PROGRESS:** `COMPLETE-COVERAGE-2026-11-15.md` traces every major data source/storage/decision subsystem. Full causal insertion proof for all niche components remains open.
- **P4/P5/P6 IN PROGRESS/TODO:** old verified discovery/quote and source tests retained; no fabricated execution throughput. Queue/cancel/crafting supply effects not promoted.
- **P7-001 IN PROGRESS:** backtest is chronology-gated and model promotion disabled; no live future held-out cohort available to show calibration/utility.
- **P8/P9 IN PROGRESS:** source optimisations, cache improvements and previous-only/next-only UI regression tested. Actual Android FPS, lag, cold/warm p50/p95, physical Back/rotation remain unmeasured.
- **P10/P11 IN PROGRESS:** privacy opt-out re-enrolment, account switch, cursor, private pagination and duplicate deployment paths repaired in code; live Worker/D1 and dual scheduler race need separate independent validation.
- **P12-001 IN PROGRESS:** aggregate-only D1 live-read workflow and exact live Pages hashes can now run using existing GitHub secrets; statuses must come from the actual workflow. If secrets, enrollment or a contiguous time series are absent, mark BLOCKED rather than manufacture evidence.

Deleting shared datasets, private IndexedDB records, background collector workflows or incomplete research branches merely to simplify the repository is prohibited. Retain potentially useful archival information until a measured consumer-equivalence test proves safe removal. See `COMPLETE-COVERAGE-2026-11-15.md` for the evidence matrix.


## HUB-R1 — 15 November 2026

The current full-scope Hub reliability repair batch is documented in [HUB-RELIABILITY-2026-11-15.md](HUB-RELIABILITY-2026-11-15.md) with sanitized [evidence](HUB-RELIABILITY-EVIDENCE.json). Local tests/build pass; PR exact-head CI pending. Cross-scheduler write/consent atomicity, physical/native acceptance, preview cloud-monitor CORS, real-account continuity/forecast calibration and complete standalone v4 parity remain OPEN. No deployment, migration, user-data reset or original-app installation/uninstallation was performed.

Saved implementation `54313199b2921822d7ba706c30d3551d97181c31`; [PR #52](https://github.com/tnolanwood-rgb/golden-peanut-data/pull/52) submitted. Full local checks passed. Final-head CI is tracked by the PR; no deployment occurred. Resume the documented OPEN gates after those results, without restarting verified baselines.

## Verified private consent / one-collector repair — PR #56

- **P2/P10 private opt-out integrity:** Database-level write fencing is deployed and tested, preventing an in-flight monitor from inserting/updating private order, trade, event, poll or night rows when consent is disabled. Explicit deletes still erase records. GitHub bootstrap cannot silently revive consent. Worker fallback is configured not to poll in parallel. Full CI, Worker deployment and read-only production aggregate checks passed (IDs in STATE). **This specific risk is VERIFIED**, while all other P2/P10 real-world evidence gates retain their previous statuses.
- **P12 live persistence:** Read-only aggregate health shows existing private records survived the guarded rollout: 1 active monitor, 49 recent polls, 197 recent trade records, 299 recent events, no monitor warning. Complete nights remain 0; no calibrated 24h predictions claimed.
- **P9 native:** Android preview CI was already successful; real installed production package update, original signing identity and physical screen rotation/back/backup verification remain BLOCKED without original installed package and direct device evidence.
- **P3/P4/P5/P6/P7 OSRS/GW2 model and v4 parity:** Not fully closed; never infer real fills from quote spreads. OSRS v4 state/migration not present in current simplified Hub, and model calibration awaits independent observed cohorts.

## SWIPE-R2 — user-prioritized navigation repair, 16 November 2026

Automated web release VERIFIED: PRs #58/#59 merged; exact-head CI 43780386225 and Pages 43780619441 passed. All source/Python/JavaScript/browser suites, 26 motion cases and both delayed-script startup cases pass. All 38 served hashes independently matched. Two browser vantage points each performed six live switches with 0px discontinuity and 225px native vertical recommendation scrolling. Physical Android smoothness remains OPEN; no broader audit phase closes here. See [repair report](SWIPE-REPAIR-2026-11-15.md).

## OWNED-SALES — 16 November 2026

Repair missing sale entry for owned items removed from recommendations. Synthetic regression verifies exhausted GE limit, no matching ideas, partial sale, reload, FIFO gain and completed holdings. Local/remote final checks and production verification pending.
