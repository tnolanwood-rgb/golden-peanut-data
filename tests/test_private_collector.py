import contextlib
import datetime
import importlib.util
import io
import os
import pathlib
import subprocess
import sys
import textwrap
import unittest
from unittest import mock

SOURCE = pathlib.Path(__file__).resolve().parents[1] / "services/account-monitor/github-collector.py"
spec = importlib.util.spec_from_file_location("private_monitor", SOURCE)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class PrivateMonitorTests(unittest.TestCase):
    def run_process_fixture(self, scenario):
        # Execute the actual __main__ entry point with an in-process fake HTTP
        # transport. No account key, database or public API is contacted.
        code = textwrap.dedent("""
            import io, json, runpy, sys, urllib.error, urllib.request
            from unittest.mock import patch
            from urllib.parse import urlsplit
            scenario = sys.argv[2]
            class Response(io.BytesIO):
                headers = {}
            def response(value):
                return Response(json.dumps(value).encode())
            def transport(request, timeout):
                url = urlsplit(request.full_url)
                if url.hostname == 'api.cloudflare.com':
                    sql = json.loads(request.data)['sql']
                    if scenario == 'd1_preflight_failure':
                        return response({'success': False, 'result': []})
                    if scenario == 'd1_write_failure' and sql.startswith('INSERT OR IGNORE INTO gp_monitor_polls'):
                        return response({'success': False, 'result': []})
                    if scenario == 'error_persistence_failure' and 'last_error=?' in sql:
                        raise RuntimeError('PRIVATE_SENTINEL synthetic-personal-key SQL values must never log')
                    rows = [{'enabled': 0}] if scenario == 'disabled' and sql.startswith('SELECT enabled') else []
                    return response({'success': True, 'result': [{'success': True, 'results': rows}]})
                if url.hostname == 'api.guildwars2.com':
                    if scenario in ('no_key', 'disabled'):
                        raise AssertionError('Private API must not be contacted for an intentional skip')
                    if scenario in ('upstream_failure', 'error_persistence_failure'):
                        raise urllib.error.HTTPError(request.full_url, 503, 'unavailable', {}, None)
                    if url.path == '/v2/tokeninfo':
                        return response({'permissions': ['account', 'tradingpost']})
                    if url.path == '/v2/account':
                        return response({'id': 'fixture-account-id', 'name': 'PRIVATE_SENTINEL'})
                    return response([])
                raise AssertionError('Unexpected network destination')
            with patch.object(urllib.request, 'urlopen', side_effect=transport):
                runpy.run_path(sys.argv[1], run_name='__main__')
        """)
        env = dict(os.environ, GW2_PRIVATE_MONITOR_KEY='synthetic-personal-key',
                   CF_API_TOKEN='synthetic-cloudflare-key', CF_ACCOUNT_ID='fixture', CF_DATABASE_ID='fixture')
        if scenario == 'no_key':
            env['GW2_PRIVATE_MONITOR_KEY'] = ''
        if scenario == 'missing_configuration':
            env.pop('CF_DATABASE_ID', None)
        result = subprocess.run([sys.executable, '-c', code, str(SOURCE), scenario],
                                capture_output=True, text=True, timeout=15, env=env)
        combined = result.stdout + result.stderr
        for private in ('synthetic-personal-key', 'synthetic-cloudflare-key',
                        'PRIVATE_SENTINEL', 'Traceback', 'token_digest'):
            self.assertNotIn(private, combined)
        return result

    def test_upstream_failure_is_nonzero_process_exit(self):
        result = self.run_process_fixture('upstream_failure')
        self.assertEqual(result.returncode, 1)
        self.assertIn('Monitor check inconclusive: HTTP 503', result.stdout)
        self.assertNotIn('Private monitoring successful', result.stdout)

    def test_d1_preflight_failure_is_nonzero_without_traceback(self):
        result = self.run_process_fixture('d1_preflight_failure')
        self.assertEqual(result.returncode, 1)
        self.assertIn('Cloudflare private D1 query rejected', result.stdout)

    def test_d1_write_failure_is_nonzero_process_exit(self):
        result = self.run_process_fixture('d1_write_failure')
        self.assertEqual(result.returncode, 1)
        self.assertNotIn('Private monitoring successful', result.stdout)

    def test_failure_recording_error_still_exits_nonzero_without_secrets(self):
        result = self.run_process_fixture('error_persistence_failure')
        self.assertEqual(result.returncode, 1)
        self.assertIn('Failed to persist monitor error safely', result.stdout)

    def test_missing_configuration_is_nonzero_without_traceback(self):
        result = self.run_process_fixture('missing_configuration')
        self.assertEqual(result.returncode, 1)
        self.assertIn('Required private D1 permission not configured', result.stdout)

    def test_successful_process_exit_requires_completed_collection(self):
        result = self.run_process_fixture('success')
        self.assertEqual(result.returncode, 0)
        self.assertIn('Private monitoring successful', result.stdout)
        self.assertNotIn('inconclusive', result.stdout)

    def test_intentional_no_key_and_disabled_skips_exit_successfully(self):
        for scenario in ('no_key', 'disabled'):
            with self.subTest(scenario=scenario):
                result = self.run_process_fixture(scenario)
                self.assertEqual(result.returncode, 0)
                self.assertNotIn('Private monitoring successful', result.stdout)
                self.assertNotIn('inconclusive', result.stdout)

    def test_current_order_matches_real_gw2_schema_without_purchased(self):
        row = {"id": 2800000000, "item_id": 19709, "quantity": 50, "price": 3000,
               "created": "2026-11-06T19:30:00+00:00"}
        order_id, item, qty, price, created = m.validate_current(row)
        self.assertEqual((order_id, item, qty, price), (2800000000, 19709, 50, 3000))
        self.assertGreater(created, 0)
        with self.assertRaises(m.MonitorProblem):
            m.validate_trade(row)  # historical completed trades NEED purchased

    def test_completed_trade_keeps_real_arenanet_purchased_time(self):
        row = {"id": 2800000010, "item_id": 19709, "quantity": 18, "price": 3333,
               "created": "2026-11-06T19:30:00+00:00",
               "purchased": "2026-11-06T19:53:00+00:00"}
        order_id, item, qty, price, created, purchased = m.validate_trade(row)
        self.assertEqual(qty, 18)
        self.assertEqual(purchased-created, 23 * 60000)

    def test_never_makes_account_api_calls_before_user_adds_secret(self):
        with mock.patch.dict(os.environ, {"GW2_PRIVATE_MONITOR_KEY": ""}, clear=True):
            with mock.patch.object(m, "arena", side_effect=AssertionError("No API call allowed")):
                out = io.StringIO()
                with contextlib.redirect_stdout(out):
                    m.run()
                self.assertIn("No private GW2 monitor key", out.getvalue())

    def test_user_stop_tombstone_prevents_work_even_if_secret_still_exists(self):
        secret = "fake-personal-token-for-test-only"
        with mock.patch.dict(os.environ, {"GW2_PRIVATE_MONITOR_KEY": secret,
                                          "CF_API_TOKEN": "fake", "CF_ACCOUNT_ID": "abc",
                                          "CF_DATABASE_ID": "def"}, clear=True):
            def query(sql, params=()):
                self.assertIn("SELECT enabled", sql)
                return [{"enabled": 0}]
            with mock.patch.object(m, "db", side_effect=query):
                with mock.patch.object(m, "arena", side_effect=AssertionError("Opted-out account was contacted")):
                    out = io.StringIO()
                    with contextlib.redirect_stdout(out):
                        m.run()
                    self.assertIn("disabled", out.getvalue())

    def test_cloudflare_rest_query_binds_only_strings(self):
        # Cloudflare's REST API rejects JSON number params with HTTP 400.
        with mock.patch.dict(os.environ, {"CF_API_TOKEN": "fake",
                                          "CF_ACCOUNT_ID": "fake-account",
                                          "CF_DATABASE_ID": "fake-database"}):
            def fake_http(url, *, headers, payload, max_retries):
                self.assertIn("/query", url)
                self.assertEqual(payload["params"], ["123", "456"])
                self.assertTrue(all(isinstance(x, str) for x in payload["params"]))
                return {"success": True, "result": [{"success": True, "results": []}]}, {}
            with mock.patch.object(m, "request_json", side_effect=fake_http):
                self.assertEqual(m.db("SELECT ? AS one, ? AS two", [123, 456]), [])

    def test_null_fields_use_sql_literal_not_rejected_rest_param(self):
        calls = []
        def fake_db(sql, params=()):
            calls.append((sql, params))
            return []
        with mock.patch.object(m, "db", side_effect=fake_db):
            m.put_many("INSERT INTO fake (a,b,c) VALUES ",
                       [("one", 10, None), ("two", None, 20)], 3)
        self.assertEqual(len(calls), 1)
        sql, values = calls[0]
        self.assertIn("(?,?,NULL),(?,NULL,?)", sql)
        self.assertEqual(values, ["one", 10, "two", 20])
        self.assertEqual(sql.count("?"), len(values))

    def test_large_1300_order_batches_fit_d1_parameter_limits(self):
        queries = []
        def query(sql, params=()):
            queries.append((sql, params))
            self.assertLessEqual(len(params), 100)
            return []
        records = [(i, i+1, i+2, i+3, i+4, i+5, i+6, i+7, i+8) for i in range(1300)]
        with mock.patch.object(m, "db", side_effect=query):
            m.put_many("INSERT INTO fake_table VALUES ", records, 9, "ON CONFLICT DO NOTHING")
        self.assertEqual(len(queries), 119)  # ceil(1300 / floor(100/9))
        self.assertEqual(sum(len(params) for _, params in queries), 1300*9)

    def test_d1_event_chunks_never_exceed_100_bindings(self):
        batches = []
        def fake_db(sql, params=()):
            batches.append(len(params))
            self.assertLessEqual(len(params), 100)
            return []
        rows = [(i,)*11 for i in range(48)]
        with mock.patch.object(m, "db", side_effect=fake_db):
            m.put_many("INSERT INTO fake VALUES ", rows, 11)
        self.assertEqual(batches, [99, 99, 99, 99, 99, 33])

    def test_incomplete_active_order_pagination_must_not_count_disappearances(self):
        # Exactly 20 maximum pages all full: fail safely, rather than
        # treating unobserved old buy/sell orders as cancelled or sold.
        batch = [{"id": i+1, "item_id": 19684, "quantity": 1,
                  "price": 200, "created": "2026-11-06T11:00:00Z"}
                 for i in range(200)]
        with mock.patch.object(m, "arena", return_value=(batch, {})) as call:
            with self.assertRaises(m.MonitorProblem):
                m.current_side("sells")
            self.assertEqual(call.call_count, m.MAX_CURRENT_PAGES)

    def test_history_overlap_and_no_unsupported_volume_inference(self):
        page = [{"id": i+1, "item_id": 19684, "quantity": 2,
                 "price": 300, "created": "2026-11-06T11:00:00Z",
                 "purchased": "2026-11-06T11:30:00Z"} for i in range(200)]
        with mock.patch.object(m, "arena", return_value=(page, {})) as call:
            rows = m.history_side("buys", {1: 2})
        self.assertEqual(call.call_count, 2)
        self.assertEqual(len(rows), 400)


    def test_unchanged_open_orders_are_not_rewritten(self):
        order = {"id": 123, "item_id": 19684, "quantity": 20, "price": 125,
                 "created": "2026-11-06T11:00:00Z"}
        previous = {"side": "buys", "order_id": 123, "item_id": 19684,
                    "price": 125, "remaining": 20, "first_seen_at": 123456}
        writes = []
        def fake_db(sql, params=()):
            writes.append((sql, params))
            if sql.lstrip().startswith("SELECT side,order_id,item_id,price,remaining,first_seen_at"):
                return [previous]
            return []
        def fake_current(side):
            return [order] if side == "buys" else []
        with mock.patch.object(m, "db", side_effect=fake_db), \
             mock.patch.object(m, "current_side", side_effect=fake_current), \
             mock.patch.object(m, "history_side", return_value=[]), \
             mock.patch.object(m, "finalize_nights", return_value=0):
            counts, buys, sells = m.poll({"id": "fixture-account"})
        self.assertEqual((buys, sells), (1, 0))
        self.assertEqual(counts["newTrades"], 0)
        self.assertFalse(any("INSERT INTO gp_monitor_orders" in sql for sql, _ in writes))
        self.assertFalse(any("INTO gp_monitor_events" in sql for sql, _ in writes))

    def test_partial_fill_is_still_written_once(self):
        order = {"id": 123, "item_id": 19684, "quantity": 15, "price": 125,
                 "created": "2026-11-06T11:00:00Z"}
        previous = {"side": "buys", "order_id": 123, "item_id": 19684,
                    "price": 125, "remaining": 20, "first_seen_at": 123456}
        writes = []
        def fake_db(sql, params=()):
            writes.append((sql, params))
            if sql.lstrip().startswith("SELECT side,order_id,item_id,price,remaining,first_seen_at"):
                return [previous]
            return []
        with mock.patch.object(m, "db", side_effect=fake_db), \
             mock.patch.object(m, "current_side", side_effect=lambda s: [order] if s == "buys" else []), \
             mock.patch.object(m, "history_side", return_value=[]), \
             mock.patch.object(m, "finalize_nights", return_value=0):
            counts, _, _ = m.poll({"id": "fixture-account"})
        self.assertEqual(counts["partialUnits"], 5)
        self.assertTrue(any("INSERT INTO gp_monitor_orders" in sql for sql, _ in writes))
        self.assertTrue(any("INTO gp_monitor_events" in sql for sql, _ in writes))

    def test_public_cloud_collector_runs_hourly_with_separate_shadow_reports(self):
        text = (SOURCE.parents[2] / ".github/workflows/Golden_Peanut_Background_Collector.yml").read_text()
        self.assertIn('cron: "7 * * * *"', text)
        self.assertNotIn('cron: "7,22,37,52 * * * *"', text)
        self.assertIn('cron: "35 4,16 * * *"', text)

if __name__ == "__main__":
    unittest.main()
