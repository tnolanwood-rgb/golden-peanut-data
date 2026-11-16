# Decisions

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
