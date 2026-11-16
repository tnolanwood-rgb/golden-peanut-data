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
