# Performance evidence

## 17 Nov Android emulator input-duration anomaly (not FPS claim)
[Android CI 44049887731](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/44049887731), AOSP API35 4 cores, 4GB RAM, separate debug preview app. Native input focus verified. ADB OS swipe requested 350ms but wall time was 7,671ms. Captured WebView stream 1 touchstart/4 moves/0 end/1 cancel at x321→254 CSSpx, and a 1,504ms self long task. The long task coincided with interrupted input but has not been attributed to a specific app function. This does not prove a healthy 350ms interaction on a physical phone, nor that WebView or emulator alone caused the stall. Full source/browser CI passed separately; native touch performance remains BLOCKED.


## 16 November — actual Android touch-stream functional evidence, not FPS
Source `e538b648d1d2d48eb360b8615f7fbd8707b73486`, [native emulator CI 43965081137](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43965081137) PASS, artifact 14277315133. First emulator before CSS fix: 1 touch start, 4 moves, **1 cancel, 0 ends**, GW2 remained selected. After retaining moving-panel pointer events: 1 start, 4 moves, **0 cancels, 1 end**, GW2→OSRS succeeded; rotation and HOME/resume kept the active document. Validated an actual Android input defect and correction. **No numeric FPS, p95 press/latency, physical touch-to-paint, CPU/energy or long-duration memory claim** follows from this functional test. Hardware and representative data stress still required.


## 16 November — OSRS action-first geometry; zero performance extrapolation
Source `e654b1d496e8582c9176a2cd5db29506842e5d4f` [full CI 43944884562 PASS](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43944884562). Existing OSRS nodes were reparented **once** before event listeners attach; no new endpoint, recurring timer, chart renderer, financial calculation or gesture subscription. Verified 390×844 card top 325.53px, item title top 576.31px and entire first buy instruction bottom 816.86px. Full desktop Chromium swipe, startup and 400 retained-session tests green, native preview build green. This is usability/visual-hierarchy evidence, **not** measured improvement to real Android FPS, start latency, RAM, battery or touch-to-paint. Hardware acceptance remains OPEN.


## GW2 conditional financial-panel DOM retention — 16 November 2026
Code `4e9574fa0d226ca539db90701b17b2d1d6af30af` [CI 43935010936 PASS](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43935010936). Repeated identical GW2 Today refreshes no longer replace the active-book rows, review control or trading-outlook DOM. Signatures cover visible market name/volume/conditional gold, committed capital/review amount, overnight scenario, wallet allocation, backtest metrics and recent ledger summary; real changed values invalidate. Lower DOM/element allocation expected. **No hardware FPS, power, startup or touch-to-paint delta claimed**. Existing 400 synthetic retained-session checks pass.


## GW2 Today DOM allocation fix — 16 November 2026
Exact source `66eb0b9a4b4cf070b614b82ad565f810f4282010` [CI 43922372800 PASS](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43922372800). Next-action card/body/button now preserve object identity through six repeated equal-data renders; a changed recommendation still mutates text and the newest callback in place. Fewer unnecessary element/listener allocations are expected, but **no quantitative physical Android frame-time, memory, or energy savings are claimed**. Full production and native acceptance pending.


## 16 November — OSRS 150%/200% accessibility sizing and interaction evidence
Exact source `9e6bf9e589c4fbe0d9037257e3e9590a01016ab1` [CI 43913882902](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43913882902) PASS; static CSS height/font adjustments and browser geometry tests only. 320px/32px-root: 1040px card/834.03px inner viewport, first buy instruction bottom 765.81px, evidence 22px; document scrollWidth 320px. 320px/24px-root: 840px card vs 570px default. Secondary Wiki-stats request coalescing, ledger recomputation avoidance and GW2 retained DOM optimisations passed full browser regression. New height changes were not benchmarked as causal speed improvements. The CI's desktop Chromium synthetic cold probes and 400 retained-navigation cycles do **not** constitute Android physical WebView/FPS, battery, RAM or first finger-to-paint acceptance. Remain OPEN.

## Latest DOM and interaction constraints — 16 November 2026
`93e7aa9184072f275121fabb513b01d567deb929` [CI 43902534973](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43902534973) passed after avoiding unnecessary GW2 Advanced wallet/week DOM+coin image rebuilding. Exact UI refresh identity is tested and refresh still invalidates on real data. This removes avoidable DOM allocation but no quantifiable Android FPS, battery or startup improvement is claimed. Long name wrapping, focusable OSRS inner scroll and per-idea reset have no external network/framework/runtime dependencies; synthetic Chromium touch/keyboard and 400 cached session cycles passed. Hardware WebView measurements remain required.


## GE-02 deep styling (no performance inference) — 16 November 2026
Source `d76ed0fd43200b4b9ea1eb5d0b4242a16437c740` modifies static CSS only and Chromium geometry tests. No added JS handlers, timer, dependency, API calls or data-format change. CI 43889263582 passed existing startup and strict synthetic session probes, not on-device FPS, p95 touch-to-paint, energy or paint area comparison. Larger row type/padding could increase scroll-paint cost; measure on physical Android before claiming speed or full visual success.

## GE-02/07 adaptive text and history DOM optimisation — 16 November 2026
Current code `8662a06c61721443f419a9a4d4207bf4c5360e23` retains unchanged GW2 seven-day DOM nodes/currency icons on refresh; test proves exact same-node identity and true changed historical profit rendering. This avoids 7-row reallocation in unchanged Focus Today redraws, but has NOT been assigned a claimed ms/FPS performance benefit without before/after instrumentation. Rem-responsive financial grids and scoped 320px budget font produce nonoverlapping visual layouts; these are visual correctness, not Android throughput measurements. Full [CI 43882425654](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43882425654) passed including existing synthetic cold profile and 400 100-cycle totals; still need real WebView render/battery/scroll and physical phone before final readiness.


## GE-01/02 dramatic visual design vs runtime performance — 16 November 2026
Visual fascia batch adds approximately **11,390 CSS characters** to the existing combined stylesheet; the new styling adds **zero network requests**, external resources, JS timers, runtime dependencies, live-data calculations, touch handler changes, SVG data transformations or native dependencies. These are code properties, not measured speed gains. [CI 43874452456](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43874452456) passed synthetic gestures and long-session retention across all strict suite assertions; this does NOT establish zero native stutter, Android p95 or production load improvements. Compare fresh startup/switch distributions against earlier pinned baseline only after identical repeated profile conditions; static background raster cost and battery need physical WebView evidence. The real first content metric for unconnected GW2 isn't representative of authenticated portfolio loading.


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

## Extra retained-session repeatability — 16 November 2026

CI 43860812627 ran the original 100-cycle retained session and three fresh 100-cycle replay sessions with unchanged strict node-growth/continuity/page-error guards: all four passed. Independent contexts reduce the chance that one favourable run masks sporadic growth, but cannot guarantee absence of leaks. Current synthetic measurements cannot be generalised to hours-long real Android usage. Earlier intermittent CI 43854807834 failure still requires diagnosis if it recurs. No runtime app change.
