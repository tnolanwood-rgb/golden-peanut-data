import contextlib
import datetime
import importlib.util
import io
import os
import pathlib
import unittest
from unittest import mock

SOURCE = pathlib.Path(__file__).resolve().parents[1] / "services/account-monitor/github-collector.py"
spec = importlib.util.spec_from_file_location("private_monitor", SOURCE)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class PrivateMonitorTests(unittest.TestCase):
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


if __name__ == "__main__":
    unittest.main()
