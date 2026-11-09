# Findings

| ID | Severity / certainty | Root cause and consequence | Repair / next test |
|---|---|---|---|
| F001 | Critical / CONFIRMED | `github-collector.py` caught API/D1/poll errors and returned normally. `__main__` discarded result; workflow could report successful collection after failure. Synthetic HTTP 503 exited 0 although original 10 tests passed. Secondary error-write failures could expose traceback. | P0-001, implementation `e81d770`: explicit 0/1 exit; safe failure reporting; 7 new process tests. No-key/disabled are explicit successful skips, not collection proof. |
| F002 | High / CONFIRMED | Main release-labelled 7.24 still uses `7.16.0-evidence` in integrity/release gates and package version. `pages-production.yml` checks old substring/static signatures; `pages-preview.yml` pins old 7.16 branch. Stale source can satisfy version checks; green deployment is insufficient identity evidence. | P0-002: exact source/asset/version negative tests. No production change in this batch. |
| F003 | High / CONFIRMED | `execution-engine.js` returns `calibrated:false`, while `market-board.js` marks forecasts `calibrated-24h` and `focus-edition.js` displays “CALIBRATED 24-HOUR OPPORTUNITIES”. Presentation asserts evidence the model explicitly lacks. | REPAIRED in 003c52b: observed/estimated labels; engine→board and assembled UI regressions. No live improvement claim. |
| F004 | High / UNVERIFIED PATH | Source has private collector, D1 schema and authenticated app import. Latest inspected run logs a success marker, but no independent persisted-row/readback-to-UI proof was accessible. | P2-001. Trace bounded private observations without exposing rows/account secrets. Do not confuse this with F001 reproducer. |
| F005 | High / SUSPECTED | Current `market-board.js` has equipment/name preferences (`souvenir`, Pearl/exotic kinds); later changes may reintroduce category bias despite complete public catalogue. | P4-001 category-neutral fixtures and full trace through shortlist budgets before concluding whole categories excluded. |
| F006 | Medium / CONFIRMED | 7.16 documentation claimed no Worker, no private collector, no GitHub write access long after these existed. No durable session state; conversation-only continuation would regress current main. | P0-001 adds authoritative audit directory, AGENTS startup protocol and historical-note links. |

No real-account profitability, missing transaction count, data corruption or physical
Android defect has been proved in this batch. Those remain tests to perform, not facts.

## Follow-up confirmed repairs

- **F007 / High:** expected-profit validation used full-lot margin only; positive
  profit with zero expected resales passed. 003c52b bounds profit by expected sold
  units (before rounded fees, so this is a necessary upper bound), rejects infinite
  sample counts, and proves invalid bids are rejected by engine and displayed UI.
- **F008 / High:** board checked each order against current wallet separately, even
  when total exceeded it. 003c52b reuses allocator across eligible rows; preserves
  hypothetical/funded kind instead of upgrading all rows to funded.
- **F009 / High:** scan quotas could consume the budget before public and recipe
  lanes. Prefix allocations were 25%+25%+16%+23%+34%; taking in sequence starved
  later categories. P4-000 reserves 25/20/10/15/10/10/10 percent for catalogue,
  positions, history, public, recipes, cheap equipment and equipment families;
  dedup/spare-slot filling retained. This does not remove downstream F005 filters.

- **F010 / High, CONFIRMED and REPAIRED:** public quote screening admitted positive
  small-unit margins, but board silently required at least 50 copper per item.
  7e15c00 removes that mismatch without inventing volume; 220 additional material
  and 124 consumable entries survive the offline snapshot replay. Coverage counters
  expose remaining gates. F005 is now partly confirmed: name/unlock/ROI policies
  reject thousands of otherwise screened research entries; needs P4-001b review.

- **F011 / High, repaired:** public seeds grouped only price/depth, so categories
  with lower spreads could get zero slots despite eligible quotes. c09ad57 adds
  metadata category to grouping; failing crowded-category fixture now passes.

- **F012 / High, repaired 2e29aa6:** research visibility depended on English name
  tokens (Mini, Recipe, Tonic etc.) and collection unlock subtype. Rename-invariance
  and unlock fixtures failed despite identical viable quotes. Removed these gates
  without adding execution quantities/income. Remaining numeric policies stay explicit.

- **F013 / High, repaired a456967:** board rejected valid public research above
  250,000 copper regardless of research capital. Removed ceiling; actual wallet
  affordability and funded-allocation checks remain. Browser confirms expensive
  row is only in unfunded watchlist, never funded or cheap-primary suggestions.
- **F014 / Medium, repaired a456967:** public quote screener did not validate IDs
  and accepted NaN/infinite/fractional/string standing quantities through coercion.
  It now requires positive safe integer IDs/prices/depth, retaining the existing
  minimum standing quantity policy until separately audited. Book size is not fills.

- **F015 / High, repaired 8e5bc43:** ROI/depth gates and an arbitrary 3% exit
  discount hid positive-margin quote research. Now use inside-quote prices, retain
  positive net research, caution wide/thin books in secondary watchlist, no income claim.
- **F016 / High, repaired d19ae75:** Object.keys(metadata) ran on each family-loop
  iteration. Cache cardinality once; 1002→2 enumerations at 1000 rows, same candidates.

QH-001 CONFIRMED/repaired 5cecc05: renderConnectedMarkets multiplied every public quote by ui.marketResearchLot (up to250), producing unaffordable 425,000g scenarios and attractive bulk-profit headlines. Arithmetic was conditional, but display looked actionable. Public quote view now has null quantity/cost/expectedProfit and explicit affordability; individual scenarios remain expandable.
