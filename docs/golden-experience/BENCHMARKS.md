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
