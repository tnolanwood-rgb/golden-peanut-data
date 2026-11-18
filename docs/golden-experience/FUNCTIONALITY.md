# Preservation map

| Area | Current implementation / behavior to preserve |
|---|---|
| Shared shell | dual-hub.js/css; accessible game tabs, finger-tracked horizontal swipe, independent scroll/selection, touch fallback, axis lock, cancel/reversal, chart exclusion and Back |
| Lifecycle | guided-visit.js, guided-peanut.js, focus-edition.js, dual-hub.js; first recommendation/top on true fresh launch, live-session resume and internal navigation retained |
| GW2 simple desk | guided-peanut.js; account refresh, Delivery Box gross listing value and item drawer, wallet/profit metrics, recommendation explanation/risk, Previous/Next, chart, advanced research |
| GW2 advanced desk | index.html, focus-edition.js; wallet, orders, completed transactions, realised FIFO/fees/cost basis, inventory, account/key settings, private monitor consent, backup/import, market research, allocations, legendaries |
| GW2 intelligence | execution/opportunity/capacity/portfolio/growth/market-board/legendary modules; evidence gates, observed vs hypothetical/funded, fees, queue/risk, no automated game actions |
| GW2 feed | public-market-feed.js; compact index, quote/detail fallbacks, daily history shards, request coalescing, official metadata/icons, stale handling |
| GW2 charts | guided-price-chart.js/css; independent modal, daily bid/ask quotes, supported calendar ranges, slider/date inspection, pinch/pan, keyboard alternatives, cached history |
| OSRS discovery | dual-hub.js; 5m/1h/latest/mapping Wiki API v2, discovery modes/search/floors/watch filter, budget/membership/account restrictions, GE limits/tax, evidence/stress labels |
| OSRS action | stable scrollable recommendation with fixed controls, Previous/Next, watchlist, official icon and value tiers, compact practical Wiki stats and safe source links |
| OSRS ledger | explicit purchase/sale fills, validation/FIFO/partial holdings/realised profit, purchased items reachable independently of recommendation, export/import validation/recovery |
| OSRS charts | dual-hub-chart.js/css; separate native dialog, 6h/24h/3d/7d/30d actual supported v2 history, inspection/pinch/pan/period extrema/cache/stale-response guards |
| Persistence | GW2 IndexedDB `golden-peanut-clean-v1`, same account schema; OSRS `gh-osrs-v1-config`, `gh-osrs-v1-ledger`, cache/recovery keys; no rename/reset/migration |
| Android | Existing production origin must remain; repository wrapper is separate debug QA package `com.goldenhub.dual.preview`, not proof of installed package/signer. Config changes preserve DOM; pause/resume, Back, bounded backup/file picker |
| Services | Existing Pages origin, public and private GitHub collectors, private Worker/D1/consent fences remain unchanged |

OSRS current importer supports `golden-hub-osrs-v1`. Complete original Exchange v4
parity and `golden-exchange-backup-v3` migration are **not implemented**. Rich legacy
corrections/tickets/owned/settings/audit must not be dropped by a future migration.
Original v4 archive is recorded in global audit; not present in this checkout.
