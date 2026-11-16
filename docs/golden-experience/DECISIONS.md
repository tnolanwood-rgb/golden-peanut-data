# Decisions

## Android WebView touch ownership during stage movement — 16 November 2026
Keep the outgoing moving game panel pointer-interactive during the gesture; `pointer-events:none` invalidated the Android touch target before release (observed WebView `touchcancel`). The incoming panel is already marked `inert`, and the existing drag-click guard prevents accidental clicks. Retain compositor transforms and native vertical scroll semantics; no gesture controller rewrite or animation dependency. Evidence: before [run 43963187603](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43963187603) failed on a genuine Android native swipe; after [run 43965081137](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43965081137) passed, at source `e538b648d1d2d48eb360b8615f7fbd8707b73486`. CI screenshot/JSON artifact 14277315133. Keep physical Android acceptance open.


## Candidate source integrity — 16 November 2026
Record all app bytes and _headers alongside dependency lock and externally verified candidate/base identifiers. Stop release when any input differs. Keep the manifest outside app/, prohibit deployment actions in this tool and avoid collecting private data. A matching local manifest is not proof that Cloudflare staging, the production hostname or a physical Android install was checked.


## 16 November — prioritise the trade on the OSRS opening screen
The prior screen spent its first 844 phone pixels on identity, budget, realised totals, status and research form; the first market title/buy action was below the fold. Moved the **existing** trade card immediately beneath the game fascia and reparented **existing** liquid/high-value mode selectors to the top of that card before JS listeners attach. Retain manual budget, realised accounting, feed status, search/watched filters and owned-sale/backup controls below the idea, preserving one clear move first. Use DOM order for keyboard as well as visual order; avoid CSS `order` tricks, duplicated buttons or rewriting trading math. Keep saved game scroll and fixed internal trade navigation. Test first-screen title and full buy price; base source `e654b1d496e8582c9176a2cd5db29506842e5d4f` green CI 43944884562. Do not claim native smoothness from desktop emulation or change production before “Implement”.


## 16 November 2026 — keep exact buy action visible with Android type scaling
Mobile accessible text expands the OSRS card itself rather than truncating, ellipsizing, hiding secondary market evidence, shrinking real money or moving Next/Previous controls unpredictably. CSS uses a root-font-responsive 570px minimum / 1040px maximum `clamp(570px,max(74dvh,35rem),1040px)` only on narrow OSRS desks; default 320px/16px card remains 570px, 24px 840px, 32px 1040px. Critical 200%-text research evidence has 22px type and observed value-tier caption 20px. Real screenshot review discovered partial BUY price even though the first instruction started within the pane; strengthen test to assert the **entire** buy line fits, not just its top edge. No JS, dependency, touch, fee/ledger/API or native change; not proof of Android physical performance. Source `9e6bf9e` CI 43913882902 green. Do not flatten genuine long names or currency values.

## Deep-tool static hierarchy — 16 November 2026
- Preserve both engines, OSRS observed completed transactions versus speculative listing targets, GW2 official rarity and financial truth. Scoped styling only, not DOM, state, gesture or accounting changes.
- Real 320px/200%-font title/quantity/control and 390px GW2 populated/200% label layout assertions are more useful than appearance-only tests. No framework or third-party animation library.
- Earlier uploaded old APK has package `com.thegoldenpeanut.mobile` and same Pages origin (see ANDROID-ORIGINAL.md), but original V1 certificate alone cannot update current phone, and key/current identity remain unknown. Prefer web-only release.

2026-11-16:

- Work on `feature/golden-experience`, based on actual main `097f012c1f912411790dd7dce21434a9cdc497d2`.
  Preserve concurrent maintenance; no merges/deployments/production request edits.
- Use existing static application, guided views, independent game storage and SVG
  charts. No framework/dependency/native/package/storage migration is justified.
- Add one final shared stylesheet for a reviewable design-system cascade across
  the existing legacy styles; consolidate incrementally after visual tests. Preserve
  all official rarity/value-tier rules and icon frame geometry.
- Keep existing finger tracking, native scroll, dual-panel lifecycle and idle-work
  guards. A theme change is not evidence that a gesture rewrite is needed.
- Optional haptics must degrade gracefully. Current Android manifest has INTERNET
  only and no vibration bridge; do not change permissions or APK for decoration.
- OSRS v4 migration/parity and forecast calibration remain separate audit gates.
- Use local synthetic HTTP fixtures until staging's data/monitor isolation is proven.
  Never use private credentials to demonstrate design.

- GE-04: retain existing SVG engines; measured event bursts caused 35–40 redundant
  synchronous rebuilds. Coalesce render (not state) to requestAnimationFrame and
  cache contact geometry. No chart dependency/downsampling/inertia added without
  need; exact data and zoom endpoints remain. Cancel is not point selection.

- Refinement: use phone-sized logical SVG widths, preserving exact data and mapping
  touch inspection through actual viewBox geometry. Keep modal bounds stable during
  loading, rather than showing fabricated prices or animated shimmers.
- Manual-fill success status now lives outside the hidden form and is set only
  after durable validated ledger save. Preserve accounting and duplicate guard.
- Correct startup benchmark transport symmetry before acceptance; retain flawed
  exploratory samples with explicit limitations instead of disguising them.

- GE-05 supersedes initial separate-stylesheet decision: remove one new render-blocking
  request by appending the premium layer to existing dual-hub.css. Load chart CSS
  before that shared stylesheet to retain the tested final cascade. All source and
  nine browser programs pass. No bundler/runtime dependency or duplicate stylesheet.

- GE-07: add a CPU-sampled paired baseline diagnostic in CI rather than prematurely rewrite either game engine. The synthetic first-idea benchmark does not represent a loaded real GW2 account. Preserve one failed DOM-growth observation alongside a passing rerun; failure-only DOM subtree/tag evidence now saved by the repeated-session test. No runtime assets or trading code were changed in this continuation.

- GE-08: extend existing ten-program assembled suite with persistent OSRS state matrix rather than design-only snapshots. Capture ranked starting item rather than assume static engine sort; test error recovery without touching production prices. Keep simulated click-handler latency separate from finger-to-paint or physical WebView performance.

- GE-01/02 premium instrument face: retain same two DOM desks, shared CSS file and game-native trading colours, but replace the previous visually indistinct flat card composition with a clearly engineered fascia, numeric identity marks, full-span financial gauge and recommendation chassis. Two scoped palettes distinguish GW2 from OSRS without new image loads, scripts or framework. Test both 200%-font and landscape; do not claim first pass is final design.
- Larger header geometry invalidates a legacy swipe test's absolute y=350/420px assumption: its finger had begun on the market search input where page navigation is intentionally blocked. Choose a real rendered noninteractive card/scroller contact and keep all strict gesture position/data continuity assertions. Never weaken input-touch exclusion to satisfy a screenshot.
- Visual refreshes should retain existing financial coin artwork and action/delivery DOM where actual displayed values have not changed; fresh quotes/meta changes still invalidate the view. This reduces needless UI mutation without altering trading data or ledger behaviour.

- GE-02 responsive gauges: at Android enlarged fonts stack financial panels based on 10rem minimum *actual text scale*, preserving a two-column calm view at normal font. Keep the GW2 seven-day horizontal flex direction explicit; inherited vertical flex was visually broken but escaped overflow tests. Prevent it with geometry assertions, not only JS tests.
- GE-07 seven-day historical repaint: use seven exact day/value fingerprints to preserve physical DOM/coin images on refresh, while invalidating on actual trade changes and UK day rollover. No storage or accounting schema change.
- OSRS budget exactness: cap only the long manually entered headline on narrow devices; maintain an uninterrupted `250,000,000` visual token at 320px/24px enlarged font; very extreme values remain eligible for wrapping rather than clipping.
- CI screenshot captures of a sticky dock must start from the document top to avoid false overlap evidence from a retained scrolled position.

- Owner withdrew early partial-release request; resume protected full design engineering, no production deploy until final READY FOR IMPLEMENT followed by explicit “Implement”.
- GW2 Advanced unchanged wallet/week currency DOM should survive background updates, but real amounts must repaint. Preserve the value signature and already-decoded coin art.
- Large synthetic item labels fully wrap in both game desks and GW2 advanced at enlarged fonts. Never silently ellipsize item metadata.
- OSRS trade scroll is a named keyboard focusable region and scrolls vertically independent of persistent action dock. When navigating to a new item, reset *inner* scroll to top without resetting the whole game/page, and do not consume cross-game horizontal touch swipes.
