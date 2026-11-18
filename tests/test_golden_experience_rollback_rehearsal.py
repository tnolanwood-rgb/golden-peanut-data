"""Dry-run release/rollback proving exact bytes without touching a real site."""
import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest

SOURCE = Path(__file__).resolve().parents[1] / 'scripts/golden_experience_rollback_rehearsal.py'
spec = importlib.util.spec_from_file_location('ge_rollback', SOURCE)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class OfflineRollbackSafety(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.git('init', '-q')
        self.git('config', 'user.email', 'qa@example.invalid')
        self.git('config', 'user.name', 'QA')
        originals = {'app/index.html': '<h1>Original</h1>',
                     'app/_headers': '/\n  Cache-Control: no-store',
                     'app/dual-hub.js': 'const hub = "old";',
                     'app/dual-hub.css': 'body{background:black}',
                     'app/icons/coin.png': '\u00a7binary'}
        for name, body in originals.items():
            dest = self.root / name
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(body)
        self.git('add', '.')
        self.git('commit', '-qm', 'predecessor')
        self.old = self.git('rev-parse', 'HEAD')
        (self.root / 'app/dual-hub.js').write_text('const hub = "premium";')
        self.git('add', '.')
        self.git('commit', '-qm', 'candidate')
        self.new = self.git('rev-parse', 'HEAD')

    def git(self, *args):
        return subprocess.check_output(['git', '-C', str(self.root), *args], text=True).strip()

    def test_roundtrip_recovers_exact_predecessor_and_never_writes_app(self):
        report = mod.rehearse(self.root, self.new, self.old)
        self.assertEqual(report['result'], 'OFFLINE_REHEARSAL_PASS')
        self.assertTrue(report['restored_exact_predecessor_bytes'])
        self.assertNotEqual(report['candidate']['bundle_sha256'],
                            report['predecessor']['bundle_sha256'])
        self.assertEqual((self.root/'app/dual-hub.js').read_text(), 'const hub = "premium";')
        output = self.root / 'artifacts/rehearsal.json'
        self.assertEqual(mod.main(['--repo', str(self.root), '--candidate', self.new,
                                   '--rollback', self.old, '--output', str(output)]), 0)
        self.assertTrue(output.is_file())
        self.assertNotIn('premium', output.read_text())

    def test_never_accepts_fabricated_refs_or_same_frontend(self):
        with self.assertRaises(mod.RehearsalError):
            mod.rehearse(self.root, '0'*40, self.old)
        with self.assertRaises(mod.RehearsalError):
            mod.rehearse(self.root, self.old, self.old)
        with self.assertRaises(mod.RehearsalError):
            mod.rehearse(self.root, 'HEAD', self.old)

    def test_rejects_missing_required_file_and_symlink_in_snapshot(self):
        (self.root/'app/_headers').unlink()
        self.git('add', '.')
        self.git('commit', '-qm', 'broken')
        broken = self.git('rev-parse', 'HEAD')
        with self.assertRaisesRegex(mod.RehearsalError, 'mandatory'):
            mod.rehearse(self.root, broken, self.old)
        (self.root/'app/_headers').write_text('/')
        (self.root/'app/icons/coin.png').unlink()
        (self.root/'app/icons/coin.png').symlink_to('/etc/passwd')
        self.git('add', '.')
        self.git('commit', '-qm', 'symlink')
        symlink = self.git('rev-parse', 'HEAD')
        with self.assertRaisesRegex(mod.RehearsalError, 'Unsafe'):
            mod.rehearse(self.root, symlink, self.old)

    def test_rejects_output_outside_artifacts(self):
        bad = self.root / 'app/rehearsal.json'
        self.assertEqual(mod.main(['--repo', str(self.root), '--candidate', self.new,
                                   '--rollback', self.old, '--output', str(bad)]), 1)
        self.assertFalse(bad.exists())


if __name__ == '__main__':
    unittest.main()
