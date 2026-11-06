#!/usr/bin/env python3
"""Private Guild Wars 2 monitor running from a GitHub Actions egress IP.

The official API limits requests by IP. Cloudflare's shared Worker egress is
currently receiving HTTP 429; this collector uses the user's EXISTING GitHub
repository runner and private GitHub Actions secret instead.

No key or response bodies containing private data are printed. The key is
used in runner memory, not committed or uploaded as an artifact.
"""
import datetime
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API = 'https://api.guildwars2.com/v2'
AGENT = 'GoldenPeanutPrivateTradeCollector/1.0'
PAGE_SIZE = 200
MAX_CURRENT_PAGES = 20
MAX_HISTORY_PAGES = 12
QUERY_BATCH = 30
NOW = lambda: int(time.time() * 1000)


class MonitorProblem(RuntimeError):
    pass


def request_json(url, *, headers=None, payload=None, max_retries=2):
    meta = {'Accept': 'application/json', 'User-Agent': AGENT, **(headers or {})}
    body = None if payload is None else json.dumps(payload, separators=(',', ':')).encode()
    req = urllib.request.Request(url, headers=meta, data=body, method='POST' if body else 'GET')
    for attempt in range(max_retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                return json.loads(response.read(5_000_000).decode()), dict(response.headers)
        except urllib.error.HTTPError as error:
            if error.code == 429 and attempt < max_retries:
                delay = error.headers.get('Retry-After', '') if error.headers else ''
                try:
                    seconds = max(2, min(60, int(delay)))
                except (TypeError, ValueError):
                    seconds = 5 * (attempt + 1)
                time.sleep(seconds)
                continue
            # Never print the URL query, authorization header, API key or error body.
            raise MonitorProblem('HTTP %d contacting %s' % (error.code, urllib.parse.urlsplit(url).hostname)) from None
        except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError):
            if attempt < max_retries:
                time.sleep(2 * (attempt + 1))
                continue
            raise MonitorProblem('Remote service could not be reached') from None


def arena(path):
    global GW2_KEY
    return request_json(API + path, headers={'Authorization': 'Bearer ' + GW2_KEY})


def db(sql, params=()):
    url = 'https://api.cloudflare.com/client/v4/accounts/%s/d1/database/%s/query' % (
        os.environ['CF_ACCOUNT_ID'], os.environ['CF_DATABASE_ID'])
    data, _ = request_json(url, headers={
        'Authorization': 'Bearer ' + os.environ['CF_API_TOKEN'],
        'Content-Type': 'application/json'
    }, payload={'sql': sql, 'params': list(params)}, max_retries=1)
    if not data.get('success') or any(not x.get('success', False) for x in data.get('result', [])):
        raise MonitorProblem('Cloudflare private D1 query rejected')
    groups = data.get('result') or []
    return groups[0].get('results', []) if groups else []


def put_many(sql_prefix, records, width, suffix=''):
    if not records:
        return
    for start in range(0, len(records), QUERY_BATCH):
        rows = records[start:start + QUERY_BATCH]
        placeholders = '(' + ','.join('?' for _ in range(width)) + ')'
        sql = sql_prefix + ','.join([placeholders] * len(rows)) + (' ' + suffix if suffix else '')
        flat = [v for row in rows for v in row]
        db(sql, flat)


def coins(x):
    x = int(x)
    if x < 0 or x >= 2**48:
        raise MonitorProblem('Unreasonable Trading Post price or quantity')
    return x


def timestamp(x):
    if not isinstance(x, str):
        raise MonitorProblem('ArenaNet date absent')
    dt = datetime.datetime.fromisoformat(x.replace('Z', '+00:00'))
    return int(dt.timestamp() * 1000)


def history_side(side, known):
    rows = []
    max_pages = 2 if not known else MAX_HISTORY_PAGES
    for page in range(max_pages):
        items, headers = arena('/commerce/transactions/history/%s?page=%d&page_size=%d' % (side, page, PAGE_SIZE))
        if not isinstance(items, list):
            raise MonitorProblem('ArenaNet returned invalid transaction history')
        rows.extend(items)
        if len(items) < PAGE_SIZE:
            break
        # History is newest-first; overlap one already-recorded page to catch
        # amended quantities, then stop. We cannot see beyond the API's
        # 90-day availability; the app retains everything previously saved.
        if page >= 1 and any(int(x.get('id', 0)) in known for x in items):
            break
    return rows


def current_side(side):
    rows = []
    for page in range(MAX_CURRENT_PAGES):
        items, headers = arena('/commerce/transactions/current/%s?page=%d&page_size=%d' % (side, page, PAGE_SIZE))
        if not isinstance(items, list):
            raise MonitorProblem('ArenaNet returned invalid active order book')
        rows.extend(items)
        pages = headers.get('X-Page-Total') or headers.get('x-page-total')
        if (pages and page + 1 >= int(pages)) or len(items) < PAGE_SIZE:
            return rows
    raise MonitorProblem('Active order book exceeds the complete-pagination safety limit')


def bootstrap(account, digest):
    rows = db('SELECT account_id,enabled FROM gp_monitor_credentials WHERE token_digest=? LIMIT 1', [digest])
    if rows and not rows[0]['enabled']:
        print('Background monitoring was disabled by the user; no GW2 API calls made.')
        return False
    if rows and rows[0]['account_id'] != account['id']:
        raise MonitorProblem('Stored monitor account identity does not match the configured key')
    # Explicitly placing a key into GW2_PRIVATE_MONITOR_KEY is the user's
    # consent to a PRIVATE GitHub Actions runner, rather than Cloudflare
    # fetching ArenaNet from its shared rate-limited IP.
    db('''INSERT INTO gp_monitor_credentials
      (account_id,account_name,token_digest,iv,encrypted,enabled,created_at)
      VALUES(?,?,?,NULL,NULL,1,?)
      ON CONFLICT(account_id) DO UPDATE SET
      account_name=excluded.account_name,token_digest=excluded.token_digest,
      iv=NULL,encrypted=NULL,enabled=1''',
      [account['id'], account['name'], digest, NOW()])
    return True


def validate_trade(x):
    if not isinstance(x, dict):
        raise MonitorProblem('Malformed GW2 transaction')
    try:
        trade_id, item, qty, price = [coins(x[k]) for k in ('id', 'item_id', 'quantity', 'price')]
        created, purchased = timestamp(x['created']), timestamp(x['purchased'])
    except (KeyError, TypeError, ValueError, OverflowError) as exc:
        raise MonitorProblem('Malformed GW2 transaction fields') from None
    if min(trade_id, item, qty, price) <= 0 or purchased <= 0:
        raise MonitorProblem('ArenaNet transaction contains invalid fields')
    return trade_id, item, qty, price, created, purchased


def validate_current(x):
    # ArenaNet's current/* endpoints have created, but NO purchased timestamp.
    # Recording a guessed purchased time would corrupt historical fill learning.
    if not isinstance(x, dict):
        raise MonitorProblem('Malformed GW2 active order')
    try:
        order_id, item, qty, price = [coins(x[k]) for k in ('id', 'item_id', 'quantity', 'price')]
        created = timestamp(x['created'])
    except (KeyError, TypeError, ValueError, OverflowError):
        raise MonitorProblem('Malformed GW2 active order fields') from None
    if min(order_id, item, qty, price) <= 0:
        raise MonitorProblem('ArenaNet active order contains invalid fields')
    return order_id, item, qty, price, created


def poll(account):
    account_id = account['id']
    previous = db('''SELECT side,order_id,item_id,price,remaining,first_seen_at FROM gp_monitor_orders
                    WHERE account_id=? AND closed_at IS NULL''', [account_id])
    open_map = {(x['side'], int(x['order_id'])): x for x in previous}
    # Fetch both books fully BEFORE considering a missing order closed.
    current = {side: current_side(side) for side in ('buys', 'sells')}
    recorded = {}
    for side in ('buys', 'sells'):
        past = db('''SELECT trade_id,quantity FROM gp_monitor_trades
                     WHERE account_id=? AND side=? ORDER BY purchased_at DESC LIMIT 4000''',
                  [account_id, side])
        recorded[side] = {int(x['trade_id']): int(x['quantity']) for x in past}
    recent = {side: history_side(side, recorded[side]) for side in ('buys', 'sells')}
    stamp = NOW()
    trade_rows, events, orders, closed = [], [], [], []
    counts = {'newTrades': 0, 'partialUnits': 0, 'unknownClosures': 0}
    for side in ('buys', 'sells'):
        for entry in recent[side]:
            trade_id, item, qty, price, created, purchased = validate_trade(entry)
            old = recorded[side].get(trade_id, 0)
            if qty <= old:
                continue
            trade_rows.append((account_id, side, trade_id, item, price, qty, created, purchased, stamp))
            events.append((account_id, 'trade:%s:%d:%d' % (side, trade_id, qty),
                           'trade', side, trade_id, item, price, qty - old, stamp, None, None))
            counts['newTrades'] += 1
        observed = set()
        for entry in current[side]:
            order_id, item, qty, price, created = validate_current(entry)
            observed.add((side, order_id))
            old = open_map.get((side, order_id))
            if old:
                old_qty = int(old['remaining'])
                if int(old['item_id']) != item or int(old['price']) != price or qty > old_qty:
                    events.append((account_id, 'changed:%s:%d:%d' % (side, order_id, stamp),
                                  'changed_unknown', side, order_id, item, price, 0, stamp, old_qty, qty))
                elif qty < old_qty:
                    events.append((account_id, 'partial:%s:%d:%d' % (side, order_id, stamp),
                                  'partial', side, order_id, item, price, old_qty - qty, stamp, old_qty, qty))
                    counts['partialUnits'] += old_qty - qty
            orders.append((account_id, side, order_id, item, price, qty,
                           int(old['first_seen_at']) if old and 'first_seen_at' in old else stamp, stamp))
        for (old_side, order_id), old in open_map.items():
            if old_side != side or (old_side, order_id) in observed:
                continue
            events.append((account_id, 'disappeared:%s:%d:%d' % (side, order_id, stamp),
                          'disappeared_unknown', side, order_id, old['item_id'], old['price'],
                          0, stamp, old['remaining'], 0))
            closed.append((stamp, account_id, side, order_id))
            counts['unknownClosures'] += 1

    put_many('''INSERT INTO gp_monitor_trades
      (account_id,side,trade_id,item_id,price,quantity,created_at,purchased_at,first_observed_at) VALUES ''',
      trade_rows, 9,
      'ON CONFLICT(account_id,side,trade_id) DO UPDATE SET quantity=MAX(quantity,excluded.quantity)')
    put_many('''INSERT OR IGNORE INTO gp_monitor_events
      (account_id,event_key,kind,side,order_id,item_id,price,quantity,observed_at,previous_remaining,new_remaining) VALUES ''',
      events, 11)
    put_many('''INSERT INTO gp_monitor_orders
      (account_id,side,order_id,item_id,price,remaining,first_seen_at,last_changed_at,closed_at) VALUES ''',
      [x + (None,) for x in orders], 9,
      'ON CONFLICT(account_id,side,order_id) DO UPDATE SET item_id=excluded.item_id,price=excluded.price,remaining=excluded.remaining,last_changed_at=excluded.last_changed_at,closed_at=NULL')
    for start in range(0, len(closed), QUERY_BATCH):
        for item in closed[start:start+QUERY_BATCH]:
            db('''UPDATE gp_monitor_orders SET closed_at=?
                  WHERE account_id=? AND side=? AND order_id=? AND closed_at IS NULL''', list(item))
    db('INSERT OR IGNORE INTO gp_monitor_polls(account_id,polled_at,buy_count,sell_count) VALUES(?,?,?,?)',
       [account_id,stamp,len(current['buys']),len(current['sells'])])
    db('''UPDATE gp_monitor_credentials SET last_polled_at=?,last_success_at=?,last_error=NULL,consecutive_failures=0
          WHERE account_id=? AND enabled=1''', [stamp,stamp,account_id])
    counts['observedNights'] = finalize_nights(account_id,stamp)
    return counts, len(current['buys']),len(current['sells'])


def finalize_nights(account_id, stamp):
    """Zero-inclusive observations only for continuously observed order nights.

    Sampling happens every ~30 minutes. If observations are missing or too far
    apart, we censor that night instead of mistaking absence for a zero fill.
    """
    utc = datetime.datetime.fromtimestamp(stamp/1000, tz=datetime.timezone.utc)
    today = utc.replace(hour=0, minute=0, second=0, microsecond=0)
    end = int((today + datetime.timedelta(hours=10)).timestamp() * 1000)
    start = int((today - datetime.timedelta(hours=6)).timestamp() * 1000)
    if stamp < end + 20*60000:
        return 0
    label = (today - datetime.timedelta(days=1)).strftime('%Y-%m-%d')
    polls = db('''SELECT polled_at FROM gp_monitor_polls WHERE account_id=?
                  AND polled_at BETWEEN ? AND ? ORDER BY polled_at''',
               [account_id,start,end])
    times = [int(x['polled_at']) for x in polls]
    if (len(times)<28 or times[0]>start+42*60000 or times[-1]<end-42*60000
            or any(b-a>42*60000 for a,b in zip(times,times[1:]))):
        return 0
    orders = db('''SELECT side,order_id,item_id FROM gp_monitor_orders
                   WHERE account_id=? AND first_seen_at<=?
                   AND (closed_at IS NULL OR closed_at>=?)''',[account_id,start,end])
    exposure = db('''SELECT side,order_id,
                    SUM(CASE WHEN kind='partial' THEN quantity ELSE 0 END) AS filled,
                    MAX(CASE WHEN kind IN ('changed_unknown','disappeared_unknown')
                             THEN 1 ELSE 0 END) AS invalid
                    FROM gp_monitor_events
                    WHERE account_id=? AND observed_at BETWEEN ? AND ?
                    GROUP BY side,order_id''',[account_id,start,end])
    by_order = {(x['side'],int(x['order_id'])):x for x in exposure}
    rows=[]
    for order in orders:
        details=by_order.get((order['side'],int(order['order_id'])),{})
        if details.get('invalid'):
            continue
        rows.append((account_id,label,order['side'],int(order['order_id']),
                     int(order['item_id']),int(details.get('filled') or 0),
                     len(times),start,end))
    put_many('''INSERT OR IGNORE INTO gp_monitor_nights
       (account_id,night,side,order_id,item_id,filled,observed_polls,window_start,window_end) VALUES ''',
       rows,9)
    return len(rows)


def run():
    global GW2_KEY
    GW2_KEY = os.environ.get('GW2_PRIVATE_MONITOR_KEY', '').strip()
    if not GW2_KEY:
        print('No private GW2 monitor key configured. No account connection attempted.')
        return
    for name in ('CF_ACCOUNT_ID', 'CF_DATABASE_ID', 'CF_API_TOKEN'):
        if not os.environ.get(name):
            raise MonitorProblem('Required private D1 permission not configured')
    digest = hashlib.sha256(('golden-peanut-monitor:v1:' + GW2_KEY).encode()).hexdigest()
    # Check opt-out tombstone before contacting ArenaNet, preserving user control.
    rows = db('SELECT enabled FROM gp_monitor_credentials WHERE token_digest=?', [digest])
    if rows and not rows[0]['enabled']:
        print('Private monitoring disabled in the app. No GW2 API requests made.')
        return
    try:
        token, _ = arena('/tokeninfo')
        permissions = token.get('permissions', [])
        if 'account' not in permissions or 'tradingpost' not in permissions:
            raise MonitorProblem('GW2 API key needs account and tradingpost permissions')
        account, _ = arena('/account')
        if not isinstance(account, dict) or not isinstance(account.get('id'), str):
            raise MonitorProblem('ArenaNet did not return a valid account identity')
        if not bootstrap(account, digest):
            return
        metrics, buys, sells = poll(account)
        print('Private monitoring successful: %d current buy orders, %d current sell orders, %d updated trade records, %d partially filled units, %d unclassified disappearing orders.' %
              (buys, sells, metrics['newTrades'], metrics['partialUnits'], metrics['unknownClosures']))
    except Exception as e:
        # No API keys, account names, API response bodies, raw SQL parameters
        # or Python tracebacks enter GitHub Actions logs.
        safe = str(e)[:180] if isinstance(e,MonitorProblem) else 'unexpected collector processing error'
        print('Monitor check inconclusive:', safe)
        try:
            db('''UPDATE gp_monitor_credentials SET last_polled_at=?,last_error=?,consecutive_failures=consecutive_failures+1
                  WHERE token_digest=? AND enabled=1''', [NOW(),safe,digest])
        except MonitorProblem:
            print('Failed to persist monitor error safely; completed account data remains unchanged.')


if __name__ == '__main__':
    run()
