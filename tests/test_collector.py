import importlib.util
import json
import pathlib
import tempfile
import unittest
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('collector','scripts/public_market_snapshot.py')
c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)

class CollectorTests(unittest.TestCase):
 def test_history_retains_missing_item_and_deduplicates(self):
  old={'history':{'1':[[100,1,2,3,4],[100,2,3,4,5],[99,1,2,3,4],[130,1,2,3,4]],'2':[[99,3,4,5,6]]}}
  h=c.merge_history([[1,'one','Weapon','Exotic',9,10,11,12]],old,101)['history']
  self.assertEqual(h['1'],[[99,1,2,3,4],[100,2,3,4,5],[101,9,10,11,12]])
  self.assertIn('2',h)
 def test_checkpoint_does_not_relabel_yesterday_as_today(self):
  h=c.merge_history([[1,'one','Weapon','Exotic',9,10,11,12]],{},101,{'1':100*86400})['history']
  self.assertEqual(h['1'][0][0],100)
 def test_reject_bool_negative_huge(self):
  for x in (True,-1,2**50,'1',1.5):self.assertFalse(c.valid_int(x))
 def test_incomplete_batch_cannot_checkpoint(self):
  with tempfile.TemporaryDirectory() as d,patch.object(c,'CACHE',pathlib.Path(d)),patch.object(c,'get_json',return_value=[{'id':1}]):
   with self.assertRaises(RuntimeError):list(c.batches('commerce/prices',[1,2],100))
   self.assertEqual(list(pathlib.Path(d).glob('*.json')),[])
 def test_checkpoint_resumes_without_request(self):
  with tempfile.TemporaryDirectory() as d,patch.object(c,'CACHE',pathlib.Path(d)),patch.object(c,'get_json',return_value=[{'id':1}]) as req,patch.object(c.time,'sleep'):
   first=list(c.batches('items',[1],100));second=list(c.batches('items',[1],100))
   self.assertEqual(first,second);self.assertEqual(req.call_count,1)
 def test_only_404_splits(self):
  with patch.object(c,'get_json',side_effect=RuntimeError('GW2 API HTTP 429')) as req:
   with self.assertRaises(RuntimeError):c.fetch_safe('items',[1,2])
   self.assertEqual(req.call_count,1)
 def test_missing_metadata_explicit(self):
  with patch.object(c,'get_json',side_effect=RuntimeError('GW2 API HTTP 404')):
   self.assertEqual(c.fetch_safe('items',[1,2]),[])
 def test_retry_after_numeric_and_http_date(self):
  self.assertEqual(c.retry_delay('60',0),60)
  with patch.object(c.time,'time',return_value=0):self.assertEqual(c.retry_delay('Thu, 01 Jan 1970 00:01:00 GMT',0),60)
 def test_depth_sorted_bounded_and_validated(self):
  levels=[{'unit_price':i+1,'quantity':i,'listings':1} for i in range(10)]
  d=c.depth_rows({'buys':levels,'sells':levels})
  self.assertEqual([x['unit_price'] for x in d['buys']],[10,9,8,7,6])
  with self.assertRaises(RuntimeError):c.depth_rows({'buys':[{'unit_price':-1}],'sells':[]})
 def test_atomic_json(self):
  with tempfile.TemporaryDirectory() as d:
   p=pathlib.Path(d)/'a.json';c.write_json(p,{'test':1});self.assertEqual(json.loads(p.read_text()),{'test':1});self.assertFalse(p.with_suffix('.tmp').exists())

if __name__=='__main__':unittest.main()
