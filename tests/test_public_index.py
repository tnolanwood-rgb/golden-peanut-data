import importlib.util
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('public_market_snapshot', ROOT/'scripts/public_market_snapshot.py')
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)

class PublicIndexTests(unittest.TestCase):
    def setUp(self):
        self.rows=[[i,f'Market Item {i}','Weapon','Exotic',100,180,10,10] for i in range(1,1001)]
        self.public={'schema':'golden-peanut-public-v1','generation':'aabb','generated_at':1234567890,
                     'count':len(self.rows),'items':self.rows}
    def test_compact_complete_labels_no_quotes(self):
        result=MODULE.compact_index(self.public)
        self.assertEqual(result['schema'],'golden-peanut-index-v1')
        self.assertEqual(result['generation'],'aabb')
        self.assertEqual(result['count'],1000)
        self.assertEqual(result['items'][0],[1,'Market Item 1','Weapon','Exotic'])
        self.assertNotIn('metadata',result)
        self.assertNotIn('quote_times',result)
        self.assertLess(len(str(result)),len(str(self.public)))
    def test_reject_missing_or_duplicate_items(self):
        broken={**self.public,'items':self.rows[:-1]}
        with self.assertRaisesRegex(RuntimeError,'partial'):
            MODULE.compact_index(broken)
        dup=[row.copy() for row in self.rows]
        dup[-1][0]=1
        with self.assertRaisesRegex(RuntimeError,'repeated'):
            MODULE.compact_index({**self.public,'items':dup})

    def test_shards_recover_complete_public_history_without_changing_totals(self):
        day=21000
        history={'schema':'golden-peanut-daily-v1','generation':'release-123','generated_at':1234567890,
                 'history':{str(i):[[day-1,100,200,20,20],[day,101,202,21,21]]
                            for i in range(1,1001)}}
        shards=MODULE.shard_history(history)
        self.assertEqual(len(shards),32)
        self.assertEqual(sum(len(x['history']) for x in shards.values()),1000)
        for filename,payload in shards.items():
            self.assertEqual(payload['schema'],'golden-peanut-history-shard-v1')
            self.assertEqual(payload['generation'],history['generation'])
            self.assertEqual(payload['generated_at'],history['generated_at'])
            for key,rows in payload['history'].items():
                self.assertEqual(int(key)%32,payload['shard'])
                self.assertEqual(rows,history['history'][key])
            self.assertTrue(filename.endswith(str(payload['shard'])+'.json'))
    def test_shards_reject_broken_input(self):
        with self.assertRaisesRegex(RuntimeError,'invalid'):
            MODULE.shard_history({'schema':'bad','history':{}})
        with self.assertRaisesRegex(RuntimeError,'Invalid history shard ID'):
            MODULE.shard_history({'schema':'golden-peanut-daily-v1','history':{'0':[]}})

if __name__=='__main__':
    unittest.main()
