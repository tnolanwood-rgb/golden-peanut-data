# Engineering audit — 7.16 development branch

## Recovery

Repository inspected at `7753da381c69e422e3fcfd700ae9b6c739622569`: two workflows,
no app, collector module, documentation or tests. Retrieved both supplied ZIPs.
Recovered the complete 7.15 Pages source and the uncommitted public collector pair.
Inspected all supplied source files, existing workflow Python/D1 tables and public
Flip Out catalogue/history/analysis code. Existing private Worker implementation and
production Pages configuration were not supplied; no inaccessible files were changed.

## Delivered connections / defects fixed

- Added recovered Pages source under `app/`, public collector/workflow, tests and CI.
  Existing D1 background collector and API probe are byte-for-byte unchanged.
- Full tradable ID discovery, rich stat/subtype metadata, all recipe categories,
  timestamped quotes, 21-day history and rotating five-level depth; bounded parallel
  fetch, retries, resume cache, strict quote coverage and explicit metadata gaps.
- Removed the collector's 90% success threshold and silent dropped-ID behavior;
  deduplicate history, retain temporarily missing items and preserve actual quote day.
- Reserved catalogue traversal slots before existing orders consume scan capacity.
  Family grouping/coverage uses metadata; search is paginated. Recipe recovery now
  advances its failure checkpoint correctly and indexes non-equipment recipes.
- Replaced funded primary ranking with prospective joint purchase/resale outcomes.
  Zero-fill periods contribute; ambiguous disappearance remains censored. Unsupported
  markets have no expected profit. One wallet and listing-fee reserve fund all rows.
- Added inventory coverage, account/quote freshness gates, immutable order-observation
  updates, gap-safe overnight research, rounded fee treatment in matched ledger totals,
  and validation at engine and interface boundaries.
- Restored four primary mobile destinations, simplified funded forecast/details,
  preserved Legendary Planner, existing database and streaming backups. Learning
  persists in account config and merges on backup restoration. No embedded account
  profile, credentials, personal trades or live private data are committed.

## Validation performed

| Check | Actual result |
|---|---|
| JavaScript regression suite | 22 tests passed |
| Python collector regression suite | 10 tests passed |
| Assembled Chromium app | Desktop 1440 px and mobile 390 px passed |
| JS/Python/assets/build validation | 26 external/inline JS programs; workflow embedded Python; asset paths; manifest; version and credential guard passed |
| Workflow syntax/semantics | actionlint 1.7.7 passed for all workflows |
| Live public API run | 27,999/27,999 price IDs; 27,973 metadata; 13,213 recipes; 1,200 depth samples |

Live catalogue covered 16 types, including 11,780 weapons, 6,722 armour, 4,906
consumables, 1,409 materials and 778 upgrade components; metadata exposed 652 stat
attribute IDs. There were 26 missing metadata IDs, explicitly reported, with their
quote rows preserved. Live outputs are public-only local validation artifacts, not
personal training evidence and not a historical backfill. Original quote observation
timestamps are retained; the run does not manufacture prior days.

Browser checks serve the **actual assembled app** and mock external HTTP/account
responses. They exercise API normalization → IndexedDB → opportunity refresh → ranked
home/detail UI; complete catalogue search/pagination; Legendary Planner navigation;
checksum-verified backup creation; persisted learning; invalid forecast suppression;
and horizontal overflow. These synthetic tests do **not** demonstrate live accuracy.

## Remaining limits

This is a working integration stage, not completion of every long-term objective.
No personal API key, trading dataset or Cloudflare deployment credentials were
available. Therefore no live account/backtest accuracy claim, deployed Pages change,
D1 mutation or private server collector is claimed. Initial funded recommendations
will usually be empty until comparable prospective evidence accrues.

The baseline is conservative: eight exact-size, non-overlapping cohorts, clean initial
positions, recent comparable prices, stable quote history and no comparable mature
censoring. This can reject many useful markets. The app must be open for observation;
closed-browser gaps are not repaired by public data. Existing positions stay separate.
Unobservable cancellations/relist fees cannot be fully reconstructed. Queue/supply
causality, always-on private collection, global portfolio optimality, multi-cycle
recycling and calibrated forecast intervals remain future work. No complex model is
automatically promoted without prospective comparisons. See the model document for
assumptions and deployment document for exact operational steps.

## Review delivery status

Local development commits are complete. Publishing the branch was attempted via
native Git and the connected GitHub API; both returned HTTP 403. Therefore a hosted
PR could not be created. The branch is supplied as a prerequisite-based Git bundle,
binary-capable review patch and source ZIP, with the prepared PR description at
`docs/PULL_REQUEST.md`. Deployment ZIPs and SHA-256 manifest are generated separately.
