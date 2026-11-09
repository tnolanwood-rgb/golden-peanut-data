# Competitive exposure repair — active programme (2026-11-08)

User prioritised this repair over the remaining discovery audit and authorised a
verified deployment when complete. Allowance is constrained: commit bounded batches.
Do not claim the entire repair or a live accuracy improvement from synthetic tests.

Baseline: main 0aae3f1; read-only live HTML, execution, opportunity, capacity and
market-board asset bytes matched main on 2026-11-08. PR #30 merged/deployed upstream.
Working branch audit/competitive-exposure. Preserve upstream D1 write reductions.

Confirmed paths:
- capacity-intelligence.js: observed nights override active-day histories, without
  market bid observations. Zero fill while outbid can replace successful history.
- market-board.js measuredNightCapacity: same unpriced nights can set rankScore=0.
- opportunity-engine.js findQuantity: arbitrary inactivity multipliers and active-week
  caps affect conditional research quantities. Requires a separate repair/test batch.
- execution-engine.js: exact-lot joint cohorts describe historical practice, not
  competitive market capacity; no repricing/queue observations are currently stored.
- private collector gp_monitor_nights counts partial depletion but records no bid/ask.
  Worker exposes those nights; account-monitor-client groups them without price position.
- portfolio-intelligence consumes capacity analogues; pricing evidence must not be
  introduced as hypothetical global volume or double-counted alongside personal fills.

Batch CE-001: prevent unpriced nights being treated as competitive capacity; add
account-scoped, deduplicated priced foreground observations and honest diagnostics.
Endpoint sampling is not continuous queue coverage. Completely filled lots are
lower bounds, cancellations/disappearances and gaps are censored. No fabricated
mode probabilities or newly funded expected-profit estimates.

Still required after CE-001:
CE-002 bounded background priced observations + authenticated import (additive schema,
collector/Worker/client tests, D1 write budget, timestamp/freshness/coverage indicators).
CE-003 replace competing conditional quantity caps and inactivity multipliers; active,
occasional/unattended policies must have separately supported evidence. Competitive
proxy rates alone cannot establish resale probability or capital recycling.
CE-004 walk-forward evaluation with zero/censored windows, independent resale and
capital-allocation regressions; production verification/deployment only of completed
coherent repairs with explicit limitations. Existing accounting/Delivery Box tests
must remain unchanged and green. Never infer cancelled orders filled.

## Checkpoint — CE-001 VERIFIED locally, overall repair PARTIAL

Implementation ef7f27c. Full baseline: 94 JS/34 Python plus assembled desktop/mobile
and source checks. Foreground capture is called by execution-engine.update and
restored from account config; detail UI shows unknown forecasts plus expandable
sample diagnostics. A five-day recency-weighted sampled rate is descriptive only.
Unobserved stale tails are explicit. No acquisition/resale/recycling probabilities
are derived. No deployment in this batch. CE-002 is the exact next action.

### User acceptance scenarios (foundation coverage is not full-model acceptance)

| Requested cases | Evidence now | Remaining |
|---|---|---|
| 1–2: two of fifty outbid vs competitive | Exposure tests separate 72h sampled positioning and zeros | Integrate supported rates into policy-specific forecasts |
| 3: four fully filled | Lower-bound test; maximum capacity unknown | Remove legacy lot/active-week quantity caps |
| 4: inactive profitable market | History retained; unpriced nights cannot override or demote | Replace remaining inactivity/recency factors |
| 5, 10: repricing and large moves | Changed endpoints censored | Observed pressure and maintained/unattended scenario model |
| 6–7: closed app/gaps | Gaps and stale tails unknown, never competitive zeros | Background quote collection/import and coverage |
| 8–9: overlaps/partial/cancel/replace | Censor overlap; actual fills required | Background-to-portfolio integrated fixtures |
| 11–12: margin vs volume; resale limits | Existing execution/portfolio regressions still pass | New model ranking/sell-side tests NOT complete |
| 13: accounting/Delivery Box | Existing assembled guards unchanged and passing | Independent full accounting audit still pending |
| 14–15: uncertainty/duplicates | Unknown forecast fields, dedup/account-switch tests | Concurrent writers, background replay and storage growth |

Do not mark all 15 complete based on these foundation tests. No walk-forward
accuracy improvement measured. First inspect private save_orders/night functions,
Worker schema/endpoints and account-monitor-client import for CE-002; preserve
D1 write budgets and existing field semantics. Add explicit bid/ask timestamps,
coverage, retries/checkpoints, authenticated deduplication and storage tests.

## CE-002 checkpoint — locally VERIFIED, full repair still PARTIAL

11f5566 implements priced GitHub cohorts, authenticated relay, resumable atomic
app import and item/day evidence storage. End-to-end synthetic collector/SQLite/
Worker/Chromium pipeline passes, including backup union, migration, duplicates,
failed-write rollback and bounded reads without erasure. Background capture is not
yet deployed/live-verified; native Worker polling remains unpriced. Stable cohort
covers at most 200 open buy orders each day, rotates by persisted order ID, and
records total/sample/quote counts. Missing quotes and gaps remain unknown.

Acceptance cases 6–9/14–15 now have integrated storage/import coverage, not live
monitoring or model accuracy proof. Cases 3–4 quantity caps, 11–12 ranking/resale and
policy-specific forecasts still require CE-003. Next reproduce identical histories
at differing inactivity ages in findQuantity and activeBookScenario before repair.

## CE-003a/b1 checkpoint — partial model repair

2509b86 removes inactivity discounts/age-based experimental multipliers, retains
old personal night references, prevents inactivity alone flagging redeployment and
rejects future quotes. a0d131c permits explicit bulk hypothetical quantities with
safe integer/stack-fee validation. Full suite 109 JS / 41 Python and assembled tests
passes. No funded quantity/expected profit is invented by these changes.

Next CE-003c must repair legacy cap semantics and the actual joint forecasting
path. Remaining evidence multipliers/wait adjustments, exact-lot samples,
maintenance-specific resale and capital-allocation acceptance remain unfinished.
No live model comparison, calibration gain or new deployment claimed.
