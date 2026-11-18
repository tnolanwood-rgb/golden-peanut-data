#!/usr/bin/env python3
"""Offline, fail-closed Pages staging project safety gate. Never deploys."""
import argparse
import json
import pathlib
import sys

STAGING_NAME = "golden-experience-staging"
STAGING_BRANCH = "golden-experience-staging"
BINDINGS = frozenset({
    "d1_databases", "kv_namespaces", "r2_buckets", "services",
    "durable_object_namespaces", "env_vars", "queues", "hyperdrive",
    "vectorize", "analytics_engine_datasets", "ai", "browser",
    "dispatch_namespaces", "unsafe", "vars", "secrets", "assets",
})
SAFE_CONFIG = frozenset({
    "compatibility_date", "compatibility_flags", "build_image_major_version",
    "fail_open", "usage_model", "placement", "limits", "observability",
    "always_use_latest_compatibility_date",
})
EMPTY = (None, {}, [])


class StagingUnsafe(ValueError):
    pass


def validate(payload):
    if not isinstance(payload, dict):
        raise StagingUnsafe("Pages project response must be an object")
    if "result" in payload:
        if payload.get("success") is not True:
            raise StagingUnsafe("Cloudflare read-only response was not successful")
        payload = payload["result"]
    if not isinstance(payload, dict):
        raise StagingUnsafe("Cloudflare project result is missing")
    if payload.get("name") != STAGING_NAME:
        raise StagingUnsafe("Wrong Pages project (production must never be reused)")
    if payload.get("production_branch") != STAGING_BRANCH:
        raise StagingUnsafe("Unexpected staging production branch")
    if payload.get("source") not in (None, {}, {"type": None}):
        raise StagingUnsafe("Git-linked staging auto-deploy source not independently cleared")
    # In Cloudflare Pages' project API, "subdomain" is the default pages.dev
    # hostname; "domains" lists *custom* domains. A safely isolated project
    # normally reports the expected subdomain and an empty domains array.
    expected_host = STAGING_NAME + ".pages.dev"
    if payload.get("subdomain") != expected_host:
        raise StagingUnsafe("Missing or unexpected independent staging subdomain")
    hosts = payload.get("domains")
    if not isinstance(hosts, list):
        raise StagingUnsafe("Complete custom-domain inventory must be reported")
    for hostname in hosts:
        if not isinstance(hostname, str) or hostname.lower().rstrip(".") != expected_host:
            raise StagingUnsafe("Unexpected custom hostname or production domain")
    config = payload.get("deployment_configs")
    if not isinstance(config, dict) or set(config) != {"production", "preview"}:
        raise StagingUnsafe("Both Cloudflare deployment environment configs are required")
    for name in ("production", "preview"):
        env = config[name]
        if not isinstance(env, dict):
            raise StagingUnsafe("Missing " + name + " environment config")
        for key, value in env.items():
            if key in BINDINGS or key not in SAFE_CONFIG:
                if value not in EMPTY:
                    raise StagingUnsafe("Nonempty or unknown " + name + " binding: " + key)
        for key in ("d1_databases", "kv_namespaces", "r2_buckets", "services",
                    "durable_object_namespaces", "env_vars"):
            if key not in env:
                raise StagingUnsafe("Binding inventory incomplete for " + name + ": " + key)
    return {
        "project": STAGING_NAME,
        "staging_domain": STAGING_NAME + ".pages.dev",
        "staging_branch": STAGING_BRANCH,
        "both_environments_binding_free": True,
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-json", type=pathlib.Path, required=True)
    args = parser.parse_args(argv)
    try:
        result = validate(json.loads(args.project_json.read_text(encoding="utf-8")))
        print("STAGING CONFIG PREFLIGHT PASS (offline only): " + json.dumps(result, sort_keys=True))
        return 0
    except (StagingUnsafe, ValueError, OSError) as error:
        print("STAGING BLOCKED: " + str(error)[:200], file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
