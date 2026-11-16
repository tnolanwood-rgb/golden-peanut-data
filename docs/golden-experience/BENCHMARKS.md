# Performance evidence

No Golden Experience performance improvement is claimed at the initial checkpoint.
Baseline source: main `097f012c1f912411790dd7dce21434a9cdc497d2`.
Existing benchmark_startup.cjs measures synthetic JSON byte sizes and Node parsing,
not Android startup. Existing swipe.browser.cjs measures emulated touch geometry,
rAF gaps and drag-time mutations/writes, not hardware FPS. Preserve both.

Required controlled comparison: same machine/runtime/Chromium, synthetic data size,
viewport, CPU/network profile; at least 10 repeated cold and warm runs; record all
samples, median/p95/p99, requests/transferred vs decoded bytes, first useful content,
interaction readiness, switch/scroll/navigation/chart/press, long tasks/CLS/heap.
Separate browser fresh navigation, cache-warm reload, background resume and native
process lifecycle. An observed local regression must be investigated, not hidden by
a favourable sample. Budget: no meaningful p95/p99 startup/interaction regression;
p95 press target <100ms; no active-drag DOM/storage/expensive work; zero visible Y
jump; bounded requests/cache/memory. Device refresh-rate/battery/CPU/memory budgets
require representative Android evidence before final acceptance.

Unavailable here: original installed Android device, adb/emulator and signer, real
WebView cold/warm/frame/battery/rotation/process-restoration measurements. All remain
BLOCKED and prevent final readiness. Desktop viewport/CPU throttling is not a phone.

## Exploratory design comparison (not acceptance)

10 fresh-context +10 same-context reload samples per game; all raw samples committed
in evidence/startup-before-exploratory.json and startup-design-exploratory.json.
Ready median/p95 ms: GW2 before cold 658/1195, warm 302/699; initial design cold
599/734, warm 222/294. OSRS before cold 781/1160, warm 284/466; initial design
cold 628/1118, warm 250/513. One added stylesheet. Initial baseline overlapped local
checks and final responsive font-grid changes postdate these design samples. Treat
as exploratory only, no causal improvement or no-regression claim; repeat serially.
Small sample p95/p99 both select maximum; cannot estimate population tail reliably.
GW2 ready means unconnected shell; requests depend on readiness sampling instant.

## GE-04 chart event-work evidence

Synthetic same-task 60 pointermove burst, 120 OSRS buckets /90 GW2 days, headless
Chromium. Before OSRS 40 SVG rebuilds/51.5ms synchronous task, GW2 35/56.5ms.
After OSRS 1/0.6ms, GW2 1/0.9ms; independent full-suite replay 1/0.8ms and
1/0.3ms. Single task timings are observations, not stable device distributions;
work-count assertion and exact resulting windows are the regression contract.
See evidence/chart-before.json, chart-after.json, chart-checks.json. Data accuracy,
feeds, history windows and point inspection are preserved. No physical FPS claim.

## Corrected comparison and repeated-session probe

Exploratory startup reports are superseded for acceptance: historical assets were
served via interception while initial current assets used local HTTP. Corrected
benchmark_golden_experience.cjs serves both identically and records all static text
hashes, conditions, raw samples and nearest-rank quantiles. Final serial run pending.
HTTP caching is disabled by routing; warm means retained APPLICATION data cache only.

Repeated-session probe: five warmups +100 reduced-motion GW2↔OSRS/cached-chart cycles,
Chromium 156.0.8078.79. DOM961 at all five samples; each API fixture called once; no
ledger mutation, lost sentinel or page error. Explicit-GC heap 2,865,140→3,007,264
bytes (+142,124; ~5%). This short accelerated test cannot exclude long-lived leaks
or prove native/battery/CPU behavior. See evidence/session-100-cycles.json.

## Current controlled browser evidence (51e9526)

Corrected harness, identical in-memory static-text interception, separate serial
runs, ten fresh contexts and ten retained-app-cache reloads per game per revision.
No concurrent local browser suite. Warm HTTP cache is disabled by interception.
All raw samples, source identities and static text hashes are in evidence/serial-*.json.

| Useful-content readiness ms | Base median/p95 | Separate stylesheet | Consolidated current |
|---|---|---|---|
| GW2 unconnected shell cold |611/797|591/686|550/674|
| GW2 shell warm reload |230/293|242/297|244/305|
| OSRS fixture cold |671/726|648/721|645/798|
| OSRS fixture warm reload |190/311|224/325|198/307|

Mixed tails; no universal speed/no-regression claim. n=10 nearest-rank p95 and p99
both select max and are weak tail estimates. OSRS cold p95 remains an OPEN profiling
item. Current warm DCL medians GW2/OSRS192/160ms vs 190/153ms baseline; largest
observed startup long task current98ms vs baseline138ms (not a latency distribution).
Static mocked payload median774,626 vs760,246 bytes (+14,380; ~1.9%); actual mobile
compression/network not measured. Added stylesheet request eliminated; same original
number of linked stylesheet requests. Performance budget not closed on hardware.

CPU 4 native-Chromium-touch replay:26 cases per revision; all geometry/content-write
assertions pass. Max Y discontinuity0px for both. Per-case rAF gap p95 spans16.7–33.4ms
both revisions; observed gaps>34ms total11 before /8 after. Those are sampled frame
intervals across tests, NOT measured physical drops or evidence of 60FPS. JSON:
evidence/slow-swipe-before.json and slow-swipe-after.json. Native phone still BLOCKED.

## Paired CPU-sampled OSRS cold investigation — 16 November 2026

Added `scripts/profile_golden_experience_cold.cjs`. Uses Git pinned main baseline, identical asset intercepts, ABBA serial fresh contexts, six runs per source per CI job, two repeat jobs. Baseline→development median/maximum readiness: run 43854807834 288.6/365.1→281.6/321.6 ms; run 43855536154 357/387.4→343.4/361.1 ms. These CPU-instrumented values are NOT comparable directly with prior unprofiled figures; n=6 p95 equals maximum and weakens tail inference. Dominant CPU samples were Chromium program/idle/anonymous startup rather than a clear OSRS calculation hotspot. Cross-run medians varied widely; do not assert mobile speed or root-cause resolution. One follow-on session-retention CI failed node-growth and next passed, so long-session stability remains OPEN. Structured evidence and run identifiers in evidence/osrs-cold-cpu-paired-20261116.json; raw samples attached to each GitHub Actions run.

## Measured synthetic OSRS recommendation callback — 16 November

New 40 consecutive alternating Next/Previous clicks in headless Chromium fixture, after initial content ready: synchronous click-handler plus DOM response median 0.9ms, p95 1.7ms, maximum 3.2ms. Time begins immediately before calling `button.click()` and ends after return; excludes hardware touch event dispatch, frame compositing, actual rendered paint, other devices, network latency, long account histories, and real-world tap responsiveness. This is lower-level profiling evidence ONLY; original <100ms p95 user-contact target remains UNVERIFIED on Android. Source and screenshots linked in VISUAL-QA.md; exact green PR CI 43857515705.
