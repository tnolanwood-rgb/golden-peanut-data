# Golden Peanut engineering sessions

The permanent audit entry point is `docs/audit/STATE.md`, then `docs/audit/RESUME.md`.
On “Continue the Golden Peanut audit”, read those files, verify the branch/commits
against GitHub, and resume the first unfinished batch. Do not restart the audit.
Read only relevant ROADMAP/FINDINGS/EVIDENCE sections after the entry points.

Work in small diagnosed, tested batches. Preserve data and use synthetic fixtures for
stress tests. Never print secrets or raw private account records in logs/artifacts.
Never place, cancel or modify in-game orders. Do not touch production release-request
files, merge a PR or deploy just to complete an audit batch. A reviewable PR is the
normal delivery boundary unless the user specifically authorizes that release.

Baseline: `npm ci --ignore-scripts`, install PyYAML 6.0.3 and Chromium/Playwright, then
`python scripts/audit_baseline.py`. It writes local ignored `artifacts/audit/` evidence.
Use narrower tests for narrow fixes. A successful process is not proof of live data
persistence or predictive accuracy. Do not publish raw private collector logs.

Before ending: update STATE, ROADMAP, RESUME and evidence/findings; commit and push
where permitted. Record the tested implementation SHA and pending tests honestly.
Keep the state file's self-referential checkpoint SHA discoverable using
`git log -1 -- docs/audit/STATE.md` rather than inventing its own future commit hash.
Report BATCH, STATUS, FIXED, TESTED, EVIDENCE, NEXT and CHECKPOINT concisely.
