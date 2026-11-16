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
