# Golden Peanut — current engineering checkpoint

**2026-11-15 · source audit and performance engineering, staged PR #42.**

Production branch `main` includes **PR #41** (Previous/Next only, no Skip) at commit `993b94bd937220f73e6a9ff72e9e9ffb07358432`. A separate fix in that PR preserved actively edited capital budgets during background repaint. Its final GitHub regression checks passed. The Cloudflare served production deployment and physical Android behaviour were **not independently verified**.

**Do not merge broad audit work automatically.** Draft PR #42 on `audit/fast-ui-and-intelligence-20261115` holds startup metadata compaction, chart-history slicing, HTTP cache revalidation, chart request coalescing, search render coalescing, guided board caching, source/collector parity tests, synthetic benchmarks and the complete system-lineage audit. Review and verify green tests for its final head SHA. The new files only exist on the live data branch after a successful `.github/workflows/public-market-data.yml` run; the app safely falls back before that. No benchmark based on a physical phone has been run.

**First priority on resumption:** run/review exact head SHA CI for #42; inspect failing job logs and artifacts, not just workflow status. Confirm starter index and 32 history shards publish atomically with their same generation. Review no missing lookups, invalid stats, missing charts or credential leaks. Then compare actual served Cloudflare assets, collector execution and physical Android cold/warm startup before release/performance claims.

**Current evidence:** See `docs/audit/SYSTEMS-2026-11-15.md` for complete source → importer → storage → consumer matrix and unresolved P0/P1/P2/P3/P8/P10 findings. `docs/audit/PERFORMANCE.md` differentiates synthetic Node timings from Android. `docs/GUIDED_VIEW.md` has original guided navigation defect reasoning.

**Non-negotiable preservation:** `golden-peanut-clean-v1` IndexedDB, all user-ledger/account-scoped keys and completed trades, optional monitor consent, Trading Post orders, existing public quote/history/recipe/depth sources, existing read-only models. Never infer execution volume from public outstanding order quantities or use unsupported historical activity to present a calibrated 24h forecast. No active-order placement or cancellation.

**Separate long-running audit:** `audit/competitive-exposure`, draft PR #31 (CE-003c model, incomplete); do not merge it into a UI/performance release without causal proof.

**Prior state:** The 2026-11-09 QH-001 invisible-footwear quote/bulk-profit defect and its previous release discussion are archived in `docs/audit/FINDINGS.md`, `EVIDENCE.md` and `QH-001-baseline.json`. Old instructions in the prior checkpoint were superseded by the later PR #41 and this staged audit.
