# Performance evidence

## 18 Nov 2026 — merged current main; exact merged-head regression, Android and APK gates GREEN

Current feature head is `7ca6d74808cefd2a0e66e74e4f2c4b3d94b69d39`, a proper two-parent merge of the protected feature work and current main `41e3ef709059922ccae7f7e5570ac7764eeb3817`. PR #65 remains DRAFT. The two main-only commits contained exactly 37 public market-data JSON/index/history files; they are now present in this branch. App/runtime source was not changed by this merge.

All three exact merged-head workflows PASS:
- [Full regression/audit #432](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/44412013261), artifact **14478006137**: source/Python/JavaScript/browser checks, populated synthetic visual acceptance, startup/chart benchmark, six-pair cold-start profile, baseline/retention probes, three repeated 100-cycle retained-session probes, exact candidate lock, offline rollback rehearsal, main-drift guard and actionlint all passed.
- [Android 35 AOSP emulator #61](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/44412013286), artifact **14477254013**: all nine native functional/lifecycle cases passed. Forward swipe had 20 moves, one end, zero cancels; reverse swipe passed; OSRS inner scroll moved 289.9px while document Y stayed 0; rotation and background/resume preserved the live document. The preview package is `com.goldenhub.dual.preview`, not the user's installed app. All five native screenshots are black; harness correctly flags native visual capture unsupported.
- [Separate Android preview APK #93](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/44412013283), artifact **14477357406**: build, manifest/signing and exact reviewed frontend embedding all passed. Preview-only; no installation or replacement.

The six-trial synthetic desktop Chromium cold-start profile is in audit artifact 14478006137 (`audit/golden-experience/osrs-cold-profile.json`) and is preserved as `evidence/osrs-cold-paired-7ca-20261118.json`: correctly calculated six-sample median ready time 220.3ms baseline vs 224.9ms candidate (4.6ms slower); p95 227.7ms vs 232ms; zero long tasks in all six trials for both revisions. This is a small synthetic desktop fixture, not Android WebView, real network, hardware FPS or real-account performance.

The repeated-session report and all three repeats each held at **961 DOM nodes** at 0/25/50/75/100 measured cycles; no errors. Heap rose from roughly 2.95MB to 3.06MB over the 100-cycle synthetic session. Browser screenshots cover both games, multiple phone/tablet/desktop widths, 200% text, populated GW2, OSRS action/settings/error/recovery states. These are synthetic browser visual checks, not physical-phone acceptance.

Main is now incorporated: compare reports **156 commits ahead, zero behind**. PR #65 remains DRAFT and mergeable. No production deploy, merge, Cloudflare project mutation, Worker/D1 write, APK install, production data change or credential change occurred.

**Still not READY for release:** no real independent Cloudflare staging project/readback or hosted rollback; no physical-phone visual/performance/lifecycle acceptance; actual installed package, signer and storage/origin remain unknown. The old remote-WebView wrapper and later bundled Capacitor APKs have different update behaviour. Preserve the existing installation. The native emulator framebuffer is black and cannot certify visual appearance.

**My-side work completed:** existing app upgrade, regression and visual fixture coverage, native functional/lifecycle verification, preview APK packaging, paired performance and retention investigation, merge of current main data snapshots, offline rollback rehearsal, fail-closed staging guard and updated continuity records. The remaining Cloudflare/account/device actions require owner-controlled access that this connection does not provide. Do not merge/deploy or replace the APK; owner-side staging/device verification and explicit `Implement` remain required.

## 18 Nov 2026 — chunked worker removes the native long task in AOSP rerun
Run [44403468977](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/44403468977), artifact **14472878310**, on candidate `f0bd32b8`: all nine native functional checks passed; forward swipe 17 moves / one end / zero cancels. The trace recorded **zero long tasks**. Remaining LoAFs were initial document render (167ms, 10ms blocking), app-script startup (83ms, 33ms blocking), and one 53ms gesture frame with 0ms blocking. This is a strong measured improvement over the prior 1,707ms `Worker.onmessage` long task, but still an AOSP emulator result, not a physical-phone certification. All AOSP framebuffer screenshots remain black, so this run is not visual QA evidence.
Regression audit 44403469047 passed source/Python/browser checks but failed one stale assertion: after two bounded metadata writes, a warm reload correctly adds no writes, so the cumulative count remains two. The assertion now checks two. Re-run full CI and native QA on the exact corrected candidate before accepting.

## 18 Nov 2026 — bounded-worker candidate audit found a missing helper; restoring it
The first chunked-worker candidate `491e85b5` triggered all three workflows. Preview APK packaging succeeded. The regression audit failed in the browser test stage because the helper replacement accidentally removed the existing `parseOwn` full-catalogue parser; the resulting repeated `parseOwn is not defined` errors are a real regression, not a test-only failure. Restored the original validated parser without changing its semantics. Re-run CI and native QA are required before accepting the chunked-worker change.

## 18 Nov 2026 — second native trace identifies remaining main-thread catalogue work
Run [44402383543](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/44402383543), artifact **14472881931**, passed all nine native functional checks (forward swipe 19 moves / one end / zero cancels; reverse, vertical scroll, rotation and resume also pass). It still recorded a **1,707ms** long task, attributed to `public-market-feed.js` `Worker.onmessage`. This confirms the single-message worker response still incurs expensive structured cloning plus synchronous map construction/hydration on the UI thread. AOSP screenshots remain all black and are not visual QA.
The next correction sends 250-row worker chunks, validates/builds the item map incrementally on the main thread, and uses the already-batched/yielding `hydrateIndex` path. It also corrects the two failing JS tests exposed by audit 44402383428. No improvement is claimed until full CI and a new native trace pass.

## 18 Nov 2026 — worker parse succeeded; main-thread hydration became the next bottleneck
At exact source `fbd59e0`, native run [44401725555](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/44401725555), artifact **14474096115**, passed all nine functional cases. The original `Response.json.then` 1,663ms task disappeared, but a **1,072ms** task remained, now attributed to `public-market-feed.js` / `Worker.onmessage`. The worker had moved JSON parsing off-thread; the reply path still performed full Map validation, metadata comparison/hydration and one large IndexedDB batch synchronously. GE-07 follow-up now writes metadata in bounded 500-row batches and yields to the UI event loop between batches. The new exact native rerun must confirm whether the residual task is eliminated or whether structured-clone/Map validation also needs off-thread work. No performance improvement is certified yet.

## 18 Nov 2026 — Android first-swipe long task narrowed to public index JSON parsing
Native AOSP ATD run [44055560918](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/44055560918), artifact **14316026977**, passed all nine native functional checks. The trace records one 1,663ms long task immediately after the successful first swipe; LoAF attributes the full task to `public-market-feed.js` / `Response.json.then`. Startup invokes `GPMarketFeed.loadIndex(State)` once from `index.html`; the current public `data/market_index.json` blob is **1,550,013 bytes**, while `market_public.json` is **15,657,429 bytes** and is only requested by explicit deep discovery. The trace does not include the response URL, so the 1.55MB index is the strongly supported startup-path attribution, not an exact URL captured in the event.
GE-07 correction: compact-index JSON parsing is moved into a dedicated same-origin Web Worker. If the worker/index is unavailable, startup now preserves existing metadata and returns without falling back to a large main-thread full-catalogue parse; explicit deep discovery still retains the complete quote feed. New tests cover worker use and fail-closed missing-index behaviour. Exact CI and repeated native timing evidence are **PENDING**; this is not yet a measured performance improvement or phone certification.

## 17 Nov 2026 — AOSP ATD native latency breakdown
Exact green [native 44054851609](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/44054851609) at `00665acd`: 410ms real ADB input command for nominal 350ms first GW2→OSRS, 1 touchend/0 cancels, functionality verified. One `longtask` 1,015ms, long-animation-frame start ~1059ms duration 1024ms/blocking 967ms; LoAF scripts attribute ~6ms to `endGesture` listener, while no individual `getBoundingClientRect` call >=12ms was recorded. The remainder is NOT proof of a specific CSS/layout/render cause; requires controlled trace, profiler and physical-device testing. ATD framebuffer returned totally black PNGs (detected in code), NOT valid visual timing evidence. This is native functional sign-off only, **not** the user's desired perfect 2026 phone experience.


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
