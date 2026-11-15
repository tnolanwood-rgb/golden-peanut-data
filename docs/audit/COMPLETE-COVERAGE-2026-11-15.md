# The Golden Peanut — full-system audit coverage, findings and evidence

**Audit checkpoint:** 15 November 2026  
**Repository:** `tnolanwood-rgb/golden-peanut-data`  
**Source basis:** `main` after PRs #41 and #42; deeper repairs staged in PR #43.  
**Evidence standard:** Distinguish code path, synthetic regression, public API publication, authenticated private data, served production, and physical Android. Do not infer higher confidence from a green GitHub test alone.

## Executive verdict

**Architecture:** The GW2 account API, historical ledger, public quotes, candidate discovery, execution learning, optional closed-phone private monitor, empirical forecast gate, hypothetical capital planner, legend/crafting screens and guided view are wired into the current code. Some data are independent corroboration, not directly profitable predictions. The application is read-only: no automatic TP placing/cancellation.

**Integrity weaknesses identified:** A multi-backend monitor stop could leave no disabled tombstone and permit GitHub re-enrolment; a private history poll could hit its 2-/12-page cap without explicit coverage warning; asynchronous browser import could save old-account status after a switch; private cursor page data were insufficiently checked; two production workflows could deploy concurrently; preview pinned an obsolete branch; production upload checks used a stale protocol string instead of exact asset identity. All have code fixes in this audit branch, with new unit/regression tests. **They do not count as deployed Worker or verified D1 changes until the controlled live workflow reports success.**

**Performance weaknesses:** Published public index and 32-way price-history slices from PR #42 reduce raw payload needs; search and guided rendering are coalesced/cached. Source `data/market_index.json` and `data/market_history_shards/` were absent on `main` during audit before the next collector. Their absence forces full-file fallback. Site-level `no-store` also blocked useful conditional client revalidation. This audit proposes `no-cache, must-revalidate` for only the public static site; private requests retain independent no-store policies. Quantified gains from prior Node fixtures are **not** physical device latency.

## End-to-end system coverage

| Gate | What was inspected/tested | Status and remaining proof |
|---|---|---|
| P0 source/release provenance | CI `check_release`, SHA-based server identity verifier, duplicate Pages deploy, stale preview checkout | Source tests pending PR #43 CI; hash verifier must succeed against the actual Pages hostname after deploy |
| P1 accounting | FIFO matching of independently observed buys/sells; two-sided fee rounding; missing cost basis; UK DST; 140,100 shuffled records; transaction conflict detection | Added `tests/accounting-oracle.test.cjs`; live user ledger completeness, pre-90-day opening stock and all unobserved withdrawals cannot be proved from client code alone |
| P2 private monitoring | Worker opt-in, AES-GCM, D1 schemas, GitHub fallback, errors/timeout, page caps, account-lock, monotonic event cursor, opt-out, restricted error logs | Confirmed/fixed issues in Worker/collector/client. Read-only aggregate live D1 workflow added. **Not yet independently verified on live D1 or an actually sleeping phone** |
| P3 lineage | Data source → importer → IndexedDB/D1 → price/volume model → UI for every major dataset | Existing matrix in `SYSTEMS-2026-11-15.md`; dynamic tests cover key edges; full causal replay of every rarely used input still open |
| P4 discovery | Full public quote catalogue, candidate-category diversity, rotation, recipe seeds, current quote freshness, policy exclusions and research-only leads | Existing category/size/rejection fixtures and `live-data.test.cjs` are green at prior releases; real-time scan/seasonal coverage and interrupted live reprobes need independent sampling |
| P5 execution estimates | Prospective joint buy→list→sell samples, zero and censored periods, fee reserves, uncertain queue position, exact lot matching and future-data limits | Model refuses unsupported predictions and does not infer fills from public standing orders. Real prospective fill probability is not established |
| P6 capital | Spendable wallet vs committed buy escrow, delivery/inventory holdings, canceled-order hypothetical scenarios, risk concentration and no re-use of future proceeds | Existing portfolio and execution fixtures verify no immediate double-allocation. No live cancellation or gold movements performed |
| P7 evaluation | Chronological `GPExecution.backtest` train `knownAt < start`, empirical range/MAE/zero and persistence baselines, no automatic model promotion | Offline evaluator tested; needs genuine future independently observed windows with coverage and realistic queue exposure to claim calibration or performance lift |
| P8 performance | Startup quote overfetch, chart full-history download, search DOM rebuilds, routine guided board recomputation, app static response headers | PR #42 source optimisations merged; audit adjusts static caching. Cold/warm p50/p95/heap/DB on a physical Android install remains unmeasured |
| P9 interface/accessibility | Previous/Next only, coin imagery and denominations, clipped small-phone layout, report/chart zoom, Back navigation, search, capital input focus, settings | Existing desktop + mobile-width Chromium tests pass at prior commit; physical Android system Back, rotation and interaction latency remain unverified |
| P10 security | API key storage and outbound boundaries, opt-in/out privacy, D1 AES-GCM, worker CORS, query strings, account isolation, backup, deployment credentials | New safety repairs and tests added. Direct browser ArenaNet bearer headers can trigger unsupported CORS preflight; don't switch auth blindly. Runtime secret access requires trusted CI only |
| P11 adversarial resilience | 140k trades, >300 open positions, 1,549 new market leads, malformed pages, canceled orders, 429/5xx/partial D1 writes, interrupted browser imports | Existing stress and synthetic tests plus new account-switch/pagination/opt-out tests. Physical long-session memory and real rate-limit behavior still need live observation |
| P12 live production | Existing Pages project verification and exact served-file SHA-256; private read-only D1 aggregation and collector published generation parity | Tool session cannot directly reach Cloudflare and has no private account rows. New CI workflows can run with repo-owned credentials; statuses must be read from **their actual runs**, not assumed |

## Critical decisions and data integrity policies

1. **No premature model promotion.** `GPExecution.backtest` returns `promotionAllowed:false`. Public order-book quantities are outstanding orders, not executed volume; quote differences are not proof of actual fill speed. Historical winning markets are research leads, not automatic 24h forecasts.
2. **Conservative history warnings.** A successful recent private poll is distinct from complete historical backfill. If first-run history exceeds two pages or later page caps, the GitHub collector now records a `history_backfill_incomplete` warning that is not erased by an ordinary overlapping recent-page scan. Reaching actual API end is required to clear it. Historic fills beyond ArenaNet's retention remain unknown.
3. **Explicit opt-out beats any scheduler.** The Worker disable action now preserves a disabled token-digest tombstone after deleting all private observation records and encrypted credentials. GitHub's independent scheduled collector checks that tombstone before connecting ArenaNet.
4. **Account isolation survives async races.** Event imports capture account, key and DB identities; changes during a network page cannot write old-account results into newly selected account's config/ledger. Pages must have strictly increasing IDs and a consistent cursor. Raw event replay is de-duplicated.
5. **No silent trailing event pages.** A 25-page import cap is shown as `importComplete:false` rather than treated as finished; the cursor remains resumable and no false complete status is claimed.
6. **One production pipeline.** A redundant Pages deploy workflow is deleted; the canonical one validates the existing Cloudflare Pages project/branch and compares SHA-256 of every publicly served app file, including generated commit identity, before declaring success. Preview uses the branch explicitly selected in Actions.
7. **Do not delete the ledger, D1 schema, saved keys, source quotes, public historic data or crafting models for a faster demo.** Keeping them is intentional until their use is causally disproved. Removing legacy `app/index.html` blocks wholesale would risk loss of IndexedDB migrations and historical trading intelligence.

## Known blockers: cannot be ethically marked VERIFIED by code review

- Whether the **private GitHub/Worker collector actually obtained and persisted recent data** for the user's account, and whether a phone-closed 24h window is continuous, needs authenticated D1 aggregation and real poll sequence. The read-only workflow reports aggregate statuses only.
- Whether profit estimates **beat a zero-profit or last-known-price baseline on live, held-out prospective trades** needs enough real future complete/censored observations. No current source or test file supplies that proof. Treat recommendations as research/estimated as labelled.
- The live app's actual asset SHA-256, public index and history shards **must be confirmed after the collector and Pages workflows run**. The connector cannot directly read the production Cloudflare origin in this session.
- Physical Android FPS, cold/warm startup, WebView cache, orientation, Back, Bluetooth controller and sustained memory require device telemetry/access; Chromium at 390px is only an emulation.
- **Mixed-scheduler write contention:** Both Worker cron and GitHub secret-backed collector may target the same D1 account if separately enabled. SQL events are mostly idempotent but two concurrent observers can race between event creation and order-state updates. A D1 account-level lease/serialisation protocol and migration require separately verified live deployment. Do not assert every partial fill is globally exactly-once until proven.
- **Old or incomplete 90-day backfill:** recent monitoring can operate while full older trade history is unknowable or capped. The new warning discloses this; it does not manufacture missing transactions or retrospectively repair them.

## Evidence and release sequence

1. All source, Node, Python, assembled Chromium and actionlint tests must pass on the exact PR #43 head. Review CI artifacts `audit/*` for any failed regression. Do not merge if failed.
2. On a reviewed merge, Pages deployment must verify every served asset checksum. D1/Worker changes require the separately approved private-monitor workflow; they are **not** deployed by Pages.
3. Run the public market snapshot workflow on `main` and verify `market_index.json` + 32 shard files generation IDs and row totals match full public source. Until then, UI fallback is expected.
4. Run `private-readonly-audit.yml` with existing GitHub repository secrets, get aggregate `recently_successful`, poll counts, warnings and derived status. If blocked/stale, leave P2/P12 open rather than display a false green badge.
5. Compare repeated Android cold/warm launch and quote search against a frozen prior release, matched network conditions and existing complete account data. Report p50/p95, wire bytes, error rates, DOM counts and storage correctness.
6. Only then promote additional model intelligence, using prospective chronological holdout and no overlapping/duplicated cohort samples. Do not tune from the held-out test set.

**Audit rule:** A completed repository batch is not equivalent to independently verified production, private account continuity or proven model performance.
