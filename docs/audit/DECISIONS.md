# Decisions

- **D001 / 2026-11-07:** audit current main `d7d2a24`, not conversation's old 7.16
  branch. Git ancestry proves old work included; fresh fetch revealed private backend
  and later releases. Isolated audit worktree prevents overwriting unrelated changes.
- **D002:** root AGENTS → STATE → RESUME is the startup contract. Seven compact audit
  documents extend/supersede old release notes. Commit IDs and evidence override stale
  prose. Self-referential checkpoint hash is resolved with `git log`, not guessed.
- **D003:** failed attempted collection returns nonzero even if error persistence
  also fails. Preserve explicit no-key/opt-out zero exits to respect consent; these
  are skips, never evidence of monitoring. Error text must remain sanitized.
- **D004:** actual entry-point subprocess tests complement isolated function tests:
  the false-green bug survived ten passing unit tests. Baseline runner preserves
  exit codes/timeouts/unavailable commands/skips rather than trusting log wording.
- **D005:** no production deploy, merge, migration or private-data mutation in this
  batch. Read-only public endpoint failure is BLOCKED; historical successful Actions
  statuses and log markers are weaker evidence than live asset/data readback.
- **D006:** one focused delegated collector review/repair, main agent responsible for
  baseline/checkpoint/PR. Avoid a parallel full-programme rewrite or repeated expensive
  audit. Finish one reviewable batch and retain exact next action for future sessions.

- **D007:** user steering prioritises discovery over release identity and most other
  work. Complete the bounded calculation repair, then P4-000/P4-001a. Keep remaining
  phases on roadmap; no silent claim that release/accounting audit is complete.
- **D008:** reuse existing shared-wallet allocator and deterministic scan lanes;
  no new probabilistic model. A necessary expected-sales profit bound catches
  impossible inputs without claiming calibration. Preserve conditional research.

- **D009:** positive low per-unit quoted margins are valid research regardless of
  hypothetical volume. Remove the unsupported display floor, retain positive net
  fees/malformed-input guards, expose first rejection reason per row. Defer other
  policy changes until category evidence; never turn visibility into forecast income.

- **D010:** translated item names and collection use are not evidence of absent
  trading opportunity. Permit quote-only research independently of these attributes;
  do not promote it to funded bids. Existing numeric/freshness guards remain until
  separately challenged. Keep risk statements on all public research rows.

- **D011:** an arbitrary fixed item price must not define research affordability.
  Keep above-wallet quotes in the existing unfunded watchlist, preserve actual
  wallet allocation, and reject malformed numeric inputs before scoring. ROI/depth
  policy and rotation remain explicit separate audit tasks rather than blanket removal.

- D012: turn speculative ROI/depth exclusions into explicit research cautions;
  keep thin/wide quotes outside primary lists. Preserve funded execution gates.
- D013: prioritise bounded enumeration fix discovered during rotation replay;
  prove identical IDs/order and benchmark the same fixture, not synthetic live returns.

- **D014 / CE-001:** distinguish sampled endpoint positioning from continuous
  exposure. Outbid, stale, gapped, repriced, conflicting and overlapping intervals
  cannot support a competitive rate. An exact leading quote proves no queue rank.
  Report near-leading tolerance separately; a positive bid difference is outbid.
- **D015 / CE-001:** fully consumed lots provide verified acquisition lower bounds,
  never capacity ceilings. Match actual ledger records; disappearance alone is
  censored. Retain informative competitive zeros and deduplicate observations.
- **D016 / staged repair:** remove unsupported unpriced-night research overrides,
  but never promote sampled rates into acquisition/resale probabilities. Maintenance
  scenarios stay unknown until separate supported evidence exists. A complete new
  forecasting model and walk-forward proof are explicitly deferred to CE-003/004.

- **D017 CE-002:** stable daily cohort (200 buy orders) with persisted rotation is
  preferable to rotating every 30-minute poll, which would leave no adjacent samples
  for large books. Coverage remains explicit; no family/name filter. Store a single
  JSON batch per poll to avoid undoing D1 unchanged-order write reductions.
- **D018 CE-002:** use existing account config storage in item/day shards, keeping
  backup compatibility and avoiding an IndexedDB version migration. Atomic cursor
  and evidence writes permit safe replay. Recent 90-day / 10,000-sample detail reads
  are explicitly partial; no stored evidence is deleted. Model use of partial reads
  is disabled rather than manufacturing complete exposure.

- **D019:** historical-practice references should be invariant to inactivity alone.
  Keep age warnings and fresh-quote requirements; no arbitrary shrinking or expansion
  based on time away. Fresh execution outcomes, not login assumptions, must change
  competitive forecasts. Exact-lot funded engine remains unchanged pending CE-003c.
- **D020:** separate a user-selected hypothetical total from a TP stack and from
  maximum market capacity. Numeric research input supports multiple orders; preserve
  per-stack rounded fees and safe-integer arithmetic. Maximum capacity remains unknown.

QH-001 integration: main PR #34 merged at2669ed5; no global bulk multiplication
in public research lists, outside-wallet labels and budget edits saved on input.
CI42590825903 passed; production workflow42591098367 started, verification pending.
