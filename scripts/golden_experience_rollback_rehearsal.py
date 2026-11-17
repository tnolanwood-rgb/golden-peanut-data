#!/usr/bin/env python3
"""Offline static-site release/rollback simulation. NEVER deploys or accesses accounts.

Reads two exact Git object trees, simulates publishing the candidate and restoring
its predecessor under a temporary directory, and writes only an evidence report.
The predecessor is a source snapshot, NOT proof of the currently hosted site.
"""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import sys
import tempfile

SCHEMA = 'golden-experience-rollback-rehearsal-v1'
REQUIRED = frozenset({'app/index.html', 'app/_headers',
                     'app/dual-hub.js', 'app/dual-hub.css'})
MAX_ASSETS = 2000
MAX_BUNDLE_BYTES = 64 * 1024 * 1024


class RehearsalError(ValueError):
    pass


def git(repo, *args):
    result = subprocess.run(['git', '-C', str(repo), *args],
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                            check=False)
    if result.returncode:
        raise RehearsalError('Unable to verify Git source objects')
    return result.stdout


def snapshot(repo, revision):
    """Extract the reviewed public app subtree from Git, not the working tree."""
    if not isinstance(revision, str) or len(revision) != 40 or any(
            char not in '0123456789abcdef' for char in revision):
        raise RehearsalError('An exact 40-character lowercase Git revision is required')
    if git(repo, 'rev-parse', '--verify', revision + '^{commit}').strip().decode() != revision:
        raise RehearsalError('Git revision must identify an existing exact commit')
    rows = git(repo, 'ls-tree', '-rz', revision, '--', 'app').split(b'\0')
    assets = {}
    total = 0
    for row in rows:
        if not row:
            continue
        try:
            info, path_bytes = row.split(b'\t', 1)
            mode, kind, oid = info.decode('ascii').split(' ')
            name = path_bytes.decode('utf-8')
        except (ValueError, UnicodeDecodeError):
            raise RehearsalError('Malformed Git tree asset entry') from None
        pure = PurePosixPath(name)
        if mode != '100644' or kind != 'blob' or pure.parts[:1] != ('app',) or \
                len(pure.parts) < 2 or '..' in pure.parts or '\\' in name or '\x00' in name:
            raise RehearsalError('Unsafe app file mode, type or path in source snapshot')
        if name in assets:
            raise RehearsalError('Duplicate app path')
        raw = git(repo, 'cat-file', 'blob', oid)
        total += len(raw)
        if len(assets) >= MAX_ASSETS or total > MAX_BUNDLE_BYTES:
            raise RehearsalError('Source bundle exceeds offline safety cap')
        assets[name] = raw
    if not REQUIRED.issubset(assets):
        raise RehearsalError('Source snapshot lacks mandatory app files')
    if any(not assets[name] for name in REQUIRED):
        raise RehearsalError('Required app file is empty')
    return assets


def fingerprint(assets):
    rows = {name: {'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw)}
            for name, raw in sorted(assets.items())}
    digest = hashlib.sha256(json.dumps(rows, sort_keys=True,
                                   separators=(',', ':')).encode()).hexdigest()
    return {'bundle_sha256': digest, 'files': len(rows),
            'bytes': sum(v['bytes'] for v in rows.values())}


def publish_to_temp(target, assets):
    """Simulate replacement ONLY inside a newly allocated temporary directory."""
    if target.exists():
        shutil.rmtree(target)
    target.mkdir()
    for name, raw in assets.items():
        destination = target.joinpath(*PurePosixPath(name).parts)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(raw)
    observed = {}
    for child in target.rglob('*'):
        if child.is_file():
            observed[child.relative_to(target).as_posix()] = child.read_bytes()
    if set(observed) != set(assets) or any(observed[name] != raw for name, raw in assets.items()):
        raise RehearsalError('Published or rolled-back files differ byte-for-byte')
    return fingerprint(observed)


def rehearse(repo, candidate_sha, rollback_sha):
    candidate = snapshot(repo, candidate_sha)
    predecessor = snapshot(repo, rollback_sha)
    candidate_fp = fingerprint(candidate)
    predecessor_fp = fingerprint(predecessor)
    if candidate_fp['bundle_sha256'] == predecessor_fp['bundle_sha256']:
        raise RehearsalError('Candidate does not change the static frontend')
    with tempfile.TemporaryDirectory(prefix='ge-release-rehearsal-') as workspace:
        website = Path(workspace) / 'public-site'
        original = publish_to_temp(website, predecessor)
        upgraded = publish_to_temp(website, candidate)
        restored = publish_to_temp(website, predecessor)
    if original != predecessor_fp or upgraded != candidate_fp or restored != predecessor_fp:
        raise RehearsalError('Candidate/rollback byte identity failed')
    return {
        'schema': SCHEMA, 'result': 'OFFLINE_REHEARSAL_PASS',
        'candidate_commit': candidate_sha, 'predecessor_commit': rollback_sha,
        'candidate': candidate_fp, 'predecessor': predecessor_fp,
        'roundtrip': ['predecessor', 'candidate', 'predecessor'],
        'restored_exact_predecessor_bytes': True,
        'limitations': ('No Cloudflare upload, no actual hosted predecessor verification, '
                        'no isolated staging, no production deploy, no Android device/storage test'),
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--candidate', required=True)
    parser.add_argument('--rollback', required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        repo = args.repo.resolve()
        output = args.output.resolve()
        if not output.is_relative_to(repo / 'artifacts'):
            raise RehearsalError('Report must stay under ignored artifacts/, never app/')
        report = rehearse(repo, args.candidate, args.rollback)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(report, indent=2, sort_keys=True) + '\n', encoding='utf-8')
        print('OFFLINE ROLLBACK REHEARSAL PASS: ' + str(report['candidate']['files']) +
              ' candidate files; no Cloudflare or production change')
        return 0
    except (RehearsalError, OSError) as exc:
        print('REHEARSAL BLOCKED: ' + str(exc), file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
