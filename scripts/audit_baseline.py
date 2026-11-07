#!/usr/bin/env python3
"""Repeatable synthetic baseline; fail closed and preserve command/commit evidence.

No private or production APIs are called. Logs stay in ignored artifacts/audit.
A skipped browser check is explicit and prevents the overall status being VERIFIED.
"""
import argparse
import datetime as dt
import json
import pathlib
import platform
import subprocess
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parents[1]
CHECKS = [
    ('source', [sys.executable, 'scripts/check_release.py']),
    ('python', [sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_*.py', '-v']),
    ('javascript', ['npm', 'test']),
    ('browser', ['npm', 'run', 'test:browser']),
]


def run_check(name, command, output, *, timeout=600):
    started = time.perf_counter()
    path = output / (name + '.log')
    try:
        with path.open('w') as stream:
            result = subprocess.run(command, cwd=ROOT, stdout=stream, stderr=subprocess.STDOUT,
                                    timeout=timeout, check=False)
        code, status = result.returncode, 'VERIFIED' if result.returncode == 0 else 'FAILED'
    except subprocess.TimeoutExpired:
        code, status = None, 'TIMEOUT'
    except OSError:
        code, status = None, 'UNAVAILABLE'
    return {'name': name, 'command': command, 'status': status, 'exit_code': code,
            'seconds': round(time.perf_counter() - started, 3), 'log': path.name}


def overall(checks, expected=None):
    if any(c['status'] not in ('VERIFIED', 'SKIPPED') for c in checks):
        return 'FAILED'
    if not checks or (expected is not None and len(checks) < expected):
        return 'IN PROGRESS'
    return 'PARTIAL' if any(c['status'] == 'SKIPPED' for c in checks) else 'VERIFIED'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--skip-browser', action='store_true')
    parser.add_argument('--output', type=pathlib.Path, default=ROOT / 'artifacts/audit')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    git = lambda *a: subprocess.check_output(['git', *a], cwd=ROOT, text=True).strip()
    report = {'schema': 'gp-audit-baseline-v1', 'started_at': dt.datetime.now(dt.timezone.utc).isoformat(),
              'commit': git('rev-parse', 'HEAD'), 'branch': git('branch', '--show-current'),
              'dirty': bool(git('status', '--porcelain')), 'platform': platform.platform(),
              'python': platform.python_version(), 'node': subprocess.check_output(['node', '--version'], text=True).strip(),
              'conditions': 'Synthetic local regression; browser emulation, not physical Android or live account validation',
              'planned_checks': [name for name, _ in CHECKS], 'checks': [], 'status': 'IN PROGRESS'}
    (args.output / 'baseline.json').write_text(json.dumps(report, indent=2) + '\n')
    for name, command in CHECKS:
        result = ({'name': name, 'command': command, 'status': 'SKIPPED', 'seconds': None,
                   'reason': 'explicit --skip-browser'} if name == 'browser' and args.skip_browser
                  else run_check(name, command, args.output))
        report['checks'].append(result)
        report['status'] = overall(report['checks'], expected=len(CHECKS))
        # Checkpoint after each command, so interruption preserves completed evidence.
        (args.output / 'baseline.json').write_text(json.dumps(report, indent=2) + '\n')
        print(name + ': ' + result['status'], flush=True)
    return 0 if report['status'] == 'VERIFIED' else 1


if __name__ == '__main__':
    sys.exit(main())
