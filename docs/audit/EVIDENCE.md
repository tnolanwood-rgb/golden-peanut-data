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
