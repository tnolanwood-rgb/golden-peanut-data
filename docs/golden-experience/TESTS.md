## Refinement batch — actual results

Implementation c775c4ec3f0efb22cf95455941156190579e635a: source/Python/129 JS and all NINE browser programs passed
locally. Tests now cover exact adaptive-axis point selection, >=12px rendered axes,
stable loading-modal geometry, cached reopen, visible saved feedback and existing
double-submit guard. 100 accelerated synthetic repeat cycles passed DOM/network/
continuity assertions; heap increased ~5%, so hours-long/Android leak proof remains
open. Screenshot review covered both main desks, doubled-font narrow OSRS, small
OSRS/GW2 chart and advanced GW2 entry. Principal populated-account/form/error/tool
state acceptance and physical-device checks are incomplete. Remote CI at prior
0307e68 passed run 43850320880; latest head pending. See evidence/refinement-*.json
and session-100-cycles.json. Never substitute previous-head CI for current-head CI.

## Chart frame batch

Implementation da58fbb0f8f133c92a776445eaf197cf607df133: source/Python/JS and all EIGHT browser programs passed.
New chart test asserts <=1 plot rebuild per frame for a 60-event burst, exact final
GW2/OSRS visible window and no point selection on cancellation. Existing chart
history, cached reopen, stale requests, touch, Back, rotation and accounting fixtures
still pass. No physical Android inference. Evidence: evidence/chart-checks.json.

## 2026-11-16 design batch actual results

Implementation 0288a66: full source, 56 Python, 129 JS and all seven browser
programs passed locally (new visual suite included). Baseline reports record the
precommit dirty tree honestly; no implementation changed between checks and commit.
Source/assets and lockfile unchanged except explicitly added stylesheet/test command.
16 states: 320/390/480 portrait and 844 landscape, 100%/200% root font with reduced
motion on larger font, both games. Contrast/touch targets/page-money-tab overflow,
keyboard and large-budget settings pass. Actual original physical Android remains
BLOCKED. Full visual acceptance of every principal advanced/form/chart/error state
is not complete. Exploratory benchmarks do not close performance gates.

# Verification matrix and actual results

Current baseline at initial main 097f012: source, Python and JavaScript passed;
assembled browser suite running at initial checkpoint. Full report in ignored
`artifacts/audit/golden-experience/baseline/baseline.json`; commit a sanitized summary
after completion. No physical-device result is implied by a green browser suite.

| Gate | Method | Current status |
|---|---|---|
| Source/assets/dependencies | npm ci --ignore-scripts; check_release.py; lock diff | TESTED baseline |
| Accounting/engines/security | Python unittest + npm test incl FIFO oracle | TESTED baseline |
| Assembled GW2/OSRS | all six npm run test:browser programs | IN PROGRESS |
| Swipe continuity | native Chromium touch, cancellation/reversal/nested scroll, no drag DOM/storage work, geometry | IN PROGRESS baseline |
| Owned sales | owned-sales.browser.cjs, partial/reload/no-recommendation | IN PROGRESS baseline |
| Item stats | actual public Wiki fixture, outage/variants/stale/safe rendering | IN PROGRESS baseline |
| Design/accessibility | 320/390/480/landscape, large font, reduced motion, focus/contrast, screenshots reviewed | TODO |
| Lifecycle/data/backup | fixtures + native original app cold/resume/rotation/process restore | TODO; native BLOCKED |
| Chart performance/cache | repeat inspect/pinch/pan/reopen, no game switch, accurate labels/ranges | TODO |
| Performance | repeated before/after, synthetic Chrome clearly labelled; real Android separately | TODO; Android BLOCKED |
| Long-session memory/CPU/battery | repeated sessions/heap/profile; hardware power where measurable | TODO |
| Slow/offline/partial sources | deterministic network failures/cache/stale labels | TODO |
| Staging and rollback | isolated synthetic candidate, manifest/live hashes, smoke/rollback rehearsal | TODO |
| Original APK compatibility | installed signer/package/origin, unchanged WebView loads candidate | BLOCKED; no device/adb |

Dependencies: Node v24.22.1 in this environment, Python 3.12, PyYAML 6.0.3,
locked playwright-core 1.58.2, existing `/usr/bin/chromium`. Do not install new
dependencies or rerun suites without a reason. Use latest repository instructions.
