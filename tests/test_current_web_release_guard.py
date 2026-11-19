"""Synthetic preflight/rollback checks; never contact Cloudflare or user data."""
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import golden_experience_release_guard as guard


class CurrentWebReleaseGuardTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.report = self.root / 'rollback.json'
        self.holder = Mock()
        self.project = {'name': guard.PROD}
        self.rollback_id = '11111111-2222-3333-4444-555555555555'
        self.sha = 'a' * 40
        self.check = Mock(return_value=38)
        self.marker = Mock(side_effect=lambda origin: {
            'commit': guard.OLD_BUILD if origin == guard.PROD_ORIGIN else guard.CANDIDATE,
            'origin': guard.PROD + '.pages.dev' if origin == guard.PROD_ORIGIN else guard.STAGING + '.pages.dev',
        })
        self.patches = patch.multiple(guard, APP=self.root, REPORT=self.report,
            confirm_main=Mock(), identities=Mock(return_value=self.project),
            predecessor=Mock(return_value=(self.holder, self.root)),
            check=self.check, marker=self.marker,
            current_rollback_id=Mock(return_value=self.rollback_id))
        self.patches.start()
        self.addCleanup(self.patches.stop)

    def test_exact_current_predecessor_and_staged_candidate_recorded(self):
        guard.preflight(self.sha)
        proof = json.loads(self.report.read_text())
        self.assertEqual(proof['previous_build'], guard.OLD_BUILD)
        self.assertEqual(proof['candidate_source'], guard.CANDIDATE)
        self.assertEqual(proof['baseline_assets'], 38)
        self.assertEqual(proof['rollback_deployment'], self.rollback_id)
        self.assertEqual(guard.confirm_main.call_count, 2)

    def test_historic_37_asset_predecessor_is_rejected(self):
        self.check.return_value = 37
        with self.assertRaisesRegex(RuntimeError, 'baseline production asset count'):
            guard.preflight(self.sha)
        self.assertFalse(self.report.exists())
        guard.current_rollback_id.assert_not_called()

    def test_wrong_staging_identity_never_produces_release_manifest(self):
        self.marker.side_effect = [
            {'commit': guard.OLD_BUILD, 'origin': guard.PROD + '.pages.dev'},
            {'commit': 'b' * 40, 'origin': guard.STAGING + '.pages.dev'},
        ]
        with self.assertRaisesRegex(RuntimeError, 'Staged candidate build identity changed'):
            guard.preflight(self.sha)
        self.assertFalse(self.report.exists())

    def test_rollback_already_restored_does_not_mutate_cloudflare(self):
        guard.preflight(self.sha)
        with patch.object(guard, 'api', return_value=[{
            'id': self.rollback_id, 'environment': 'production',
            'latest_stage': {'status': 'success'},
        }]) as api:
            guard.rollback(self.sha)
        self.assertFalse(any(call.kwargs.get('method') == 'POST' for call in api.call_args_list))


if __name__ == '__main__':
    unittest.main()
