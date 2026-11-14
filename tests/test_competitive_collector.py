"""Synthetic real-SQL collector integration; never private fixtures or live APIs."""
import importlib.util
import json
import pathlib
import sqlite3
import unittest
from unittest.mock import patch

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('exposure_collector', ROOT/'services/account-monitor/github-collector.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
STAMP = 1794139200000
DAY = 86400000


class CompetitiveCollectorTests(unittest.TestCase):
    def setUp(self):
        self.sql = sqlite3.connect(':memory:')
        self.sql.row_factory = sqlite3.Row
        self.sql.executescript((ROOT/'services/account-monitor/schema.sql').read_text())
        self.calls = []
        def query(sql, params=()):
            self.calls.append((sql, params))
            return [dict(x) for x in self.sql.execute(sql, params).fetchall()]
        self.query = query
        self.patcher = patch.object(m, 'db', side_effect=query)
        self.patcher.start()
        self.addCleanup(self.patcher.stop)
        self.addCleanup(self.sql.close)

    def orders(self, count):
        return [dict(id=i, item_id=1000+i, quantity=50, price=100, created='2026-11-01T00:00:00Z') for i in range(1,count+1)]

    def collect(self, orders, stamp=STAMP, quotes=None):
        if quotes is None:
            quotes = [dict(id=x['item_id'], buys={'unit_price':110}, sells={'unit_price':200}) for x in orders]
        with patch.object(m, 'request_json', return_value=(quotes, {})) as http, patch.object(m, 'NOW', return_value=stamp):
            coverage = m.collect_exposure('account-a', orders, stamp)
        return coverage, http

    def latest(self):
        return json.loads(self.sql.execute('SELECT payload FROM gp_monitor_exposure ORDER BY id DESC LIMIT 1').fetchone()[0])

    def test_bounded_stable_cohort_rotates_and_resumes_from_persisted_cursor(self):
        orders = self.orders(401)
        coverage, http = self.collect(orders)
        first = [x['order'] for x in self.latest()['observations']]
        self.assertEqual(first, list(range(1,201)))
        self.assertFalse(coverage['completeOrders'])
        self.assertEqual(coverage['totalOrders'], 401)
        self.assertEqual(http.call_count, 1)
        self.assertNotIn('headers', http.call_args.kwargs)  # No private credential.
        self.collect(orders, STAMP+1800000)
        self.assertEqual(first, [x['order'] for x in self.latest()['observations']])
        self.collect(orders, STAMP+DAY)
        self.assertEqual([x['order'] for x in self.latest()['observations']], list(range(201,401)))
        self.collect(orders, STAMP+2*DAY)
        self.assertIn(401, [x['order'] for x in self.latest()['observations']])
        self.assertEqual(sum('INSERT OR IGNORE INTO gp_monitor_exposure' in q for q,_ in self.calls), 4)

    def test_partial_fill_and_disappearance_are_observations_never_trades(self):
        orders = self.orders(2)
        self.collect(orders)
        orders[0]['quantity'] = 48
        self.collect(orders[:1], STAMP+1800000)
        rows = self.latest()['observations']
        self.assertEqual(rows[0]['remaining'], 48)
        self.assertEqual(rows[0]['bestBuy'], 110)
        self.assertIsNone(rows[0]['original'])
        self.assertTrue(rows[1]['absent'])
        self.assertIsNone(rows[1]['quoteAt'])
        self.assertEqual(self.sql.execute('SELECT count(*) FROM gp_monitor_trades').fetchone()[0], 0)

    def test_duplicate_poll_is_idempotent_and_account_scoped(self):
        self.collect(self.orders(1))
        self.collect(self.orders(1))
        with patch.object(m, 'request_json', return_value=([], {})):
            m.collect_exposure('account-b', [], STAMP)
        self.assertEqual(self.sql.execute('SELECT count(*) FROM gp_monitor_exposure').fetchone()[0], 2)

    def test_unavailable_and_missing_quotes_are_unknown_not_zero_capacity(self):
        self.collect(self.orders(2), quotes=[])
        self.assertEqual(self.latest()['coverage']['quotes'], 'partial')
        with patch.object(m, 'request_json', side_effect=m.MonitorProblem('HTTP 429')):
            m.collect_exposure('account-a', self.orders(1), STAMP+1800000)
        self.assertEqual(self.latest()['coverage']['quotes'], 'unavailable')
        self.assertIsNone(self.latest()['observations'][0]['bestBuy'])

    def test_cache_age_retained_and_database_failure_not_reported_success(self):
        quotes = [dict(id=1001, buys={'unit_price':110}, sells={'unit_price':200})]
        with patch.object(m, 'request_json', return_value=(quotes, {'Age':'3600'})), patch.object(m, 'NOW', return_value=STAMP):
            m.collect_exposure('account-a', self.orders(1), STAMP)
        self.assertEqual(self.latest()['observations'][0]['quoteAt'], STAMP-3600000)
        def broken(sql, params=()):
            if sql.startswith('INSERT'): raise m.MonitorProblem('D1 rejected')
            return self.query(sql, params)
        with patch.object(m, 'db', side_effect=broken), patch.object(m, 'request_json', return_value=(quotes, {})):
            with self.assertRaises(m.MonitorProblem): m.collect_exposure('account-a', self.orders(1), STAMP+1)

    def test_missing_migration_does_not_claim_exposure_or_contact_prices(self):
        self.sql.execute('DROP TABLE gp_monitor_exposure')
        coverage, http = self.collect(self.orders(1))
        self.assertFalse(coverage['supported'])
        self.assertEqual(coverage['reason'], 'schema-migration-required')
        http.assert_not_called()

    def test_public_503_retry_is_bounded(self):
        import urllib.error
        error = urllib.error.HTTPError('https://api.guildwars2.com/v2/commerce/prices', 503, 'unavailable', {}, None)
        with patch.object(m.urllib.request, 'urlopen', side_effect=error) as http, patch.object(m.time, 'sleep'):
            with self.assertRaises(m.MonitorProblem):
                m.request_json('https://api.guildwars2.com/v2/commerce/prices', retry_server_errors=True)
        self.assertEqual(http.call_count, 3)
