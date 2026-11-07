import importlib.util
import pathlib
import sys
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('audit', 'scripts/audit_baseline.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


class AuditHarnessTests(unittest.TestCase):
    def test_incomplete_checkpoint_is_not_verified(self):
        self.assertEqual(audit.overall([]), 'IN PROGRESS')
        self.assertEqual(audit.overall([{'status': 'VERIFIED'}], expected=4), 'IN PROGRESS')
        self.assertEqual(audit.overall([{'status': 'FAILED'}], expected=4), 'FAILED')
        self.assertEqual(audit.overall([{'status': 'VERIFIED'}] * 4, expected=4), 'VERIFIED')

    def test_failed_process_is_not_success_even_if_it_prints_success(self):
        with tempfile.TemporaryDirectory() as directory:
            r = audit.run_check('probe', [sys.executable, '-c', "print('success'); raise SystemExit(3)"], pathlib.Path(directory))
            self.assertEqual(r['exit_code'], 3)
            self.assertEqual(audit.overall([r]), 'FAILED')

    def test_missing_command_is_reported_and_skip_is_not_verified(self):
        with tempfile.TemporaryDirectory() as directory:
            r = audit.run_check('probe', ['/nonexistent/gp-audit-command'], pathlib.Path(directory))
            self.assertEqual(r['status'], 'UNAVAILABLE')
            self.assertEqual(audit.overall([r]), 'FAILED')
        self.assertEqual(audit.overall([{'status': 'VERIFIED'}, {'status': 'SKIPPED'}]), 'PARTIAL')

    def test_timeout_is_not_reported_as_success(self):
        with tempfile.TemporaryDirectory() as directory:
            r = audit.run_check('probe', [sys.executable, '-c', 'import time; time.sleep(5)'], pathlib.Path(directory), timeout=.05)
            self.assertEqual(r['status'], 'TIMEOUT')
            self.assertEqual(audit.overall([r]), 'FAILED')
