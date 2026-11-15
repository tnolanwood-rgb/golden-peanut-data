import importlib.util
import io
import json
import pathlib
import unittest

SOURCE=pathlib.Path(__file__).resolve().parents[1]/'scripts/audit_live_private_readonly.py'
SPEC=importlib.util.spec_from_file_location('private_readonly_audit',SOURCE)
m=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(m)
ENV={'CF_ACCOUNT_ID':'a'*32,'CF_DATABASE_ID':'b'*32,'CF_API_TOKEN':'SECRET_FIXTURE_ONLY'}

class LivePrivateReadOnlyTests(unittest.TestCase):
    def fixture(self,active=1,fresh=1,warned=0,polls=4):
        seen=[]
        class Response(io.BytesIO):
            pass
        def transport(req,timeout=25):
            self.assertEqual(req.get_method(),'POST')
            self.assertEqual(timeout,25)
            payload=json.loads(req.data)
            self.assertTrue(payload['sql'].lstrip().upper().startswith('SELECT'))
            self.assertEqual(len(payload['params']),1)
            self.assertIsInstance(payload['params'][0],str)
            seen.append(payload['sql'])
            i=len(seen)
            row=(
                {'enabled':active,'recently_successful':fresh,'github_backed':active,'warned':warned}
                if i==1 else
                {'recent_polls':polls,'accounts_observed':min(active,1)} if i==2 else
                {'recent_trades':2} if i==3 else
                {'recent_events':3} if i==4 else
                {'observed_nights':1}
            )
            return Response(json.dumps({'success':True,'result':[{'success':True,'results':[row],
              'meta':{'rows_written':0}}]}).encode())
        return transport,seen
    def test_counts_only_and_no_queries_modify_private_data(self):
        transport,seen=self.fixture()
        result=m.inspect(ENV,transport,now=1794758400000)
        self.assertEqual(result['status'],'RECENT_WRITES_VERIFIED')
        self.assertEqual(len(seen),5)
        self.assertNotIn(ENV['CF_API_TOKEN'],json.dumps(result))
        self.assertNotIn('account_id',json.dumps(result))
        self.assertNotIn('trade_id',json.dumps(result))
    def test_unenrolled_stale_and_warnings_are_not_reported_verified(self):
        for args,expected in [
            ({'active':0,'fresh':0,'polls':0},'BLOCKED_NOT_ENROLLED'),
            ({'active':1,'fresh':0},'STALE'),
            ({'active':1,'fresh':1,'polls':0},'STALE'),
            ({'active':1,'fresh':1,'warned':1},'PARTIAL_COVERAGE')]:
            with self.subTest(expected=expected):
                transport,_=self.fixture(**args)
                self.assertEqual(m.inspect(ENV,transport,now=1794758400000)['status'],expected)
    def test_missing_credentials_fail_without_a_network_request(self):
        with self.assertRaisesRegex(ValueError,'not configured'):
            m.inspect({'CF_ACCOUNT_ID':'','CF_DATABASE_ID':'','CF_API_TOKEN':''},
                      transport=lambda *a,**k: (_ for _ in ()).throw(AssertionError('network forbidden')))

if __name__=='__main__':unittest.main()
