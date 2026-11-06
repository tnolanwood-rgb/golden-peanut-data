#!/usr/bin/env python3
"""Public-only GW2 catalogue. Standing orders NEVER represent executed volume.

At most four concurrent requests; each completed batch is checkpointed. A failed
quote batch cannot publish a partial catalogue. All output is public API data.
"""
import concurrent.futures as cf
import datetime as dt
import hashlib
import json
import os
import pathlib
import random
import time
import urllib.error
import urllib.request
from email.utils import parsedate_to_datetime

API = 'https://api.guildwars2.com/v2/'
BATCH, DAYS = 150, 21
OUTPUT = pathlib.Path(os.environ.get('GP_MARKET_DATA_DIR', 'data'))
CACHE = pathlib.Path(os.environ.get('GP_MARKET_CACHE_DIR', '.cache/public-market'))
WORKERS = min(4, max(1, int(os.environ.get('GP_MARKET_WORKERS', '3'))))


def retry_delay(value, attempt):
    try:
        delay = float(value)
    except (TypeError, ValueError):
        try:
            delay = parsedate_to_datetime(value).timestamp() - time.time()
        except (TypeError, ValueError, OverflowError):
            delay = 2 ** attempt + random.random()
    return max(1, min(120, delay))


def get_json(path, *, attempts=5):
    for n in range(attempts):
        try:
            req = urllib.request.Request(API + path, headers={
                'Accept': 'application/json', 'User-Agent': 'GoldenPeanutPublic/7.16'})
            with urllib.request.urlopen(req, timeout=25) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            if error.code not in (429, 500, 502, 503, 504) or n == attempts - 1:
                raise RuntimeError(f'GW2 API HTTP {error.code} on {path.split("?")[0]}') from None
            delay = retry_delay(error.headers.get('Retry-After'), n)
        except (OSError, ValueError, TimeoutError):
            if n == attempts - 1:
                raise RuntimeError(f'GW2 API unavailable on {path.split("?")[0]}') from None
            delay = retry_delay(None, n)
        time.sleep(delay)


def read_json(path, default=None):
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return {} if default is None else default


def write_json(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix('.tmp')
    with temp.open('w', encoding='utf-8') as stream:
        json.dump(obj, stream, separators=(',', ':'), ensure_ascii=False)
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(temp, path)


def valid_int(value):
    return type(value) is int and 0 <= value <= 2**36


def catalogue(endpoint, minimum=1000):
    ids = get_json(endpoint)
    if not isinstance(ids, list) or len(ids) < minimum or any(not valid_int(i) or i == 0 for i in ids):
        raise RuntimeError('Incomplete ' + endpoint + ' catalogue')
    return sorted(set(ids))


def fetch_safe(endpoint, ids):
    if not ids:
        return []
    try:
        rows = get_json(endpoint + '?ids=' + ','.join(map(str, ids)))
        if not isinstance(rows, list):
            raise RuntimeError('Invalid ' + endpoint + ' batch')
        return rows
    except RuntimeError as error:
        if 'HTTP 404' not in str(error):
            raise
        if len(ids) == 1:
            return []  # retired ID: preserved as an explicit metadata gap
        mid = len(ids) // 2
        return fetch_safe(endpoint, ids[:mid]) + fetch_safe(endpoint, ids[mid:])


def batches(endpoint, ids, ttl, *, strict=True):
    """Bounded outstanding work, reusable across failed runs and cache restores."""
    CACHE.mkdir(parents=True, exist_ok=True)
    def fetch(chunk):
        digest = hashlib.sha256((endpoint + ':' + ','.join(map(str, chunk))).encode()).hexdigest()
        path = CACHE / (digest + '.json')
        cached = read_json(path)
        if not (0 <= time.time() - cached.get('at', 0) < ttl):
            rows = fetch_safe(endpoint, chunk)
            got = {r.get('id') for r in rows if isinstance(r, dict)}
            if not got.issubset(set(chunk)) or (strict and got != set(chunk)) or len(got) != len(rows):
                raise RuntimeError('Missing, duplicate or unexpected IDs in ' + endpoint)
            cached = {'at': int(time.time()), 'rows': rows}
            write_json(path, cached)
            time.sleep(.15)
        return cached
    with cf.ThreadPoolExecutor(max_workers=WORKERS) as pool:
        for offset in range(0, len(ids), BATCH * WORKERS):
            group = [ids[i:i+BATCH] for i in range(offset, min(len(ids), offset+BATCH*WORKERS), BATCH)]
            yield from pool.map(fetch, group)


def merge_history(rows, old, day, observation_times=None):
    recent = old.get('history', {}) if isinstance(old, dict) else {}
    fresh = {}
    for key, entries in recent.items():
        if not str(key).isdigit() or not isinstance(entries, list):
            continue
        days = {r[0]: r for r in entries if isinstance(r, list) and len(r) == 5
                and all(valid_int(x) for x in r) and day-DAYS < r[0] <= day}
        if days:
            fresh[str(key)] = [days[d] for d in sorted(days)]
    for row in rows:
        key = str(row[0])
        observed_day = (observation_times or {}).get(key, day*86400)//86400
        if day-DAYS < observed_day <= day:
            fresh[key] = sorted([r for r in fresh.get(key, []) if r[0] != observed_day] + [[observed_day, *row[4:8]]])
    return {'schema': 'golden-peanut-daily-v1', 'generated_at': int(time.time()),
            'source': 'ArenaNet standing quotes; NOT completed turnover', 'history': fresh}


def depth_rows(raw):
    out = {}
    for side in ('buys', 'sells'):
        levels = raw.get(side)
        if not isinstance(levels, list):
            raise RuntimeError('Invalid order-book side')
        if any(not isinstance(x, dict) or not all(valid_int(x.get(k)) for k in ('unit_price', 'quantity', 'listings')) for x in levels):
            raise RuntimeError('Invalid order-book level')
        out[side] = sorted(levels, key=lambda x: x['unit_price'], reverse=side == 'buys')[:5]
    return out


def run():
    ids = catalogue('commerce/prices')
    now = int(time.time())
    previous = read_json(OUTPUT / 'market_public.json')
    metadata = {}
    # Cache refresh every seven days, including stat attributes and binding flags.
    for batch in batches('items', ids, 7*86400, strict=False):
        for item in batch['rows']:
            metadata[str(item['id'])] = {k: item[k] for k in
                ('id', 'name', 'type', 'rarity', 'level', 'flags', 'details', 'icon') if k in item}
    rows, times = [], {}
    for batch in batches('commerce/prices', ids, 2*3600):
        for q in batch['rows']:
            values = [q.get(side, {}).get(k) for side in ('buys', 'sells') for k in ('unit_price', 'quantity')]
            if not all(valid_int(v) for v in values):
                raise RuntimeError('Invalid quote values')
            i = q['id']; meta = metadata.get(str(i), {})
            rows.append([i, meta.get('name', f'Item #{i}'), meta.get('type', ''), meta.get('rarity', ''),
                         values[0], values[2], values[1], values[3]])
            times[str(i)] = batch['at']
    if {r[0] for r in rows} != set(ids):
        raise RuntimeError('Refusing incomplete full-market quotes')
    rows.sort(key=lambda r: r[0])
    recipe_ids = catalogue('recipes')
    recipes = []
    for batch in batches('recipes', recipe_ids, 7*86400):
        recipes.extend(batch['rows'])
    # Daily rotating depth sample; cursor moves only in the published generation.
    cursor = previous.get('depth_next_cursor', 0) % len(ids)
    count = min(1200, len(ids))
    selected = [ids[(cursor+i) % len(ids)] for i in range(count)]
    depths = {}
    for batch in batches('commerce/listings', selected, 2*3600):
        for row in batch['rows']:
            depths[str(row['id'])] = {'at': batch['at'], **depth_rows(row)}
    generation = hashlib.sha256(json.dumps([rows, times], sort_keys=True).encode()).hexdigest()[:20]
    generated = int(time.time())
    history = merge_history(rows, read_json(OUTPUT / 'market_history.json'), now//86400, times)
    history['generation'] = generation
    # Changes describe OPEN orders, never completed trades.
    prior = {r[0]: r for r in previous.get('items', []) if isinstance(r, list) and len(r) == 8}
    changes = {str(r[0]): [r[i]-prior[r[0]][i] for i in range(4, 8)] for r in rows if r[0] in prior}
    public = {'schema': 'golden-peanut-public-v1', 'generation': generation, 'generated_at': generated,
              'count': len(rows), 'items': rows, 'quote_times': times, 'metadata': metadata,
              'coverage': {'universe': len(ids), 'quotes': len(rows), 'metadata': len(metadata),
                           'missing_metadata': sorted(set(ids)-{int(k) for k in metadata}),
                           'depth': len(depths), 'depth_universe': len(ids), 'recipes': len(recipes),
                           'quotes_complete': True, 'oldest_quote_at': min(times.values())},
              'depth_next_cursor': (cursor+count) % len(ids),
              'source': 'Official public GW2 API. Quantities and deltas are outstanding orders, NOT executions.'}
    outputs = {'market_public.json': public, 'market_history.json': history,
               'market_depth.json': {'generation': generation, 'generated_at': generated, 'items': depths, 'quote_changes': changes},
               'market_recipes.json': {'generation': generation, 'generated_at': generated, 'recipes': recipes}}
    # All network/validation work finishes BEFORE writing. Git commit publishes a generation atomically.
    for name, obj in outputs.items():
        write_json(OUTPUT / name, obj)
    print(json.dumps({'status': 'ok', 'generation': generation, **public['coverage']}))


if __name__ == '__main__':
    run()
