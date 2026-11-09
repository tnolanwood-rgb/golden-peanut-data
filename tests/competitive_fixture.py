"""Build synthetic HTTP/D1 relay fixtures using the actual Python collector."""
import importlib.util
import json
import pathlib
import sqlite3
import time
from unittest.mock import patch

root = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('collector', root/'services/account-monitor/github-collector.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
db = sqlite3.connect(':memory:')
db.row_factory = sqlite3.Row
db.executescript((root/'services/account-monitor/schema.sql').read_text())
def query(sql, params=()):
    return [dict(x) for x in db.execute(sql, params).fetchall()]
now = int(time.time()*1000)
order = dict(id=1, item_id=101, price=100, quantity=50, created='2026-01-01T00:00:00Z')
quotes = [dict(id=101, buys={'unit_price':110}, sells={'unit_price':200})]
with patch.object(m, 'db', side_effect=query), patch.object(m, 'request_json', return_value=(quotes, {})), patch.object(m, 'NOW', return_value=now):
    m.collect_exposure('private-fixture', [order], now-3600000)
    order['quantity'] = 48
    m.collect_exposure('private-fixture', [order], now-1800000)
print(json.dumps({'rows':query('SELECT id,observed_at,payload FROM gp_monitor_exposure'), 'now':now}))
