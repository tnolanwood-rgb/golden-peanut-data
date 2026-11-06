# Model and data contracts

## Why the old ranking was replaced

The supplied app's allocator multiplied active-day quantities by quoted margins,
then applied fixed confidence, age, size and timing discounts. The primary list
mixed standing positions, funded purchases and unfunded capacity. Its alternate
nightly model combined separately observed buy and sell nights; these were not
necessarily the same item's purchase and subsequent resale inside 24 hours. That
cannot establish expected next-day net profit. The old calculations remain only in
explicit conditional research views; they do not fund the primary recommendation.

## 7.16 baseline

`app/execution-engine.js` captures prospective **joint** 24-hour cohorts, and trains
an empirical mean on comparable completed cohorts. This is deliberately simpler
than a survival-regression model. Eligibility defaults are policy thresholds, not
parameters proven optimal by backtesting:

- Observe new orders within 15 minutes of creation with a verified clean position
  (no old inventory, old sell listings or competing buy orders for the item).
- Require fresh, complete order lists, bank/shared/material/character inventory,
  wallet, Delivery Box and completed transaction history. A missing inventory API
  permission leaves recommendations in Research; account history still works.
- Capture all eligible observed starts, whether recommended or not. Preserve skipped
  counts, pending/censored windows and zero-fill windows. History-only trades never
  become retrospectively fabricated cohorts.
- Use official transaction identifiers and timestamps to reconcile purchases and
  resales. Stock conservation and competing purchases guard attribution. Missing
  orders are unknown until their complete filled quantity is verified in history.
  Ambiguous cancellation, price/size changes, missing end observations and unreconciled
  inventory censor a cohort. A normal end check is within 15 minutes after 24 hours;
  fully timestamped completed rounds can be resolved later.
- The initial quantity is **observed remaining quantity**, near order creation.
  Prefills discovered later censor the window. The API cannot recover every original
  submitted quantity. Partial remaining quantities and price changes are also retained
  in the existing account-scoped buy/sell evidence records.
- Require at least eight non-overlapping, exact-lot-size samples across at least five
  start dates in 90 days, with the newest outcome at most 14 days old. Prices must be
  within 15% of the current bid/exit. Any comparable unresolved/censored mature window
  blocks promotion; silently dropping these would select surviving winners.
- Require at least five dated public quote days with relative ask standard deviation
  <= 15%, no spike flag, and recent history. Live quotes, wallet and account data expire
  after 15 minutes. Initial orders are at/one copper above the best observed bid;
  recommendations improve the current bid by one copper and undercut ask by one.

For each comparable window, reprice its observed sold quantity at the current exit,
subtract rounded 5% listing and 10% exchange fees and purchase cost, then subtract
listing fees on its observed listed-but-unsold quantity. Average those outcomes to
obtain estimated net realised profit within 24 hours. Acquisition/sold means and
probabilities of any acquisition/completed round come from the **same windows**.
This automatically includes manual listing delay and failed resale periods; it
never multiplies independently estimated buy and sale probabilities.

The displayed 10–90% range is the empirical historical outcome range after repricing,
**not a calibrated future prediction interval**. Unsold stock is not credited as
profit. Expected tied-up capital is `(offered - expectedSold) * buyPrice`.
Reserve `offered * buyPrice + ceil(offered * exitPrice * .05)` up front, including
listing fees for the entire proposed lot. Do not credit future sale proceeds to
another order. Choose affordable exact observed lot variants greedily by highest
absolute expected profit; use each item once. Sort selected rows by expected profit.
This is a feasible greedy portfolio, not a claim of globally optimal allocation.

Existing holdings/orders consume their own capital and item capacity. 7.16 excludes
those items from new-purchase forecasts rather than attributing their later sales to
new buys. Existing positions remain in Orders and conditional research. Cancellation
scenarios are separately recalculated and labelled hypothetical; coins are never
released by the app. No optimistic capital recycling is assumed.

## Research choices and limits

Kaplan–Meier survival analysis can use pending orders as right-censored observations;
left truncation matters for an order first observed after submission. But cancellation
may be informative (users cancel precisely when prospects worsen), and partial fills
are correlated within an order. Multiplying two survival curves does not model the
joint buy-to-list-to-sale path or inventory attribution. A counting-process/competing-
risk model with recorded cancellation causes and interval-censored partial fills is
an appropriate future candidate, not something justified by completed-only history.
We therefore retain censoring explicitly and withhold estimates where the simple
baseline cannot use it safely. No invented Gamma/Beta prior is presented as personal
execution evidence.

Craftability is collected through actual recipes and shown as a supply caution.
Current asks and five-level depth are quotation evidence, not executed demand.
Queue position and future crafts are not directly observable. Public daily volatility
is only a coarse regime check. The baseline has no learned causal queue/supply effect,
no capital-recycling optimizer, and no established live calibration. Thresholds need
prospective validation. Unobserved listing cancellations/relist fees or other actions
between account checks cannot be fully reconstructed from the API; fee-adjusted
ledger reports remain estimates under those data limits.

The app is not an always-on private collector. If the browser is closed around a
window's boundary, many unfinished cohorts will be censored. No private server/API
key was supplied. A future protected personal collector should record the same
schema and account-isolated state, never publish personal data into this repository.

## Walk-forward evaluation

`GPExecution.backtest` predicts each held-out window only using outcomes whose
`knownAt` precedes that window's `start`. It uses all captured complete windows,
including zero buys/sales; overlapping windows and duplicate order samples cannot
inflate training. It reports profit/acquired/sold MAE, last-comparable-window and
zero-profit baseline errors, buy-event Brier score, empirical range coverage,
sample counts and per-item/category results. Censored and skipped counts expose
coverage. These remain user-selected traded markets, not an unbiased estimate of
all GW2 opportunities. No counterfactual fills are invented for unplaced orders.

No complex model is automatically promoted (`promotionAllowed: false`). A successor
needs a frozen prospective evaluation cohort, matched temporal folds and material
improvement against these baselines with adequate coverage. Fixture results only
validate the evaluator's logic. Real model-selection evidence is currently absent.

## Persistence and public/private schemas

- Stable IndexedDB: `golden-peanut-clean-v1`, account-scoped existing `ledger`,
  `snapshots`, `config`, `archive`, `projects`; public `metadata` and `market` scope.
- Learning key: `config/<account>/execution-learning-v1`: version, cohorts, samples,
  seen order IDs, skipped starts and observation time. Each cohort records original
  observation time, horizon, item/order IDs, offered quantity, bid/exit references,
  completion/censor status and actual observed quantities/profit. No truncation of
  the existing ledger or deletion on deployment.
- Existing `buy-order-evidence-v1` and `sell-order-evidence-v1` retain observed partial
  changes, zero intervals and ambiguous closures separately from official fills.
- Streaming safety backups include learning via account config, checksum-verify all
  frames before import, and merge disjoint learning cohorts on restore. Same-origin
  storage and a verified private backup are prerequisites for a safe deployment.
- Public files keep the 7.15 eight-column format and add generation IDs, actual
  observation times, metadata, recipes, rotating depth and coverage. Their only
  source is public ArenaNet data; they contain no account credentials or fills.
