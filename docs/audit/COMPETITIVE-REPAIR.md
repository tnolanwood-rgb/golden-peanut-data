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
