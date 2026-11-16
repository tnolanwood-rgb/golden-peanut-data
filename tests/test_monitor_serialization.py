"""Exercise BOTH production writers' generated SQL against actual SQLite.
No private service, production table, API credential or database is accessed.
"""
import importlib.util,json,pathlib,sqlite3,subprocess,tempfile,unittest
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('collector_guard',ROOT/'services/account-monitor/github-collector.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
SCHEMA=(ROOT/'services/account-monitor/schema.sql').read_text()
TRADE='INSERT INTO gp_monitor_trades(account_id,side,trade_id,item_id,price,quantity,created_at,purchased_at,first_observed_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(account_id,side,trade_id) DO UPDATE SET quantity=MAX(quantity,excluded.quantity)'
ORDER='INSERT INTO gp_monitor_orders(account_id,side,order_id,item_id,price,remaining,first_seen_at,last_changed_at,closed_at) VALUES(?,?,?,?,?,?,?,?,NULL) ON CONFLICT(account_id,side,order_id) DO UPDATE SET remaining=excluded.remaining,last_changed_at=excluded.last_changed_at'
CLOSE='UPDATE gp_monitor_orders SET closed_at=? WHERE account_id=? AND side=? AND order_id=? AND closed_at IS NULL'

def connection(path=':memory:'):
    db=sqlite3.connect(path,timeout=10,isolation_level=None);db.row_factory=sqlite3.Row;return db

def seed(db):
    db.executescript(SCHEMA)
    for account in ['A','B']:
        db.execute("INSERT INTO gp_monitor_credentials(account_id,account_name,token_digest,enabled,created_at) VALUES(?,?,?,1,0)",[account,'Synthetic',account+'-digest'])

class MonitorSerialization(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        script="""const fs=require('fs');(async()=>{const s=fs.readFileSync('services/account-monitor/worker.js','utf8');const m=await import('data:text/javascript;base64,'+Buffer.from(s+';export {fenceSQL,acquireLease};').toString('base64'));const queries=[];const db={prepare(sql){return {bind(...p){this.p=p;return this},async first(){queries.push(sql);return {owner:this.p[1],valid:1}},async run(){return {}}}}};const lease=await m.acquireLease(db,'A','A-digest');await lease.assert();const original=Date.now;Date.now=()=>original()+40000;await lease.renew();Date.now=original;console.log(JSON.stringify({fenced:JSON.parse(process.argv[1]).map(m.fenceSQL),acquire:queries[0],check:queries[1],renew:queries[2]}));})().catch(e=>{console.error(e.message);process.exit(1)})"""
        cls.js=json.loads(subprocess.check_output(['node','-e',script,json.dumps([TRADE,ORDER,CLOSE])],cwd=ROOT,text=True))
        captured=[]
        def capture(sql,args=()):
            captured.append(sql)
            return [{'owner':args[1]}] if 'RETURNING owner' in sql else [{'valid':1}]
        with patch.object(m,'raw_db',side_effect=capture):
            lease=m.acquire_lease('A','A-digest');lease.assert_valid();lease.touched-=40;lease.renew()
        cls.py={'fenced':[m.fence_sql(s) for s in [TRADE,ORDER,CLOSE]],'acquire':captured[0],'check':captured[1],'renew':captured[2]}
    def setUp(self):
        self.db=connection();seed(self.db)
    def tearDown(self):self.db.close()
    def acquire(self,protocol,owner='one',account='A'):
        return self.db.execute(protocol['acquire'],[account,owner,account,account+'-digest']).fetchall()
    def write(self,protocol,kind,args,owner='one'):
        self.db.execute(protocol['fenced'][kind],list(args)+['A',owner,'A-digest'])
    def test_both_writers_share_one_lease_and_expired_owner_cannot_write_renew_or_release_successor(self):
        for first,second in [(self.py,self.js),(self.js,self.py)]:
            with self.subTest(first=first is self.py):
                self.db.execute('DELETE FROM gp_monitor_leases')
                self.assertEqual(len(self.acquire(first)),1);self.assertEqual(len(self.acquire(second,'two')),0)
                self.db.execute('UPDATE gp_monitor_leases SET expires_at=0')
                self.assertEqual(len(self.acquire(second,'two')),1)
                self.assertEqual(self.db.execute(first['renew'],['A','one','A','A-digest']).fetchall(),[])
                self.write(first,0,['A','buys',100,10,50,3,1,1,1])
                self.assertEqual(self.db.execute('SELECT COUNT(*) FROM gp_monitor_trades').fetchone()[0],0)
                self.db.execute('DELETE FROM gp_monitor_leases WHERE account_id=? AND owner=?',['A','one'])
                self.assertEqual(self.db.execute('SELECT owner FROM gp_monitor_leases').fetchone()[0],'two')
    def test_disable_and_reenable_fences_old_poll_even_when_same_key_is_reused(self):
        for protocol in [self.py,self.js]:
            self.db.execute('DELETE FROM gp_monitor_leases');self.acquire(protocol)
            self.db.execute('BEGIN')
            self.db.execute("UPDATE gp_monitor_credentials SET enabled=0 WHERE account_id='A'")
            self.db.execute("DELETE FROM gp_monitor_leases WHERE account_id='A'")
            self.db.execute('COMMIT')
            self.write(protocol,0,['A','buys',1,10,50,3,1,1,1])
            self.assertEqual(self.db.execute('SELECT COUNT(*) FROM gp_monitor_trades').fetchone()[0],0)
            self.db.execute("UPDATE gp_monitor_credentials SET enabled=1 WHERE account_id='A'")
            self.acquire(protocol,'new')
            self.write(protocol,0,['A','buys',1,10,50,3,1,1,1])
            self.assertEqual(self.db.execute('SELECT COUNT(*) FROM gp_monitor_trades').fetchone()[0],0)
    def test_guard_rejects_cross_account_inserts_and_updates(self):
        for protocol in [self.py,self.js]:
            self.db.execute('DELETE FROM gp_monitor_leases');self.acquire(protocol)
            self.write(protocol,1,['B','buys',7,10,50,9,1,1])
            self.assertEqual(self.db.execute('SELECT COUNT(*) FROM gp_monitor_orders').fetchone()[0],0)
    def test_atomic_events_survive_replay_partial_fills_and_invalid_transactions(self):
        for protocol in [self.py,self.js]:
            self.db.execute('DELETE FROM gp_monitor_leases');self.acquire(protocol)
            self.db.execute('DELETE FROM gp_monitor_events');self.db.execute('DELETE FROM gp_monitor_trades');self.db.execute('DELETE FROM gp_monitor_orders')
            for qty in [3,3,5,5]:self.write(protocol,0,['A','buys',1,10,50,qty,1,1,1])
            self.assertEqual([r[0] for r in self.db.execute("SELECT quantity FROM gp_monitor_events WHERE kind='trade' ORDER BY id")],[3,2])
            for qty in [10,8,8,6]:self.write(protocol,1,['A','buys',2,10,50,qty,1,2])
            self.assertEqual([r[0] for r in self.db.execute("SELECT quantity FROM gp_monitor_events WHERE kind='partial' ORDER BY id")],[2,2])
            self.write(protocol,2,[3,'A','buys',2]);self.write(protocol,2,[3,'A','buys',2])
            self.assertEqual(self.db.execute("SELECT COUNT(*) FROM gp_monitor_events WHERE kind='disappeared_unknown'").fetchone()[0],1)
            before=self.db.total_changes
            with self.assertRaises(sqlite3.IntegrityError):self.write(protocol,0,['A','invalid',9,10,50,1,1,1,1])
            self.assertEqual(self.db.total_changes,before)
    def test_additive_schema_is_idempotent_and_does_not_reinterpret_original_history(self):
        db=connection();db.executescript(SCHEMA.split('-- Additive protocol')[0]);db.execute("INSERT INTO gp_monitor_trades VALUES('legacy','buys',1,10,20,30,1,2,3)")
        original=tuple(db.execute('SELECT * FROM gp_monitor_trades').fetchone());db.executescript(SCHEMA);db.executescript(SCHEMA)
        self.assertEqual(tuple(db.execute('SELECT * FROM gp_monitor_trades').fetchone()),original)
        self.assertEqual(db.execute('SELECT COUNT(*) FROM gp_monitor_events').fetchone()[0],0);db.close()
    def test_real_concurrent_connections_cannot_both_acquire_account(self):
        with tempfile.TemporaryDirectory() as directory:
            path=str(pathlib.Path(directory)/'synthetic.sqlite');db=connection(path);seed(db);db.close()
            def attempt(i):
                db=connection(path)
                try:return len(db.execute((self.py if i%2 else self.js)['acquire'],['A',str(i),'A','A-digest']).fetchall())
                finally:db.close()
            with ThreadPoolExecutor(max_workers=8) as pool:self.assertEqual(sum(pool.map(attempt,range(20))),1)

    def test_enrollment_started_before_disable_cannot_restore_consent(self):
        epoch=self.db.execute('SELECT generation FROM gp_monitor_consent_epoch WHERE id=1').fetchone()[0]
        self.db.execute("UPDATE gp_monitor_credentials SET enabled=0 WHERE account_id='A'")
        self.db.execute('UPDATE gp_monitor_consent_epoch SET generation=generation+1 WHERE id=1')
        sql="INSERT INTO gp_monitor_credentials(account_id,account_name,token_digest,enabled,created_at) SELECT 'A','Synthetic','A-digest',1,0 WHERE (SELECT generation FROM gp_monitor_consent_epoch WHERE id=1)=? ON CONFLICT(account_id) DO UPDATE SET enabled=1"
        self.db.execute(sql,[epoch])
        self.assertEqual(self.db.execute("SELECT enabled FROM gp_monitor_credentials WHERE account_id='A'").fetchone()[0],0)
    def test_github_bootstrap_cannot_reenable_disabled_or_replace_another_key(self):
        def query(sql,args=()):return [dict(row) for row in self.db.execute(sql,args).fetchall()]
        with patch.object(m,'db',side_effect=query):
            self.assertFalse(m.bootstrap({'id':'A','name':'Synthetic'},'different-digest'))
            self.assertEqual(self.db.execute("SELECT token_digest FROM gp_monitor_credentials WHERE account_id='A'").fetchone()[0],'A-digest')
            self.db.execute("UPDATE gp_monitor_credentials SET enabled=0 WHERE account_id='A'")
            self.assertFalse(m.bootstrap({'id':'A','name':'Synthetic'},'A-digest'))
    def test_fenced_rest_batches_keep_the_binding_limit_and_atomic_events(self):
        self.acquire(self.py)
        sizes=[]
        def query(sql,args=()):
            sizes.append(len(args));return [dict(row) for row in self.db.execute(sql,[str(x) for x in args]).fetchall()]
        lease=m.MonitorLease('A','A-digest','one')
        with patch.object(m,'raw_db',side_effect=query),patch.object(m,'ACTIVE_LEASE',lease):
            m.put_many('INSERT INTO gp_monitor_trades(account_id,side,trade_id,item_id,price,quantity,created_at,purchased_at,first_observed_at) VALUES ',[('A','buys',n,10,50,3,1,1,1) for n in range(1,1301)],9,'ON CONFLICT(account_id,side,trade_id) DO UPDATE SET quantity=MAX(quantity,excluded.quantity)')
        self.assertLessEqual(max(sizes),100)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM gp_monitor_trades').fetchone()[0],1300)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM gp_monitor_events').fetchone()[0],1300)

if __name__=='__main__':unittest.main()
