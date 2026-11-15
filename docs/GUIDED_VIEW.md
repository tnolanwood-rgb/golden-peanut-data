# Golden Peanut guided UI — source, defects and guarantees

## Confirmed root causes of the "18 of 35 / Review skipped (17)" screenshot

1. Old `app/guided-peanut.js` saved skipped IDs in the unscoped browser key `gp-guided-skips-v1`, loaded them at startup, and displayed the count on every reload. Thus "Review skipped" was not necessarily work the user did that session.
2. Live market research recomputed, filtered and sorted up to 35 suggestions repeatedly. The old view preserved only `current` item ID and then calculated `rows.findIndex(current)` in a newly ranked array. A card that was originally first could become "18 of 35" without any navigation click.
3. The first repair corrected the Skip counter arithmetic, but not the live ranking race, persisted skip state, or browser-reload behaviour. Initial tests asserted only immediate button transitions.

## Replacement navigation contract

- `app/guided-deck.js` is a small pure state machine. There is no persistent skipped-item bin, nor any stored per-item progress.
- On a fresh page load, the first visible idea is **1 of N**. Once displayed, its ID stays first while background discoveries are appended *behind* it, capped at 35. Background repricing does not silently replace the first idea.
- The first explicit Next/Previous freezes the entire order and denominator for that page visit. Next goes to the next numbered idea; Previous goes to the immediately preceding numbered idea. There is no Skip button or skipped-item state.
- A final-card **Start again** or a clearly requested **Update idea list** adopts the current market ranking and resets to 1. Otherwise, new research cannot alter a browsing session's position or total.
- If a formerly qualified item's current quote is missing or expired, the same numbered card shows a verification warning, not stale buy/sell prices. The user can use Next or Update idea list.
- A reload starts a fresh deck. Account change resets the deck. The obsolete `gp-guided-skips-v1` UI key is deleted on startup; account keys, market ledgers, orders and IndexedDB are untouched.
- Expanded Delivery Box details are preserved through background redraws. Guided values reuse the existing independently validated value and GW2 coin artwork.
- Advanced mode remains available. No GW2 Trading Post orders are placed automatically.

## Source and checks

- `app/guided-deck.js` — deterministic deck ordering, session navigation, explicit refresh.
- `app/guided-peanut.js` — display controls, verified quote presentation and charts.
- `app/guided-peanut.css` — responsive, high-contrast UI.
- `tests/guided-deck.test.cjs` — pure state tests: late discovery, reordered research, expiry, account switch, reload, reset and Previous/Next navigation.
- `tests/browser.cjs` — assembled app with synthetic account/quote fixtures; assert ranking/reload behaviour, stale quote handling, charts, currency icons and advanced mode.

Validation: `npm ci --ignore-scripts`, `python scripts/check_release.py`, `npm test`, `npm run test:browser` (Chromium required). Browser tests are not a substitute for physical Android WebView testing and do not establish real trading-profit accuracy.

## Evidence labelling

Forecasts with observed execution outcomes, historical conditional lot margins, and unverified public bid/ask spread research remain distinct. No public quoted spread is presented as guaranteed completed trade volume or guaranteed overnight profit. The existing GW2 trading intelligence, collector and account data are unmodified.

## 15 November — persistent OSRS-style price inspector

The old chart was a child of `gp-guided-root`. Every snapshot/deck refresh rebuilt that root; `setCurrent` also explicitly set `chartOpen=false`. Its buttons were misleading with sparse 10-day data: Zoom in changed the internally requested 21→14→7→5 recorded observations, Zoom out increased by seven, and Earlier/Later moved by three observations, not a stated calendar duration. At 10 observations, the first zoom tap had no visible effect.

`guided-price-chart.js` instead creates one native `<dialog>` outside `gp-guided-root`. The guided card calls `GPGuidedPriceChart.open({id,name})` and no longer owns chart state or repaints the chart. Account/quote/Delivery Box refresh cannot close a selected price chart. Explicit Close, Escape/system native dialog close or intentionally navigating to another idea may close it. The dialog can reopen the same item without fetching a second time while already open.

The layout copies the OSRS *interaction pattern*, not OSRS data: large teal observed bid and gold observed ask lines, **7 real calendar days** and **All recorded**, larger chart, observed-date slider, accessible actual GW2 gold/silver/copper icon values, touch tap-to-inspect and drag-to-pan/pinch-to-zoom. Native modal and slider targets are mobile-sized; the chart's gesture handlers live on the persistent dialog rather than SVG nodes replaced on redraw. `dialog.showModal()` handles focus and native Escape. The range slider remains mounted throughout an input drag. No opaque Zoom/Earlier/Later step buttons remain. Normal page scroll still works outside the chart; Ctrl+wheel zooms only inside it.

**Evidence boundary:** GW2 feed contains daily public *quoted bid/ask* snapshots (one per recorded day when available), not the OSRS app's hourly instant-trade buckets with completed transaction volumes. The chart must never imply GW2 daily standing quantity represents completed trades or invent 166 hourly points from ten daily snapshots. Gaps in calendar dates are not bridged by SVG line segments. Individual prices are inspectable per recorded date. Source stays public and read-only.

**Regression:** Synthetic assembled Chromium 390px and 1440px tests validate opening, selected-day slider, correct 7-day window, 8-day all-history window, coin icons, expanded layout, and persistence across repeated `GPGuided.render()` and `GPFocus.render()` calls. No production deployment or physical-device proof follows automatically from these tests.

## 15 November — confirmed production release

Merged PR #44 into main at `3eee015e3fb4b3a1a94f1c4a6b5eae8c8c1dd988`. Cloudflare Pages workflow run #43664749794 succeeded. GitHub Actions log: `VERIFIED: 33 exact production asset checksums at the existing Pages origin.` The updated chart source is hosted on the existing `https://thegoldenpeanut.pages.dev/` origin. Android wrapper/APK rebuild and physical device behavioural tests remain separate; the source Chromium browser gestures passed on both 390px and desktop viewports. Original trading ledger and private monitoring are untouched.
