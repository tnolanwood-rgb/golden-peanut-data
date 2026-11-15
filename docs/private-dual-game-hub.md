# Private Golden Hub — dual-game trading app

**Status:** draft preview; not approved for production. Keep this private-personal project separate from any possible future Play Store release.

## Product contract

One Cloudflare Pages app hosted from this existing repository. Two game desks selected by the same persistent two-tab control, with left/right swipe as a shortcut.

- **GW2 / The Golden Peanut:** retain the production collectors, saved account API key, verified histories, financial accounting, training evidence, market discovery, relics/legendaries, and all existing features. Do not change account schema or namespace.
- **OSRS / The Golden Exchange:** retain independent local GP budget, account modes, GE tax, tax-exempt item list, limits, trade records, price histories and live pricing. No RuneScape login or trading automation is offered.
- **Visual parity:** shared header geometry, typography, spacing, action positioning, card dimensions, progressive disclosure and chart interaction. Individual game theme, iconography, denominations and item semantics remain separate.
- **One switch location:** only the top two-tab selector; do not add extra "Switch to..." bars or OSRS-to-GW2 deep links.
- **Startup:** never expose previous legacy GW2 dashboard before guided desk has mounted; do not auto-prompt for account credentials or reset them when switching.
- **State:** persist which game the user last opened and the position within the currently viewed trading idea. Do not refresh/reload the entire web page on a desk switch. Keep OSRS private ledger in its own namespaced storage.

## Current branch

- \`app/dual-hub.css\`: shared navigation and OSRS theme using the same \`gp-guide-\` geometry as GW2.
- \`app/dual-hub.js\`: same-origin router and swipe, cached OSRS Wiki v2 bulk mapping/last/5m/1h research, recent-volume and after-tax eligibility checks, a guided idea card, manually recorded FIFO purchase/sale ledger, OSRS time-series chart.
- \`app/index.html\`: includes the router and hides a successful integrity diagnostic (warnings remain visible).
- \`tests/dual-hub.browser.cjs\`: synthetic browser tests for the new desk and navigation.

## Source-of-truth and limitation

The user's original **Golden Exchange v4.0 QA** Android APK contains a substantially more mature OSRS engine, including its own studies, session management, research, trade tracking and UI. The OSRS side in this branch is **not a feature-complete migration of v4.0**; it is an independently working early Cloudflare-native integration. Do not claim full parity.

The original engine was extracted from \`Golden-Hub-Unified-Preview-v3.apk\` under \`assets/public/app.mjs\` and companion \`index.html\`, \`simple.css\`, \`base.css\`, \`studio.css\`. Before replacing the older OSRS app in daily use, import and audit the original code into the repository, resolve its Capacitor-only pieces for the browser, and write regressions for all of its analytical algorithms and persisted trade data.

**Do not mix OSRS and GW2 storage.** The OSRS APK origin's localStorage does *not* automatically transfer to a Cloudflare website origin. Build an opt-in explicit export/import with backup and schema tests before any migration.

## Deployment

Main branch already deploys \`app/**\` to the existing Cloudflare Pages project via \`.github/workflows/guided-ui-production.yml\`. This branch must pass the existing GW2 regression suite *and* the new synthetic OSRS browser test before merge. Production must be verified by the workflow's exact hash checks. Do not alter Cloudflare project name or collector jobs.

The existing **Golden Hub Unified** Android APK shows an unwanted native activity header in addition to the webpage. No CSS in Cloudflare can remove that native Android activity header. Once the two website desks are validated, build a **new thin Android shell** whose single WebView opens the Cloudflare domain and has no extra native switcher; keep existing Android package identities and local data safe until explicit backup/upgrade is verified.

## Data reliability

- Price source: OSRS Wiki API v2, not scraped HTML.
- Public observations are not guaranteed orders or fills.
- OSRS tax: 2% rounded down, capped at 5,000,000 gp per item, with item exemptions.
- OSRS realised profit only from user-entered completed fills; historical cost matched FIFO.
- GW2 remains backed by account-specific verified histories and does not inherit OSRS accounting.
- External API CORS, persistent device storage, chart gestures and field-level formatting must be physically tested before promotion.

## Release gates

1. Existing GW2 browser regression green, no account key or saved data regression.
2. OSRS synthetic price, tax, fill, state, chart and navigation tests green.
3. Actual OSRS price API/CORS and caching verified at the Cloudflare origin.
4. Two modes visually reviewed at narrow/wide mobile sizes. No duplicate native header.
5. Original v4 advanced features faithfully migrated and any OSRS local data is backed up or imported.
6. Separate Play Store compliance, rights, licensing, privacy and publisher account review only if public distribution is later desired.
