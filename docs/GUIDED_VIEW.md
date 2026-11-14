# Golden Peanut guided UI — source, defects and guarantees

## Confirmed root causes of the "18 of 35 / Review skipped (17)" screenshot

1. Old `app/guided-peanut.js` saved skipped IDs in the unscoped browser key `gp-guided-skips-v1`, loaded them at startup, and displayed the count on every reload. Thus "Review skipped" was not necessarily work the user did that session.
2. Live market research recomputed, filtered and sorted up to 35 suggestions repeatedly. The old view preserved only `current` item ID and then calculated `rows.findIndex(current)` in a newly ranked array. A card that was originally first could become "18 of 35" without any navigation click.
3. The first repair corrected the Skip counter arithmetic, but not the live ranking race, persisted skip state, or browser-reload behaviour. Initial tests asserted only immediate button transitions.

## Replacement navigation contract

- `app/guided-deck.js` is a small pure state machine. There is no persistent skipped-item bin, nor any stored per-item progress.
- On a fresh page load, the first visible idea is **1 of N**. Once displayed, its ID stays first while background discoveries are appended *behind* it, capped at 35. Background repricing does not silently replace the first idea.
- The first explicit Next/Skip/Previous freezes the entire order and denominator for that page visit. Next goes to the next numbered idea; Previous goes to the immediately preceding numbered idea; Skip marks the current item only in memory and moves forward. Previous can always revisit it.
- A final-card **Start again** or a clearly requested **Update idea list** adopts the current market ranking and resets to 1. Otherwise, new research cannot alter a browsing session's position or total.
- If a formerly qualified item's current quote is missing or expired, the same numbered card shows a verification warning, not stale buy/sell prices. The user can use Next or Update idea list.
- A reload starts a fresh deck. Account change resets the deck. The obsolete `gp-guided-skips-v1` UI key is deleted on startup; account keys, market ledgers, orders and IndexedDB are untouched.
- Expanded Delivery Box details are preserved through background redraws. Guided values reuse the existing independently validated value and GW2 coin artwork.
- Advanced mode remains available. No GW2 Trading Post orders are placed automatically.

## Source and checks

- `app/guided-deck.js` — deterministic deck ordering, session navigation, explicit refresh.
- `app/guided-peanut.js` — display controls, verified quote presentation and charts.
- `app/guided-peanut.css` — responsive, high-contrast UI.
- `tests/guided-deck.test.cjs` — pure state tests: late discovery, reordered research, expiry, account switch, reload, reset and skipped navigation.
- `tests/browser.cjs` — assembled app with synthetic account/quote fixtures; assert ranking/reload behaviour, stale quote handling, charts, currency icons and advanced mode.

Validation: `npm ci --ignore-scripts`, `python scripts/check_release.py`, `npm test`, `npm run test:browser` (Chromium required). Browser tests are not a substitute for physical Android WebView testing and do not establish real trading-profit accuracy.

## Evidence labelling

Forecasts with observed execution outcomes, historical conditional lot margins, and unverified public bid/ask spread research remain distinct. No public quoted spread is presented as guaranteed completed trade volume or guaranteed overnight profit. The existing GW2 trading intelligence, collector and account data are unmodified.
