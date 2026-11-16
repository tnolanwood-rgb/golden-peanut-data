# Golden Experience roadmap

## 16 November — OSRS primary action now above fold
Exact verified `e654b1d496e8582c9176a2cd5db29506842e5d4f` [CI 43944884562 PASS](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43944884562), Android preview [43944884652 PASS](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43944884652). GE-02 first-screen OSRS action-first geometry TESTED: main item name and full buy instruction inside initial 390×844 screen, mode tabs integrated in card, all earlier financial/research sections retained below. GE-03 swipe interaction regressions TESTED with actual hit-test and native vertical-scroll assertion, but real Android hardware open. GE-09/GE-10 still TODO; production frozen.


## 16 November — separate Android build provenance proven (native hardware still OPEN)
Source `bf84c76e5d4ad68c99cd3fafa3c1235777a4e9e8`: Android [CI 43941763186 PASS](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43941763186), **37 source-matched bundled files**, debug signing and distinct preview package; web [CI 43941763243 PASS](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43941763243). Missing static frontend assets now fail closed rather than mixing production/preview versions. GE-08 native *packaging* TESTED; physical Android interactions/long sessions and isolated staging NOT VERIFIED. GE-09/10 remain TODO. No production change. Full details ANDROID-PREVIEW-BUILD.md.


## 16 November verified incremental checkpoint
GW2 finance-panel refresh stability now tested at exact source `4e9574fa0d226ca539db90701b17b2d1d6af30af`, [CI 43935010936 PASS](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43935010936): operating-book and trading-outlook nodes stay mounted on unchanged account refresh; in-place scenario/capital changes update; overnight gains labelled conditional. GE-07/08 remain **IN PROGRESS** because Android/WebView, third-party failures, complete visual QA, synthetic staging, integrated RC and rollback are still outstanding. No release or production mutation.


| Batch | Status | Evidence / remaining dependency |
|---|---|---|
| GE-00 Discovery/isolation/baseline | TESTED | Actual main/live 097f012; all 11 Actions and read-only CF inspection; full baseline. Hardware measurements BLOCKED. |
| GE-01 Shared design system | TESTED | Tokens plus a visibly distinct premium instrument fascia, game-specific identity, sculpted primary financial gauge and recommendation chassis; 16 automated visual states reviewed at CI 43874452456, native acceptance open. |
| GE-02 Main interface | IN PROGRESS | Latest exact source `9e6bf9e` full CI 43913882902 PASS. OSRS action-first price research, optional stat coalescing, retained Next/Previous scroll, 200%-text exact full BUY instruction with 22px evidence and value-tier caption, GW2 populated deep-market typography. Other complex error, chart, long-history, true Android visual QA OPEN. |
| GE-03 Motion/gestures | IN PROGRESS | Existing swipe retained; responsive premium geometry revalidated via visible contact-point hit-testing in full CI 43874452456 (strict finger follow, nested scroll, cancellation, no layout jumps); native feel/press latency open. |
| GE-04 Charts | IN PROGRESS | Frame coalescing/cancel/axes/exact tap/loading/cache tested; real touch feel/large-history performance/complete accessibility open. |
| GE-05 Startup/loading | IN PROGRESS | Existing caches preserved, new stylesheet request removed; mixed startup tails and real lifecycle remain open. |
| GE-06 Signature details | IN PROGRESS | Visible confirmed-save feedback, no duplicate writes; graceful no-haptics. Remaining confirmation/interaction acceptance open. |
| GE-07 Performance | IN PROGRESS | Intermittent 39-node jump isolated to one-time lazy GW2 Focus Today initialization; CI 43877197639 and 43877907764 passed with explicit first mount recorded before 400-cycle strict retention probes. Physical/long duration still unverified; GW2 wallet/week unchanged art retention and 100+100+100+100 synthetic session probes PASS CI 43902534973; native WebView, touch-to-paint, scroll/large history and long sessions remain open. |
| GE-08 Regression/a11y | IN PROGRESS | Exact `9e6bf9e` [CI 43913882902] full green. 320px 24px/32px-root geometry, visual screenshots and strict full BUY-price reachability; existing 16-state design, source/Python/JS/10 browser, swipe/chart/ledger/backup and 400 retained navigation trials PASS. Real WebView and staging not verified. |
| GE-09 Integrated candidate | TODO | Distinct synthetic staging, complete integration/acceptance, incorporate newer main without losing fixes. |
| GE-10 Final readiness | TODO | Freeze exact complete candidate, asset/dependency preflight/drift detection, tested release/rollback; no blockers allowed. |

TESTED means the listed local sub-batch evidence exists, not that physical/platform
or whole-product acceptance is VERIFIED. No phase is READY. Preserve compatibility;
OSRS v4 parity/import and calibration remain separate audit work.
