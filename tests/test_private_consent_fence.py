"""SQLite proof of private monitor opt-out fencing, using the exact D1 schema.

No external database, ArenaNet key or private account record is used.
"""
import pathlib
import sqlite3
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SCHEMA = ROOT / 'services/account-monitor/schema.sql'
FENCES = ROOT / 'services/account-monitor/consent-fence.sql'

ROWS = {
 'gp_monitor_trades': (
  'INSERT INTO gp_monitor_trades(account_id,side,trade_id,item_id,price,quantity,created_at,purchased_at,first_observed_at) '
  'VALUES(?,\'buys\',?,100,200,1,1,1,1)'),
 'gp_monitor_orders': (
  'INSERT INTO gp_monitor_orders(account_id,side,order_id,item_id,price,remaining,first_seen_at,last_changed_at) '
  'VALUES(?,\'buys\',?,100,200,1,1,1)'),
 'gp_monitor_events': (
  'INSERT INTO gp_monitor_events(account_id,event_key,kind,side,order_id,item_id,price,quantity,observed_at) '
  'VALUES(?, ?,\'trade\',\'buys\',1,100,200,1,1)'),
 'gp_monitor_polls': (
  'INSERT INTO gp_monitor_polls(account_id,polled_at,buy_count,sell_count) '
  'VALUES(?,?,1,1)'),
 'gp_monitor_nights': (
  'INSERT INTO gp_monitor_nights(account_id,night,side,order_id,item_id,filled,observed_polls,window_start,window_end) '
  'VALUES(?, ?,\'buys\',1,100,0,30,1,2)'),
}

class ConsentFenceTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.executescript(SCHEMA.read_text())
        self.db.executescript(FENCES.read_text())
        self.db.execute(
          'INSERT INTO gp_monitor_credentials '
          '(account_id,account_name,token_digest,enabled,created_at) VALUES(?,?,?,?,?)',
          ('fixture-account','Fixture.1234','fixture-digest',1,1)
        )

    def tearDown(self):
        self.db.close()

    @staticmethod
    def params(table, index):
        if table == 'gp_monitor_events':
            return ('fixture-account', 'event-' + str(index))
        if table == 'gp_monitor_nights':
            return ('fixture-account', '2026-11-' + str(index).zfill(2))
        return ('fixture-account', index)

    def test_all_private_tables_reject_inflight_writes_after_disable(self):
        for table, sql in ROWS.items():
            with self.subTest(table=table):
                self.db.execute(sql, self.params(table, 1))
        self.db.execute("UPDATE gp_monitor_credentials SET enabled=0 WHERE account_id='fixture-account'")
        for table, sql in ROWS.items():
            with self.subTest(table=table):
                with self.assertRaisesRegex(sqlite3.IntegrityError, 'private_monitor_disabled'):
                    self.db.execute(sql, self.params(table, 2))
                with self.assertRaisesRegex(sqlite3.IntegrityError, 'private_monitor_disabled'):
                    self.db.execute(f'UPDATE {table} SET account_id=account_id WHERE account_id=?',
                                    ('fixture-account',))
                # Disabling monitoring must retain the ability to erase all rows.
                self.db.execute(f'DELETE FROM {table} WHERE account_id=?', ('fixture-account',))
                count = self.db.execute(f'SELECT COUNT(*) FROM {table}').fetchone()[0]
                self.assertEqual(count, 0)

    def test_unknown_account_cannot_insert_monitor_rows(self):
        for table, sql in ROWS.items():
            with self.subTest(table=table):
                args = ('unregistered-account',) + self.params(table, 2)[1:]
                with self.assertRaisesRegex(sqlite3.IntegrityError, 'private_monitor_disabled'):
                    self.db.execute(sql, args)

    def test_explicit_reconsent_and_existing_active_writes_work(self):
        for table, sql in ROWS.items():
            with self.subTest(table=table):
                self.db.execute(sql, self.params(table, 1))
                self.db.execute(f'UPDATE {table} SET account_id=account_id WHERE account_id=?',
                                ('fixture-account',))
        self.db.execute("UPDATE gp_monitor_credentials SET enabled=0 WHERE account_id='fixture-account'")
        self.db.execute("UPDATE gp_monitor_credentials SET enabled=1 WHERE account_id='fixture-account'")
        for table, sql in ROWS.items():
            with self.subTest(table=table):
                self.db.execute(sql, self.params(table, 2))

    def test_release_workflow_parses_multi_statement_triggers_safely(self):
        source = (ROOT / '.github/workflows/account-monitor-deploy.yml').read_text()
        self.assertIn('sqlite3.complete_statement(pending)', source)
        self.assertIn('services/account-monitor/consent-fence.sql', source)
        self.assertNotIn("sql.split(';')", source)


if __name__ == '__main__':
    unittest.main()
