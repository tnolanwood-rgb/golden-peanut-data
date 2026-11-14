# Golden Peanut Guided View — Exchange layout adaptation

## Design intent

This work adapts the user-tested single-screen pattern from the supplied *The Golden Exchange v4.0* source, **not** OSRS market calculations. It is a calmer, opt-out-by-choice presentation over the existing GW2 engine.

- One primary market idea visible at a time; large "Buy" and "Then sell" language.
- Explicit cost and profit labels in GW2 gold/silver/copper, never OSRS GP.
- Previous, Next and Skip (for this visit only). Previous revisits skipped ideas naturally; no separate skipped-bin or skipped IDs are stored. The deck starts at 1 of N after each page load.
- A compact Delivery Box value, realised today/7-day profit, and wallet at the top.
- An item-specific *public daily bid/ask snapshot* graph with zoom in/out, earlier/later and reset. Gaps in days are not interpolated. Missing chart data is disclosed, not synthesised.
- One-tap return to the full Focus Edition (orders, broader discovery, legendaries, account configuration). The legacy UI and history stay intact.
- System fonts, high contrast, generous line spacing, 44px+ tap targets, no animation required, narrow-phone wrapping.

## Safety and semantics

**Never combine evidence categories.** The guidance list orders: (1) execution-qualified forecasts with observed outcomes, (2) history-backed conditional lots *within verified wallet*, (3) single-unit public spread research with no proposed batch size. Unfunded or watch-only research is not framed as a buy order. Forecasts remain uncalibrated and are explicitly labelled. Every trade must be executed manually within Guild Wars 2. The guide does not write account keys, orders, learning evidence, ledger or IndexedDB.

**Delivery Box** uses the same Focus Edition verified display. A combined quoted value is *not* spendable balance and never becomes realised profit. See the detailed view for the valuation coverage, line items and fees.

Local browser preferences: \`gp-guided-mode-v1\` and \`gp-guided-skips-v1\` only. Mode defaults to guided unless explicitly set to advanced. The mode switch never changes app origin or account storage.

## Source

- \`app/guided-peanut.js\`: guided navigation, evidence-aware presentation, public history chart
- \`app/guided-peanut.css\`: mobile-first, responsive guided visual system
- \`app/focus-edition.css\`: imports isolated guided CSS
- \`app/focus-edition.js\`: loads isolated guided script after Focus Edition initialization
- \`tests/browser.cjs\`: synthetic fixture assertions for skip/return, chart zoom and advanced escape

## Validation and rollout

Suggested local checks: \`npm ci --ignore-scripts\`, \`npm run check\`, \`npm test\`, \`npm run test:browser\` with Chromium installed. This branch's tests are additions, not proof of real financial returns or Android WebView behavior. Browser/device QA should test portrait, narrow 320px and landscape, stale/missing market history, cold startup, Android Back, account disconnection, chart fetch failure, skipped-items persistence, and old data restoration.

Branch is intentionally based on \`fix/research-quote-headlines\` to retain the separate QH-001 quote safety fix. Do not merge, deploy or overwrite the active release simply to preview this UI. Its behavior must be independently reviewed in CI and on a test device.
