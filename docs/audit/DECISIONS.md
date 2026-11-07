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
