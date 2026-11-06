# Sources and attribution

Inspected on 2026-11-06. Golden Peanut implementation is original; no external source
code was copied into this release.

## Flip Out (PieOrCake)

[Repository](https://github.com/PieOrCake/flip_out), whose README declares MIT licensing.
Inspected `README.md`, `scripts/update_items_index.py`, `scripts/update_seed.py`,
`src/Analyzer.cpp`, `src/TPAPI.cpp`, `src/PriceDB.cpp` and directory listings.

- Item index: `[{id,n,r,i}]`; full commerce ID catalogue and batched official metadata.
- Seed format: `{itemId:[{t,b,s,bq,sq}]}`. Seconds since epoch; quotes and standing
  quantities. Its current updater retains 14 days and downsamples by UTC day.
  Golden Peanut's adapter reads that format without inventing intraday samples.
- Manipulation research: bid/ask-ratio and price-versus-history outlier checks are
  useful cautions, not proof of manipulation. We do not infer intent from a spike.
- Its `volume_score` uses outstanding buy/sell quantities; its total-profit sort
  multiplies spread by book quantity. Neither is an execution-volume estimator.
  These ranking formulas were deliberately not adopted.
- Crafting inspection: correct high-level join of official output/ingredient IDs,
  output counts and bid/ask pricing modes. Quote-only ingredient prices do not prove
  bulk execution cost. Golden Peanut retains multiple recipe variants, blocks
  unsupported non-item ingredients and labels crafting returns conditional.

Existing public fallback URLs remain attributed in `public-market-feed.js`. The
20.9 MB seed was not copied into the repository. No third-party code or licence text
was stripped; there is no vendored Flip Out implementation requiring a copied notice.

## Statistical research

- [lifelines survival analysis source documentation](https://github.com/CamDavidsonPilon/lifelines/blob/master/docs/Survival%20analysis%20with%20lifelines.rst):
  inspected event/censor definitions and Kaplan–Meier risk-set estimator. Supports
  keeping an unobserved outcome separate from an observed failure or completion.
- [statsmodels survival-function implementation/documentation](https://github.com/statsmodels/statsmodels/blob/main/statsmodels/duration/survfunc.py):
  inspected event-status and entry-time contracts; entry times handle left truncation.
- Hyndman & Athanasopoulos, *Forecasting: Principles and Practice*,
  [time-series cross-validation](https://otexts.com/fpp3/tscv.html), is a methodological
  reference for rolling-origin validation. The web response in this environment did
  not expose usable chapter text; this is not claimed as newly retrieved evidence.

The model document explains why these approaches were evaluated but a simpler joint
24-hour empirical baseline was implemented first. No statistical accuracy claim is
based on these references alone.

## Official public data

[GW2 API v2](https://api.guildwars2.com/v2): `commerce/prices`, `commerce/listings`,
`items`, `recipes`. The collector was exercised against those live endpoints. Personal
endpoints are used only by the browser's read-only official API adapter; they were
exercised with synthetic fixtures, not this user's unavailable API key.
