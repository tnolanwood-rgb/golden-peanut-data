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
