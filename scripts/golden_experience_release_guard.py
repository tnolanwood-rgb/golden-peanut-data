#!/usr/bin/env python3
"""Fail-closed Golden Experience same-origin web release guard.

Called only by the existing main production Actions pipeline. Read-only preflight
before deployment; if the job's deployment/verification fails, restores the exact
previous successful Cloudflare Pages deployment. NEVER touches Android/Worker/D1
or private account/portfolio storage.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

from staging_guard import validate as validate_staging
from verify_live_release import check, remote_bytes

BASE = '576e6863f1cad328457a309e5604df5ac38be759'
CANDIDATE = 'baa225995d95de804cc5516f217b6bdec401f087'
OLD_BUILD = '576e6863f1cad328457a309e5604df5ac38be759'
PROD = 'thegoldenpeanut'
STAGING = 'golden-experience-staging'
PROD_ORIGIN = 'https://thegoldenpeanut.pages.dev'
STAGE_ORIGIN = 'https://golden-experience-staging.pages.dev'
REPORT = Path('artifacts/audit/golden-experience-production-rollback.json')
ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'app'


def abort(msg):
    raise RuntimeError('BLOCKED: ' + msg)


def credentials():
    account = os.environ.get('CLOUDFLARE_ACCOUNT_ID', '')
    token = os.environ.get('CLOUDFLARE_API_TOKEN', '')
    if not re.fullmatch(r'[0-9a-fA-F]{32}', account) or not token:
        abort('Cloudflare account token/ID unavailable')
    return account, token


def api(project, suffix='', method='GET'):
    if project not in (PROD, STAGING):
        abort('Invalid Cloudflare project selector')
    account, token = credentials()
    url = ('https://api.cloudflare.com/client/v4/accounts/' + account
           + '/pages/projects/' + project + suffix)
    req = urllib.request.Request(
        url, method=method, headers={'Authorization': 'Bearer ' + token,
                                     'Accept': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            payload = json.load(res)
    except urllib.error.HTTPError as exc:
        abort('Cloudflare ' + method + ' returned HTTP ' + str(exc.code))
    if payload.get('success') is not True:
        abort('Cloudflare ' + method + ' unsuccessful')
    return payload.get('result')


def confirm_main(sha):
    if not re.fullmatch(r'[0-9a-f]{40}', sha or ''):
        abort('Invalid source identity')
    result = subprocess.run(['git', 'ls-remote', 'origin', 'refs/heads/main'],
                            text=True, capture_output=True, timeout=30, check=True)
    if not result.stdout.startswith(sha + '\t'):
        abort('Live GitHub main changed during release')


def predecessor():
    folder = tempfile.TemporaryDirectory(prefix='golden-predecessor-')
    dest = Path(folder.name)
    command = 'git archive ' + BASE + ' app | tar -xf - -C ' + str(dest)
    # Use subprocess pipelines without invoking a shell.
    git = subprocess.Popen(['git', 'archive', BASE, 'app'], stdout=subprocess.PIPE)
    tar = subprocess.run(['tar', '-xf', '-', '-C', str(dest)],
                         stdin=git.stdout, capture_output=True, timeout=60)
    git.stdout.close()
    if git.wait(timeout=30) or tar.returncode:
        folder.cleanup()
        abort('Could not extract exact prior GitHub source')
    path = dest / 'app'
    if not path.is_dir() or not (path / 'index.html').is_file():
        folder.cleanup()
        abort('Baseline missing')
    return folder, path


def identities():
    prod = api(PROD)
    stage = api(STAGING)
    if (prod.get('name'), prod.get('subdomain'), prod.get('production_branch')) != (
        PROD, PROD + '.pages.dev', 'main'
    ):
        abort('Production Pages project/branch/host changed')
    validate_staging(stage)
    return prod


def marker(origin):
    return json.loads(remote_bytes(origin + '/build-info.json'))


def current_rollback_id(prod):
    pointer = prod.get('canonical_deployment') or prod.get('latest_deployment') or {}
    if not isinstance(pointer, dict):
        abort('Production deployment pointer unavailable')
    rollback_id = pointer.get('id', '')
    if not re.fullmatch(r'[0-9a-f-]{36}', rollback_id):
        abort('Production rollback ID absent')
    listing = api(PROD, '/deployments?per_page=20')
    row = next((d for d in listing if d.get('id') == rollback_id), None) if isinstance(listing, list) else None
    if not row or row.get('environment') != 'production' or (
       row.get('latest_stage') or {}).get('status') != 'success':
        abort('Could not prove current production deployment succeeded')
    return rollback_id


def preflight(sha):
    confirm_main(sha)
    prod = identities()
    holder, baseline = predecessor()
    try:
        old_files = check(PROD_ORIGIN, baseline)
        if old_files != 38:
            abort('Unexpected baseline production asset count')
        old_marker = marker(PROD_ORIGIN)
        if old_marker.get('commit') != OLD_BUILD or old_marker.get('origin') != PROD + '.pages.dev':
            abort('Production build marker has drifted')
        if (APP / 'build-info.json').exists():
            abort('Unreviewed generated build file already in source')
        new_files = check(STAGE_ORIGIN, APP)
        if new_files != 38:
            abort('Current main frontend does not exactly match verified staged upgrade')
        staged = marker(STAGE_ORIGIN)
        if (staged.get('commit'), staged.get('origin')) != (CANDIDATE, STAGING+'.pages.dev'):
            abort('Staged candidate build identity changed')
        rollback_id = current_rollback_id(prod)
        confirm_main(sha)
        REPORT.parent.mkdir(parents=True, exist_ok=True)
        REPORT.write_text(json.dumps({
            'schema': 'golden-experience-web-preflight-v1',
            'release_source': sha, 'candidate_source': CANDIDATE,
            'previous_source': BASE, 'previous_build': OLD_BUILD,
            'rollback_deployment': rollback_id,
            'production_origin': PROD_ORIGIN, 'staging_origin': STAGE_ORIGIN,
            'baseline_assets': old_files, 'candidate_assets': new_files,
        }, indent=2, sort_keys=True) + '\n')
        print('PASS: immutable main, 38 production baseline assets, 38 staged candidate '
              'assets, independent staging, and rollback deployment locked.')
        print('READY FOR CONTROLLED SAME-ORIGIN WEB DEPLOY; NO APK OR ACCOUNT MIGRATION.')
    finally:
        holder.cleanup()


def rollback(sha):
    if not REPORT.is_file():
        abort('Missing preflight manifest; cannot select safe rollback target')
    proof = json.loads(REPORT.read_text())
    if (proof.get('release_source'), proof.get('previous_source'),
        proof.get('previous_build'), proof.get('production_origin')) != (
        sha, BASE, OLD_BUILD, PROD_ORIGIN):
        abort('Release and rollback identity mismatch')
    rollback_id = proof.get('rollback_deployment', '')
    if not re.fullmatch(r'[0-9a-f-]{36}', rollback_id):
        abort('Unverified rollback ID')
    prod = identities()
    listing = api(PROD, '/deployments?per_page=20')
    target = next((d for d in listing if d.get('id') == rollback_id), None)
    if not target or target.get('environment') != 'production' or (
        target.get('latest_stage') or {}).get('status') != 'success':
        abort('Stored predecessor deployment no longer verified')
    holder, baseline = predecessor()
    try:
        try:
            old_valid = check(PROD_ORIGIN, baseline) == 38 and marker(PROD_ORIGIN).get('commit') == OLD_BUILD
        except (OSError, ValueError, urllib.error.URLError):
            old_valid = False
        if not old_valid:
            # Only the same already proven Cloudflare Pages rollback API that
            # passed the full native staging rehearsal.
            api(PROD, '/deployments/' + rollback_id + '/rollback', method='POST')
        for attempt in range(18):
            try:
                if check(PROD_ORIGIN, baseline) == 38 and marker(PROD_ORIGIN).get('commit') == OLD_BUILD:
                    print('PASS: Original production frontend completely restored; '
                          'same origin and device storage preserved.')
                    return
            except (OSError, ValueError, urllib.error.URLError):
                pass
            if attempt < 17:
                time.sleep(8)
        abort('EMERGENCY: Cloudflare rollback invoked but original hosted bytes not verified')
    finally:
        holder.cleanup()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=('preflight', 'rollback'))
    args = parser.parse_args()
    try:
        if args.mode == 'preflight':
            preflight(os.getenv('GITHUB_SHA', ''))
        else:
            rollback(os.getenv('GITHUB_SHA', ''))
    except Exception as exc:
        print('WEB RELEASE GUARD FAILED: ' + str(exc)[:300], file=sys.stderr)
        sys.exit(1)
