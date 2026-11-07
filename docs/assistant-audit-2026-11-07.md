# Independent Golden Peanut audit — 7 November 2026

This is a **bounded, reproducible source-code and synthetic-test audit**, not a claim that the full Codex audit is complete. It complements (and does not modify) Codex's separate `development/audit-p0-checkpoint` branch and PR #20.

## Scope examined
- ArenaNet account snapshot / normalised orders → completed history import → FIFO profit summaries
- Local partial-order change capture and use in market exploration
- Independent cloud overnight evidence selection
- Execution engine forecast calibration status → market-board tier → mobile UI labels
- Visible new-market research versus verified funded opportunities
- Delivery Box gross listing value and separate item-level cost-adjusted hypothetical profit (UI releases 7.27 and 7.28)

## Confirmed findings and changes

**AI-AUDIT-001 — Unsupported forecast calibration label (confirmed; repaired).**
The execution model sets `calibrated:false` and its ranked interface declares `isCalibrated:false`, but the market-board and Focus Trading Desk called the resulting opportunities "calibrated 24-hour". Replaced these labels with **empirical 24-hour estimates, not calibrated**. Regression verifies that an upstream uncalibrated estimate never receives a calibrated tier. This is a label/integrity fix, **not** a validation of forecast accuracy.

**AI-AUDIT-002 — Personal fill observations lost before new-market presentation (confirmed; repaired).**
Local `observeBuyOrderBook` and `observeSellOrderBook` record reductions of the same verified order ID; `publicResearchCandidates` includes cumulative observed buy and sell quantities. `GPMarketBoard.build` previously omitted those values from its exploratory market rows. They now survive into rows, influence **only a modest (capped 20%) research ranking tie-break**, and appear as two separately observed sides in details. They do not create joint round-trip fills, funded buy instructions, proven liquidity, or 24h profit forecasts. Synthetic integration replays a 50→30→20 buy-order reduction and corresponding sell-side reductions from collector-like snapshots.

**AI-AUDIT-003 — Private-night lookup starvation with large active books (confirmed by source, repaired).**
The app previously selected the same historical top-35 and first open orders for every maximum 40-ID night lookup, starving later IDs when the account had hundreds of active orders. Added deterministic rotating selection over *all quoted active buy/sell item IDs*, prioritising a small set of historical winners and recent measured order reductions. A read-only rotation cursor is stored per account in existing IndexedDB config; each lookup still queries **at most 40 IDs**. Test covers 269 active items over successive rounds with no synthetic fills or extra per-request capacity.

**UI-DELIVERY-001 — Gross Delivery Box versus trading profit (released separately as 7.28).**
Header = collectible coins + quantity × public lowest sell listing price **before fees** (hypothetical gross listing value, not collectible cash). Each item = estimated profit **after fees and supported purchase cost**; cost attribution to outstanding lots remains an estimate, not guaranteed inventory provenance. Missing quotes/costs must not be silently treated as verified.

## Evidence / verification
- `tests/market-board.test.cjs`: uncalibrated forecast tier; separate-side fill boost cannot invent fill forecasts.
- `tests/execution.test.cjs`: 50→30→20 buy changes and 40→25→20 sell changes flow through discovery; rotation of 269 active order markets under 40-ID cap.
- Full repository CI and browser regression to be linked from this branch's PR after completion.
- **Live account/Cloudflare D1 backend was not accessed in this audit.** Synthetic fixtures test the code paths but do not establish real-world model calibration, actual backend fill coverage, or more trading profit.

## Observed remaining risks, not yet repaired
1. Historical cost matching is only as complete as the retrieved user ledger; unknown original inventory can remain unmatched.
2. An order disappearing from the ArenaNet current list is **ambiguous** (cancellation versus full completion) until corroborated with completed history. Neither market-wide quoted quantities nor missing snapshots prove trades.
3. The 24-hour model requires prospectively observed comparable lots and remains **uncalibrated**; its absence is not an app failure and new-market price spreads cannot be treated as expected income.
4. Cloud overnight evidence is optional, per-account and dependent on consent and successful external collection. Current deployment does not provide independent live validation of D1 completeness or collector events.
5. The engine build identifier still says 7.16.0-evidence even though the UI is newer. Codex's P0-002 release-identity task should reconcile version names without falsifying model validation.
6. GW2 price data indicates public bids and asks, **not actual transaction volume**. Evaluate the rotating selection and source labels against live observed results before interpreting the rank as predictive.
7. This audit was intentionally bounded; other Codex phases (full accounting, all-category discovery, portfolio optimisation, security, Android stress, live production integrations) remain unfinished.

## Handover for Codex
Review this independent PR's merge status; read its regression evidence and compare to Codex's own work before modifying overlapping files. Do not repeat verified code inspection unnecessarily. Continue P0-002 and P1-001 from `docs/audit/STATE.md` and `docs/audit/RESUME.md` on Codex's audit branch. Merge thoughtfully if both branches touch the same market/Focus/CI modules.
