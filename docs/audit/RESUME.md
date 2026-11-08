# Resume — competitive acquisition repair

Read AGENTS.md and STATE.md. Repository tnolanwood-rgb/golden-peanut-data, branch
`audit/competitive-exposure`, draft PR https://github.com/tnolanwood-rgb/golden-peanut-data/pull/31.

1. Fetch/status; check PR #31 newest CI and merge state. Base main 0aae3f1;
   implementation 11f556619b7da859e51ffac5610e9efb11f3d6a0. Previous 4f22f02 CI
   42429705868 passed. Local clean full suite passed CE-002; new remote CI pending.
2. CE-001 removes unpriced-night research overrides. CE-002 connects GitHub priced
   cohort snapshots -> private D1 -> authenticated relay -> atomic item/day storage
   -> detail diagnostics. Original accounting/Delivery Box/browser checks pass.
   Replay/concurrency/rollback/migration/backup/large-read tests pass. NOT deployed.
3. Next **CE-003a**: reproduce inactivity bias in opportunity-engine.findQuantity
   and activeBookScenario ageScale; replace unsupported age/lot caps, preserving
   uncertainty, independent resale and capital conservation. Do not turn sampled
   rates into guaranteed capacity. Full 15-scenario acceptance is still incomplete.
4. Then CE-003 maintenance scenarios/portfolio rankings and CE-004 walk-forward
   testing/release. Actual background D1 readback remains unverified. Worker-native
   polling is unpriced; GitHub collector path is the implemented priced source.
5. CE-002-DEPLOY.md has exact migration/release sequence. No deployment or merge
   during this checkpoint. Check only relevant COMPETITIVE-REPAIR/EVIDENCE sections;
   do not repeat completed discovery audit. Preserve data and commit/push bounded work.
