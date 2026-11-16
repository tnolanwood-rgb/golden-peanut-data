"""Synthetic offline manifest and main-drift protection tests."""
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

source = Path(__file__).resolve().parents[1] / "scripts/golden_experience_candidate.py"
spec = importlib.util.spec_from_file_location("ge_candidate_lock", source)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
COMMIT, TREE, MAIN = "a" * 40, "b" * 40, "c" * 40


class CandidateSafetyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        fixtures = {
            "app/index.html": "<html>test</html>",
            "app/_headers": "/\n  Cache-Control: no-cache\n",
            "app/dual-hub.js": "const version = 1;",
            "app/dual-hub.css": "body { color: ivory; }",
            "app/icons/gold.png": "fake binary art",
            "package-lock.json": '{"lockfileVersion":3}',
        }
        for relative, content in fixtures.items():
            path = self.root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content)

    def lock(self):
        return mod.snapshot(self.root, COMMIT, TREE, MAIN)

    def test_exact_asset_hashes_include_deploy_config(self):
        a = self.lock()
        self.assertEqual(a, self.lock())
        self.assertEqual(mod.verify(self.root, a, COMMIT, TREE, MAIN), 5)
        self.assertIn("app/_headers", a["files"])
        self.assertEqual(a["production_origin"], "https://thegoldenpeanut.pages.dev")

    def test_changed_added_or_removed_app_file_fails(self):
        a = self.lock()
        p = self.root / "app/icons/gold.png"
        p.write_text("different")
        with self.assertRaises(mod.CandidateError):
            mod.verify(self.root, a, COMMIT, TREE, MAIN)
        p.write_text("fake binary art")
        extra = self.root / "app/new-file.js"
        extra.write_text("new")
        with self.assertRaises(mod.CandidateError):
            mod.verify(self.root, a, COMMIT, TREE, MAIN)
        extra.unlink()
        p.unlink()
        with self.assertRaises(mod.CandidateError):
            mod.verify(self.root, a, COMMIT, TREE, MAIN)

    def test_package_lock_and_origin_tampering_fail(self):
        a = self.lock()
        path = self.root / "package-lock.json"
        path.write_text("different")
        with self.assertRaises(mod.CandidateError):
            mod.verify(self.root, a, COMMIT, TREE, MAIN)
        path.write_text('{"lockfileVersion":3}')
        a["production_origin"] = "https://wrong.pages.dev"
        with self.assertRaises(mod.CandidateError):
            mod.verify(self.root, a, COMMIT, TREE, MAIN)

    def test_wrong_source_tree_and_main_drift_fail(self):
        a = self.lock()
        for commit, tree, main in ((COMMIT, TREE, "d" * 40),
                                   ("e" * 40, TREE, MAIN),
                                   (COMMIT, "f" * 40, MAIN)):
            with self.assertRaises(mod.CandidateError):
                mod.verify(self.root, a, commit, tree, main)

    def test_symlinks_and_missing_required_files_fail(self):
        p = self.root / "app/icons/gold.png"
        p.unlink()
        p.symlink_to(self.root / "package-lock.json")
        with self.assertRaisesRegex(mod.CandidateError, "Symlink"):
            self.lock()
        p.unlink()
        (self.root / "app/index.html").unlink()
        with self.assertRaisesRegex(mod.CandidateError, "Missing"):
            self.lock()

    def test_local_manifest_cannot_be_added_to_deployed_assets(self):
        a = self.lock()
        with self.assertRaisesRegex(mod.CandidateError, "artifacts"):
            mod.save(self.root, self.root / "app/lock.json", a)
        path = self.root / "artifacts/ge/candidate.json"
        mod.save(self.root, path, a)
        self.assertEqual(json.loads(path.read_text()), a)
        self.assertEqual(mod.verify(self.root, json.loads(path.read_text()),
                                    COMMIT, TREE, MAIN), 5)

    def test_bad_sha_and_incomplete_bundle_rejected(self):
        with self.assertRaisesRegex(mod.CandidateError, "40-character"):
            mod.snapshot(self.root, "short", TREE, MAIN)
        with self.assertRaises(mod.CandidateError):
            mod.snapshot(self.root, MAIN, TREE, MAIN)
        (self.root / "app/dual-hub.js").unlink()
        with self.assertRaises(mod.CandidateError):
            self.lock()

    def test_real_git_checkout_and_dirty_tree_gate(self):
        def git(*args):
            return subprocess.check_output(["git", "-C", str(self.root), *args],
                                           text=True).strip()
        git("init", "-q")
        git("config", "user.name", "Golden Experience CI")
        git("config", "user.email", "ge-ci@example.invalid")
        (self.root / ".gitignore").write_text("artifacts/\n")
        git("add", ".")
        git("commit", "-q", "-m", "synthetic candidate")
        head = git("rev-parse", "HEAD")
        tree = git("rev-parse", "HEAD^{tree}")
        mod.check_local_git(self.root, head, tree)
        manifest = self.root / "artifacts/ge/lock.json"
        self.assertEqual(mod.main(["--root", str(self.root), "prepare",
                                    "--commit", head, "--tree", tree,
                                    "--baseline-main", MAIN,
                                    "--manifest", str(manifest)]), 0)
        self.assertEqual(mod.main(["--root", str(self.root), "verify",
                                    "--commit", head, "--tree", tree,
                                    "--observed-main", MAIN,
                                    "--manifest", str(manifest)]), 0)
        with self.assertRaisesRegex(mod.CandidateError, "HEAD"):
            mod.check_local_git(self.root, "f" * 40, tree)
        (self.root / "app/dual-hub.js").write_text("dirty")
        with self.assertRaisesRegex(mod.CandidateError, "uncommitted"):
            mod.check_local_git(self.root, head, tree)


if __name__ == "__main__":
    unittest.main()
