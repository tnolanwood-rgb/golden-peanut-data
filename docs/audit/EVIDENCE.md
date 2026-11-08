# Audit evidence — P0-001

2026-11-07 UTC. No personal records or credentials in fixtures/artifacts.

## Baseline before repair

Tested main `d7d2a243b490c382a3c2bf6f1be3fdad764302a7`.
Commands: `npm ci --ignore-scripts`; `python scripts/check_release.py`;
`python -m unittest discover -s tests -p 'test_*.py' -v`; `npm test`;
`npm run test:browser`. All passed: 31 JS source programs, 20 Python tests,
8 JS test files, assembled Chromium desktop 1440x1000 and mobile 390x844.
Existing stress fixture contains 141,879 synthetic transaction rows. This is
regression evidence, not an independent accounting oracle or live profit accuracy.
A subprocess with synthetic upstream HTTP 503 reproduced collector exit 0.

## Repair and final verification

Collector repair `e81d7701ea5b56da1af4cec9dbd7383214093640`; interrupted-run
checkpoint repair e7e6e57e5af36c096362ae1846890b500eade67e. Run `python scripts/audit_baseline.py`.
Machine-readable results: [P0-001-baseline.json](P0-001-baseline.json).
Dirty flag reflects pending checkpoint documentation only. Python adds 7 collector
entrypoint regressions and 4 harness tests (31 total); JS and assembled browser
remain unchanged. Failure, D1 write, diagnostic write, missing configuration,
success and intentional skip paths exercised with synthetic transport responses.
No-key/disabled success does not mean collection occurred. Logs stay ignored locally.
CI runs the same harness on Node 22 (local Node 24); remote result subsequently passed (see closure below). Final local run: all four checks VERIFIED;
`/tmp/actionlint` passed all workflows.

## Live observations and limits

Existing production run [42320412771](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/42320412771)
reports success at d7d2a24. Existing private collector run
[42321945765](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/42321945765)
reports success and logged its actual success message. This is self-report;
no independent private D1 row readback or authenticated downstream validation.

Read-only requests to `https://thegoldenpeanut.pages.dev/` and
`https://golden-peanut-intelligence.tnolanwood.workers.dev/status` returned
403 with body `error code: 1010` using Python default User-Agent. Repeating
with `urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0'})`
returned HTTP 200 for both. `curl -A 'Mozilla/5.0'` independently returned 200
for Pages. No server/security configuration changed. Live HTML title/build/footer
still identify 7.16; this does not establish the version of every loaded asset.
P0-002 must reconcile asset identity. Public status 200 is not private data proof.

Physical Android, private persisted lineage and predictive calibration remain
UNVERIFIED. No merge, production deployment or database mutation performed.

## Session closure: verified remote CI

[PR #20](https://github.com/tnolanwood-rgb/golden-peanut-data/pull/20) is open,
unmerged and conflict-free at verification. Main remains d7d2a24.
[CI run 42324153790](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/42324153790)
completed successfully on PR head `6776e3fc25ff00194badf904c7081eadff078d7b`.
Job `128255431960` confirms baseline, browser availability, artifact upload and
actionlint steps all succeeded (none skipped). Node 22 CI complements Node 24 local.

This closure changes documentation only. `git diff --check` validates whitespace;
no redundant full suite is needed. A newly triggered run on the final documentation
commit is not claimed as passed; next session should check it. P0-001 is VERIFIED;
Phase 0 remains partial pending P0-002. No deployment or merge performed. Stop here
at the user's request to conserve allowance, then resume P0-002 from GitHub.

## P1-000 + P4-000: recommendation integrity and discovery budgets

Resumed from bda60d9: PR #20 open; CI
[42324339781](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/42324339781)
passed. Fetched main 7379ede (release-labelled 7.29), incorporated upstream work
with merge 124f332 before repairs. No upstream work reverted or deployed.

**P1-000:** `node tests/execution.test.cjs` before repair: 22 pass, 2 fail.
Positive expected profit with expectedSold=0 was accepted; board asserted calibrated
status for an explicitly uncalibrated model. Added shared-wallet shrink regression.
`003c52b0bc7b46b89c32f3c292d5a5392f2c9552` then passed all 24 execution cases.
The old ranking fixture expected 200 copper from 2.4 expected sales with 70 copper
margin (maximum 168); corrected fixture to 165, still testing descending ranking.
Actual browser test injects zero expected resales and verifies no funded row renders;
valid cohorts retain descending ordering and now display estimated, not calibrated.

**P4-000:** added crowded equipment/history/open-position lane regression;
`node tests/execution.test.cjs` before repair: 24 pass, 1 fail (public lane lost).
After repair: 25 pass. Exercises budgets 20/800/6500, bounded unique IDs, and
nonzero recipe/public coverage despite oversized earlier lanes. Existing catalogue
rotation test remains passing. Fixtures are synthetic, not live execution evidence.

**Final assembled baseline:** `python scripts/audit_baseline.py` passed on clean
implementation `baf7c16` (full SHA/commands/timings in
[P4-000-baseline.json](P4-000-baseline.json)): source validation, 31 Python tests,
8 JS test files including 141,879-row stress fixture, desktop 1440x1000 and mobile
390x844 Chromium. `git diff --check` passed. Same suite also passed at 003c52b.
Workflow files unchanged this session; prior actionlint evidence remains applicable.
Latest PR CI for these new commits is pending, not claimed successful.

No live accuracy improvement, complete category coverage or physical-device result
is established. No performance optimisation claim. P4-001a must investigate the
remaining low-unit-margin/equipment/name filters using catalogue-to-UI evidence.

## P4-001a — small-margin discovery and gate accounting

Prior PR #20 head e286321 CI [42355298848](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/42355298848)
passed; main remained 7379ede, PR open/unmerged. Before repair,
`node tests/execution.test.cjs`: 25 passed, new regression failed (0 board rows
instead of 2 engine-accepted commodity/food candidates).

Implementation `7e15c007887c50876b9468601f6b35cc13bd1543`:
`python scripts/audit_baseline.py` VERIFIED all four stages on clean code:
31 Python tests; 8 JS test files (26 execution cases, 10 board cases); source
checks; desktop/mobile assembled Chromium. Browser now proves positive sub-50c
material/food research renders with “not a forecast”. No new workflow edits.
`git diff --check` passed. New PR CI pending; no deployment performed.

`node scripts/audit_discovery.cjs` replayed the same 27,999-row public snapshot
before/after. See [P4-001a-discovery.md](P4-001a-discovery.md) for immutable data
checksum, per-category counts and limitations. Gate tests prove all examined rows
are accounted for once and malformed depth is rejected. Snapshot replay is NOT
live forecast-accuracy evidence or complete end-to-end discovery verification.

## Authorized production deployment — 2026-11-07

User explicitly requested deployment. PR #20 merged at
`09e49acc68c83fe5dd6eb53a66da2f212b02021c` only after
[CI 42355743535](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/42355743535)
passed on exact head `a1403862c6703fcf5326c36f5c305d16e342c063`.
Release-request commit `e5d67e6cfcda8086e06e0f23fae13d9fcd413cc0` triggered
[production 42369046821](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/42369046821).
Job 128393160177 succeeded: exact existing target, regression suite, deployment,
HTML and critical-module smoke checks. No production workflow modifications needed.

Independent read-only verification fetched index.html plus every referenced local
JS/CSS asset (including HTML query strings) with `User-Agent: Mozilla/5.0` and
`Cache-Control: no-cache`, bounded to four concurrent requests. SHA256 of response
bytes matched repository file bytes for all 14 assets. Evidence:
[DEPLOY-e5d67e6-assets.json](DEPLOY-e5d67e6-assets.json). To reproduce an asset check:
`curl --fail -A 'Mozilla/5.0' -H 'Cache-Control: no-cache' https://thegoldenpeanut.pages.dev/market-board.js | sha256sum`;
compare with `git show e5d67e6:app/market-board.js | sha256sum`.
The same comparison applies to each saved asset path (index.html served at `/`).

This establishes deployed code identity, not private account-data lineage or live
forecast accuracy. No account data, secrets, database schema or orders mutated.
Release labels still need P0-002; next development remains P4-001b.

## P4-001b1 — category-aware public quote seeds

Based on main d3b9688, retaining upstream D1-write and mobile changes.
Implementation c09ad575fbf45cd9a0517149f719b1f7b9e46819. `node tests/execution.test.cjs` reproducer failed
before repair (one Bag lost among 999 higher-spread Weapons), then all 27 cases
passed. The 40-slot bound and uniqueness assertions remain enforced.
`python scripts/audit_baseline.py` final result recorded in P4-001b1-baseline.json.
`node scripts/audit_discovery.cjs` replays the same public snapshot; Bag seeds
0 → 33, CraftingMaterial 32 → 80, Weapons 477 → 233 within the same 1450 budget.
These are offline research-selection counts, not execution or profitability proof.
Official metadata categories now subdivide existing price/depth buckets. Unknown
metadata retains its own bucket; no names or handpicked families added. Very small
budgets may still require rotation for complete coverage; no universal fairness claim.
Name/unlock display exclusions and catalogue search remain unfinished. No deployment.

## P4-001b2 — name/unlock independence and catalogue search

PR #30 open/unmerged; prior cca2728 CI 42398829818 passed. Main unchanged at d3b9688.
`node tests/market-board.test.cjs`: before repair 10 passed/2 failed; after 12 passed.
Fixtures rename identical quotes across Mini/Recipe/Tonic/Skin/Infusion labels and
assert unlock quotes remain research without quantities, expected profit or funding.
The rejection-counter test now counts the formerly name-rejected row as accepted;
other invalid/stale/duplicate cases retain their assertions.

`python scripts/audit_baseline.py` passed all stages at clean implementation
`2e29aa6d6697fa8fd5d22243d1493959f6c0fdde`; source, Python, 8 JS test files and
assembled desktop/mobile Chromium. New browser assertions prove Mini/unlock rows
render as “not a forecast” and a no-history catalogue item is searchable by name/ID.
Results: P4-001b2-baseline.json. `git diff --check` passed. Remote CI pending.

`node scripts/audit_discovery.cjs` before/after same-snapshot replay:
MiniPet 0→252, Consumable 526→2041; exact checksum and per-category changes in
P4-001b2-replay.json. Remaining first rejections: ROI 6445, price ceiling 1171,
standing depth 30. Gate order matters; no independent causal count implied.
Research visibility is not profitable execution evidence. No deployment this batch.

## P4-001c1 — research capital and malformed public quote guards

Main unchanged d3b9688; PR #30 open/unmerged. Prior ea9a600 CI
[42399130329](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/42399130329)
passed. Before repair, `node tests/market-board.test.cjs` failed the new expensive
research case (0 rows instead of 1). `node tests/execution.test.cjs` failed the new
malformed-ID/depth case. After repair: board 13/13, execution 28/28.

`python scripts/audit_baseline.py` passed all stages at clean implementation
`a456967df56b8fddf59abf7695385043fd85ab78`: source validation, 34 Python tests,
all 8 JS files including stress fixtures, desktop/mobile Chromium. New browser case
proves a 30g research quote appears as not covered by the wallet, is absent from
cheap-primary suggestions and creates no funded order. P4-001c1-baseline.json
records commands and conditions. `git diff --check` passed. New remote CI pending.

`node scripts/audit_discovery.cjs` same-public-snapshot replay: board research
10,349→11,436 (+1,087). P4-001c1-replay.json records checksum and categories.
Remaining first rejections: ROI 6,521, standing depth 38. These are policy-screen
counts, not live liquidity or profit outcomes. Existing ROI/minimum-depth policies
are intentionally retained for the next audit; whole Phase 4 is not complete.
No release, private account write or game order performed.

## P4-001c2 + P8-000 — final checkpoint before allowance reset

Prior 6688d55 CI 42399490369 passed. PR #30 open; main unchanged d3b9688.
New pipeline fixture failed before repair: zero of three positive narrow/thin/wide
quote candidates survived. 8e5bc43 retains positive net one-copper-inside quotes,
removes arbitrary 3% exit discount and ROI visibility gates; malformed/empty books
still rejected. Thin/wide books are cautioned and withheld from primary research
lists, never funded. Old browser assertion forbidding wide quotes everywhere was
replaced by secondary-watchlist/caution/no-top-buy assertions; mobile/desktop pass.

Full-catalogue replay selected all 27,999 IDs over 18 successful fixed 6500-budget
passes, with bounded unique IDs per pass. This is ID selection, NOT live quotes,
persisted cursor recovery or execution evidence. Research candidates 17,995→22,313;
board 11,436→22,313; no eligible positive-margin research rejected at board stage.

Replay exposed repeated Object.keys(metadata) inside family iteration. Regression
counted 1002 enumerations for 1000 items; d19ae75 reduces to 2, preserving IDs/order.
`python scripts/audit_baseline.py` passed on clean d19ae759bad135e844267e86cb23cb7cecdda780:
source, 34 Python tests, all 8 JS files (30 execution, 13 board cases), desktop/mobile
Chromium. Saved P4-001c2-baseline.json. New remote CI pending, not deployed.

Benchmark: `git show 8e5bc43:app/opportunity-engine.js > /tmp/gp-family-before.js`
then `node scripts/benchmark_family.cjs /tmp/gp-family-before.js`. Initial attempt
using child_process git hit sandbox EPERM; shell extraction succeeded. Seven warmed
runs on 1000 same-family rows: median 10.796ms before, 1.528ms after; exact same IDs
asserted every run. Engine microbenchmark only, not a physical Android speed claim.
User reports 3% allowance: stop here, next P4-002. No deployment or private writes.

## CE-001 — competitive evidence foundation (2026-11-08)

Baseline main `0aae3f1`; implementation
`ef7f27c29aee7d983e46155e2fa7e0ff4332f915`. Clean implementation command:
`python scripts/audit_baseline.py` — all stages VERIFIED: 32 source JS programs,
34 Python tests, 94 JavaScript tests including 18 new exposure cases, assembled
Chromium at 1440x1000 and 390x844. CE-001-baseline.json records exact commands,
runtimes and conditions. Existing realised-profit/Delivery Box assertions remain
unchanged and pass; this does not complete the independent accounting oracle.

Deterministic replay (no account data):
```sh
git show 0aae3f1:app/capacity-intelligence.js > /tmp/ce-old.cjs
node scripts/audit_competitive.cjs /tmp/ce-old.cjs
node scripts/audit_competitive.cjs
```
CE-001-comparison.json: adding six unpriced zero-fill nights previously changed a
four-unit conditional 24h acquisition reference to zero. Repaired source preserves
four, while expected profit remains unknown. This is removal of an unsupported
override, not proof that four is achievable capacity. Research ranking regression
also proves unpriced nights do not change rank. No new funded allocation or live
forecast calibration improvement established. Legacy quantity caps remain CE-003.

New tests exercise 50-unit orders with two fills while outbid versus competitive,
small full lots, inactivity/gaps, repricing/price moves, overlapping orders,
cancellations/replacements, explicit unknown forecasts, deduplication/account
isolation, future quote exclusion and foreground persistence. Details and remaining
acceptance gaps: COMPETITIVE-REPAIR.md.

Read-only production baseline before edits: HTML, execution-engine.js,
opportunity-engine.js, capacity-intelligence.js and market-board.js matched main
0aae3f1 bytes. PR #30 merged upstream; CE-001 is NOT deployed. Remote CI for the
new repair branch must be checked separately; no private D1 readback, historical
backtest calibration or physical S23 evidence obtained in this batch.

Delivery: draft [PR #31](https://github.com/tnolanwood-rgb/golden-peanut-data/pull/31)
opened from pushed branch audit/competitive-exposure. Checkpoint dfc2db1 plus this
PR-reference documentation update. Remote CI is pending, not reported as passed.

CE-002a (2026-11-08): bounded priced background collector and authenticated relay
implemented. Synthetic SQLite/HTTP tests: `python -m unittest discover -s tests
-p 'test_*collector.py' -q` passed 37 tests. `node --test
tests/account-monitor.test.cjs` and `python scripts/check_release.py` passed.
Coverage includes 401-order rotation, stable intraday cohorts, partial/missing
quotes, idempotency, cancellation uncertainty, cache age, D1 write failure,
public 503 retry bounds and authenticated account/cursor scoping. One JSON insert
per poll, up to 200 current plus 200 absent sampled orders; actual D1 write billing
not measured. Migration absence is explicit. No private/live D1 test performed.
Prior PR #31 head 4f22f02 CI 42429705868 completed successfully.
CE-002b app import/storage is still IN PROGRESS; CE-002 is not yet complete.

## CE-002 — integrated priced background evidence (2026-11-08)

Clean implementation `11f556619b7da859e51ffac5610e9efb11f3d6a0`:
`python scripts/audit_baseline.py` passes all four stages. Exact commands/runtime
and conditions: CE-002-baseline.json. Python 41 tests; JavaScript includes two
new import validation/failure tests and two private endpoint tests. Original
assembled 1440x1000/390x844 checks pass unchanged, including accounting/Delivery Box.

`node tests/competitive-browser.cjs` runs actual Python collector against synthetic
SQLite via `tests/competitive_fixture.py`, relays generated payloads through the
actual Worker, imports over mocked HTTP through the actual account client into real
Chromium IndexedDB. Two snapshots produce 0.5 sampled outbid hours, zero competitive
hours, two verified acquired units and unknown expected acquisition. Repeating the
refresh leaves two snapshots/cursor 2. Concurrent additions retain both; injected
transaction failure saves neither new evidence nor cursor 99. Backup restore unions
records; legacy data survives migration; a 10,001-sample shard retains all records
while the detail read is explicitly capped at 10,000. Tests are synthetic; external
network is intercepted. No live D1 write/readback or improved calibration proved.

Run browser/baseline commands with the environment's network permission for local
servers and child processes; restricted execution yielded EPERM on child spawn.
Direct Node test execution and the permitted full baseline were both checked.
Deployment is pending; no release-request files touched. Prior remote CI at 4f22f02
passed run 42429705868, but the latest implementation's remote CI remains unchecked.

## CE-003a and CE-003b1 (2026-11-08)

Main advanced to 4b8bd13; merge 01b7c86 resolved only HTML script list and npm test
list conflicts by retaining both upstream startup changes and exposure work.
Read-only live HTML/opportunity-engine/focus-edition bytes matched origin/main.
PR #31 is draft/open/unmerged. New repair changes were not deployed.

Before CE-003a, `node tests/inactivity.test.cjs` failed all four initial cases:
identical history cap 4→1 with inactivity; overnight reference count 6→0;
open-book scenario 4→1; future quotes admitted as independent observations.
At 2509b86 all six cases pass, including inactivity-only capital review and
historical-only research never becoming funded. `python scripts/audit_baseline.py`
passes at clean 2509b86; CE-003a-baseline.json. Removing unidentifiable 1.25–1.75x
expansion multipliers also reduces the fresh fixture research ceiling (21→10),
while stale and fresh references agree. This is conditional research, not an
increase in proven acquisition capacity or a calibrated forecast.

CE-003b1: two new capacity cases first failed (quantity >250 rejected and unsafe
integer gold accepted). a0d131c passes these plus an independent BigInt fee oracle
across full/residual stacks. Browser explicitly enters 10,000 units, checks unknown
forecasts and returns to the saved 50-unit choice. Full baseline: 109 JS / 41 Python,
source checks, desktop/mobile and collector-to-browser tests all pass. Report
CE-003b1-baseline.json's dirty flag reflects only the prior CE-003a evidence JSON,
which was untracked; implementation code was committed at the reported SHA.

An assembled rarity assertion initially read an empty computed style during an
asynchronous repaint. It now waits for the exact expected colour on the current
attached row instead of retaining a potentially detached element; colour coverage
is preserved. Final full browser checks pass. No live calibration or physical
Android claims. Legacy evidence/wait factors and quantity-cap semantics are still
CE-003c; full requested repair remains incomplete.
