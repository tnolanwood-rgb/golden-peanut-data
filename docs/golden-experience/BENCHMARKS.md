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
