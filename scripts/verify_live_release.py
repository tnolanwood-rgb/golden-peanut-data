#!/usr/bin/env python3
"""Verify exact Cloudflare Pages bytes after deployment. Never reads private APIs."""
import argparse
import hashlib
import json
import pathlib
import sys
import time
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
APP = ROOT / 'app'
MAX_ATTEMPTS = 10


def distributable_files(folder=APP):
    return sorted(p for p in folder.rglob('*') if p.is_file() and not p.name.startswith('_')
                  and not p.name.startswith('.'))


def digest(value):
    return hashlib.sha256(value).hexdigest()


def check(origin, folder=APP, fetch=None):
    origin = origin.rstrip('/')
    if not origin.startswith('https://') or '/?' in origin:
        raise ValueError('Use a verified HTTPS Pages origin')
    fetch = fetch or remote_bytes
    files = distributable_files(folder)
    if not files:
        raise ValueError('No application files to verify')
    for path in files:
        rel = path.relative_to(folder).as_posix()
        expected = digest(path.read_bytes())
        actual = digest(fetch(origin+'/'+rel))
        if actual != expected:
            raise ValueError('Unexpected production asset checksum: '+rel)
    return len(files)


def remote_bytes(url):
    req = urllib.request.Request(url, headers={
        'Accept-Encoding': 'identity',
        'Cache-Control': 'no-cache',
        'User-Agent': 'GoldenPeanutExactReleaseVerifier/1'})
    with urllib.request.urlopen(req, timeout=25) as response:
        if response.status != 200:
            raise ValueError('Unexpected HTTP status')
        if response.headers.get('Content-Encoding','identity').lower() not in ('identity',''):
            raise ValueError('Unexpected compressed asset response')
        return response.read(5_000_000)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--origin',default='https://thegoldenpeanut.pages.dev')
    parser.add_argument('--attempts',type=int,default=MAX_ATTEMPTS)
    args=parser.parse_args()
    if args.attempts<1 or args.attempts>15:
        parser.error('attempts must be 1–15')
    for attempt in range(args.attempts):
        try:
            count=check(args.origin)
            print('VERIFIED: '+str(count)+' exact production asset checksums at the existing Pages origin.')
            return 0
        except (OSError,ValueError,urllib.error.URLError) as exc:
            # Never dump remote bodies. Only local filename or error class.
            message=str(exc) if isinstance(exc,ValueError) else type(exc).__name__
            print('Production verification pending '+str(attempt+1)+'/'+str(args.attempts)+': '+message[:120])
            if attempt<args.attempts-1:
                time.sleep(5)
    print('FAIL: production was not independently verified. Do not claim a live release.')
    return 1


if __name__=='__main__':
    sys.exit(main())
