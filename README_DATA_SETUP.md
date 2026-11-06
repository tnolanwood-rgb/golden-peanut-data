# Public collection setup — 7.16

The supplied 7.15 collector and workflow are integrated and corrected.
`.github/workflows/public-market-data.yml` runs daily at 03:17 UTC, or manually.
It has no GW2 account key and needs no Cloudflare credentials. Enable GitHub Actions
with repository contents-write permission for that workflow.

```sh
python scripts/public_market_snapshot.py
```

Outputs (one Git commit publishes the generation together):

| File | Contents |
|---|---|
| `data/market_public.json` | Complete commerce ID universe and price rows, metadata, per-item quote timestamps, coverage and missing metadata IDs |
| `data/market_history.json` | At most one public price observation per UTC day, retained 21 days |
| `data/market_depth.json` | Five price levels per side for 1,200 rotating items, actual timestamps, quote/standing-quantity changes |
| `data/market_recipes.json` | All official recipes, ingredients, output counts, disciplines and requirements |

The eight-column catalogue remains compatible with 7.15: `[id,name,type,rarity,bid,ask,bidQuantity,askQuantity]`.
New metadata retains official stat IDs/attributes and subtype, without guessing stat
families from names. Retired/missing item metadata is explicit; quotations are retained.
No outstanding quantity or quantity change is treated as executed trading volume.

Requests use up to three workers (hard maximum four), 150 IDs per batch, retry/backoff,
Retry-After support, timeouts and resumable per-batch cache. Price/depth checkpoints
expire after two hours; metadata/recipes after seven days. Only 404 metadata batches
split recursively. Incomplete, duplicate or malformed quote batches fail publication.
The Actions cache is saved even if collection fails. Re-running resumes successful
batches. `GP_MARKET_WORKERS`, `GP_MARKET_DATA_DIR`, `GP_MARKET_CACHE_DIR` configure a
local run. Cache and personal files are not committed by the workflow.

A depth rotation visits every current ID over about 24 daily runs; it is explicitly
partial coverage, not a full intraday order book. The original 15-minute D1 collector
continues its independent rotation and shadow price monitoring. Daily quote history
needs elapsed days to accumulate; a single successful scan is not 21 days of evidence.

App feeds use the repository's `main/data/` URLs. After merging the PR, run the public
workflow once before testing production discovery. The app also reads Flip Out's
public item index/price seed as a labelled fallback. Neither feed approves a live
trade: the app requests fresh official quotes before funding a purchase.
