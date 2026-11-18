#!/usr/bin/env python3
"""Offline Golden Experience asset/source lock. NEVER deploys or accesses accounts."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = "golden-experience-candidate-lock-v1"
ORIGIN = "https://thegoldenpeanut.pages.dev"
GIT_SHA = re.compile(r"[0-9a-f]{40}\Z")
REQUIRED = ("app/index.html", "app/_headers", "app/dual-hub.js",
            "app/dual-hub.css", "package-lock.json")


class CandidateError(ValueError):
    pass


def sha(value, label):
    if not isinstance(value, str) or not GIT_SHA.fullmatch(value):
        raise CandidateError(label + " must be an exact lowercase 40-character SHA")
    return value


def hash_bytes(raw):
    return hashlib.sha256(raw).hexdigest()


def snapshot(root, commit, tree, main):
    """Lock exact app bytes, configuration and dependency identity, without I/O beyond disk."""
    root = Path(root).resolve()
    commit, tree, main = sha(commit, "commit"), sha(tree, "tree"), sha(main, "main")
    if commit == main:
        raise CandidateError("Development candidate must differ from production main")
    for rel in REQUIRED:
        path = root / rel
        if path.is_symlink() or not path.is_file():
            raise CandidateError("Missing or symlinked required file: " + rel)
    files = {}
    for path in sorted((root / "app").rglob("*")):
        if path.is_symlink():
            raise CandidateError("Symlink in app tree: " + path.relative_to(root).as_posix())
        if path.is_file():
            raw = path.read_bytes()
            files[path.relative_to(root).as_posix()] = {
                "bytes": len(raw), "sha256": hash_bytes(raw)}
    if len(files) < 5:
        raise CandidateError("Incomplete app asset tree")
    return {
        "schema": SCHEMA, "production_origin": ORIGIN,
        "candidate_commit": commit, "candidate_tree": tree,
        "baseline_main": main,
        "package_lock_sha256": hash_bytes((root / "package-lock.json").read_bytes()),
        "bundle_sha256": hash_bytes(json.dumps(files, sort_keys=True,
                                separators=(",", ":")).encode("utf-8")),
        "files": files,
    }


def verify(root, lock, actual_commit, actual_tree, actual_main):
    """Fail closed if files, dependencies, selected commit/tree or main changed."""
    actual_commit = sha(actual_commit, "actual_commit")
    actual_tree = sha(actual_tree, "actual_tree")
    actual_main = sha(actual_main, "actual_main")
    if not isinstance(lock, dict) or lock.get("schema") != SCHEMA:
        raise CandidateError("Unsupported candidate manifest")
    if lock.get("baseline_main") != actual_main:
        raise CandidateError("Production main drift: rebuild and revalidate candidate")
    if lock.get("candidate_commit") != actual_commit:
        raise CandidateError("Locked candidate commit has changed")
    if lock.get("candidate_tree") != actual_tree:
        raise CandidateError("Locked source tree has changed")
    if lock != snapshot(root, actual_commit, actual_tree, actual_main):
        raise CandidateError("Candidate assets, config, origin or dependencies changed")
    return len(lock["files"])


def check_local_git(root, expected_commit, expected_tree):
    """Reject fabricated IDs and uncommitted work before preparing a release."""
    root = Path(root).resolve()
    def command(*parts):
        proc = subprocess.run(["git", "-C", str(root), *parts],
                              capture_output=True, text=True, check=False)
        if proc.returncode:
            raise CandidateError("Cannot establish clean local Git identity")
        return proc.stdout.strip()
    current_commit = command("rev-parse", "--verify", "HEAD")
    current_tree = command("rev-parse", "--verify", "HEAD^{tree}")
    if current_commit != sha(expected_commit, "expected_commit"):
        raise CandidateError("Checkout HEAD does not match proposed candidate commit")
    if current_tree != sha(expected_tree, "expected_tree"):
        raise CandidateError("Checkout Git tree does not match proposed source tree")
    if command("status", "--porcelain", "--untracked-files=normal"):
        raise CandidateError("Checkout has uncommitted or untracked source changes")
    return current_commit, current_tree


def save(root, path, manifest):
    root = Path(root).resolve()
    target = Path(path).resolve()
    if not target.is_relative_to(root / "artifacts"):
        raise CandidateError("Manifest must stay under artifacts/, outside deployed app/")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n",
                      encoding="utf-8")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    sub = parser.add_subparsers(dest="operation", required=True)
    prep = sub.add_parser("prepare")
    prep.add_argument("--commit", required=True)
    prep.add_argument("--tree", required=True)
    prep.add_argument("--baseline-main", required=True)
    prep.add_argument("--manifest", type=Path, required=True)
    check = sub.add_parser("verify")
    check.add_argument("--commit", required=True)
    check.add_argument("--tree", required=True)
    check.add_argument("--observed-main", required=True)
    check.add_argument("--manifest", type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        check_local_git(args.root, args.commit, args.tree)
        if args.operation == "prepare":
            lock = snapshot(args.root, args.commit, args.tree, args.baseline_main)
            save(args.root, args.manifest, lock)
            print("PREPARED OFFLINE: " + str(len(lock["files"])) +
                  " app files. No deploy, live checks or account access.")
        else:
            lock = json.loads(args.manifest.read_text(encoding="utf-8"))
            count = verify(args.root, lock, args.commit, args.tree, args.observed_main)
            print("OFFLINE PREFLIGHT PASS: " + str(count) +
                  " exact files. Staging/live/Android remain unverified.")
        return 0
    except (CandidateError, OSError, ValueError) as exc:
        print("FAIL CLOSED: " + str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
