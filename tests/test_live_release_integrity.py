import importlib.util
import pathlib
import tempfile
import unittest

SOURCE=pathlib.Path(__file__).resolve().parents[1]/'scripts/verify_live_release.py'
spec=importlib.util.spec_from_file_location('live_release',SOURCE)
v=importlib.util.module_from_spec(spec)
spec.loader.exec_module(v)

class LiveReleaseIntegrityTests(unittest.TestCase):
    def test_exact_assets_and_no_private_config(self):
        with tempfile.TemporaryDirectory() as d:
            root=pathlib.Path(d)
            (root/'icons').mkdir()
            (root/'index.html').write_bytes(b'<p>fixture</p>')
            (root/'icons/gold.png').write_bytes(b'fake PNG content')
            (root/'_headers').write_bytes(b'config only')
            served={'index.html':b'<p>fixture</p>','icons/gold.png':b'fake PNG content'}
            requests=[]
            def fetch(url):
                requests.append(url)
                return served[url.split('https://example.pages.dev/')[1]]
            self.assertEqual(v.check('https://example.pages.dev',root,fetch),2)
            self.assertEqual(len(requests),2)
            served['icons/gold.png']=b'wrong!'
            with self.assertRaisesRegex(ValueError,'icons/gold.png'):
                v.check('https://example.pages.dev',root,fetch)
    def test_fail_closed_with_non_https_and_empty_asset_tree(self):
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaisesRegex(ValueError,'HTTPS'):
                v.check('http://example.pages.dev',pathlib.Path(d),lambda u:b'')
            with self.assertRaisesRegex(ValueError,'No application'):
                v.check('https://example.pages.dev',pathlib.Path(d),lambda u:b'')

if __name__=='__main__':unittest.main()
