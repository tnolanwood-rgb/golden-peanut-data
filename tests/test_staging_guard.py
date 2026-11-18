"""Six synthetic tests; no Cloudflare calls or production data."""
import importlib.util
from pathlib import Path
import unittest

SOURCE = Path(__file__).resolve().parents[1] / "scripts" / "staging_guard.py"
spec = importlib.util.spec_from_file_location("staging_guard", SOURCE)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


def fixture():
    env = {"d1_databases": {}, "kv_namespaces": {}, "r2_buckets": {},
           "services": {}, "durable_object_namespaces": {}, "env_vars": {},
           "compatibility_date": "2026-11-16"}
    return {"success": True, "result": {
        "name": "golden-experience-staging",
        "production_branch": "golden-experience-staging",
        "source": None,
        "subdomain": "golden-experience-staging.pages.dev",
        "domains": [],
        "deployment_configs": {"preview": dict(env), "production": dict(env)},
    }}


class StagingGuardTests(unittest.TestCase):
    def test_approved_synthetic_staging_project(self):
        self.assertTrue(mod.validate(fixture())["both_environments_binding_free"])

    def test_production_identity_and_branch_blocked(self):
        for field, value in (("name", "thegoldenpeanut"),
                             ("production_branch", "main"),
                             ("source", {"type": "github"})):
            with self.subTest(field=field):
                sample = fixture()
                sample["result"][field] = value
                with self.assertRaises(mod.StagingUnsafe):
                    mod.validate(sample)

    def test_production_domain_and_unknown_domains_blocked(self):
        for domains in (["thegoldenpeanut.pages.dev"],
                        ["golden-experience-staging.pages.dev", "userdomain.co.uk"],
                        None):
            sample = fixture()
            sample["result"]["domains"] = domains
            with self.assertRaises(mod.StagingUnsafe):
                mod.validate(sample)

    def test_missing_or_wrong_default_subdomain_blocked(self):
        for subdomain in (None, "", "thegoldenpeanut.pages.dev",
                          "golden-experience-staging.pages.dev.evil.example"):
            with self.subTest(subdomain=subdomain):
                sample = fixture()
                sample["result"]["subdomain"] = subdomain
                with self.assertRaises(mod.StagingUnsafe):
                    mod.validate(sample)

    def test_all_private_binding_kinds_blocked_in_both_environments(self):
        keys = ("d1_databases", "kv_namespaces", "r2_buckets", "services",
                "durable_object_namespaces", "env_vars", "queues", "hyperdrive")
        for mode in ("production", "preview"):
            for key in keys:
                with self.subTest(mode=mode, key=key):
                    sample = fixture()
                    sample["result"]["deployment_configs"][mode][key] = {"PRIVATE": "binding"}
                    with self.assertRaises(mod.StagingUnsafe):
                        mod.validate(sample)

    def test_unknown_config_blocked_and_documented_optional_bindings_safe(self):
        sample = fixture()
        sample["result"]["deployment_configs"]["preview"]["future_secret"] = {"x": 1}
        with self.assertRaises(mod.StagingUnsafe):
            mod.validate(sample)
        sample = fixture()
        del sample["result"]["deployment_configs"]["production"]["d1_databases"]
        self.assertTrue(mod.validate(sample)["both_environments_binding_free"])
        for key in ("ai_bindings", "browsers", "hyperdrive_bindings",
                    "mtls_certificates", "queue_producers", "vectorize_bindings"):
            sample = fixture()
            sample["result"]["deployment_configs"]["preview"][key] = {"PRIVATE": "binding"}
            with self.assertRaises(mod.StagingUnsafe):
                mod.validate(sample)

    def test_missing_environment_and_unverified_response_blocked(self):
        sample = fixture()
        del sample["result"]["deployment_configs"]["preview"]
        with self.assertRaises(mod.StagingUnsafe):
            mod.validate(sample)
        sample = fixture()
        sample["success"] = False
        with self.assertRaises(mod.StagingUnsafe):
            mod.validate(sample)


if __name__ == "__main__":
    unittest.main()
