# Resume — current 2026-11-15

1. Read `AGENTS.md`, `docs/audit/STATE.md` and `docs/audit/SYSTEMS-2026-11-15.md`. Repository main includes user-requested Skip removal PR #41; no production site verification claimed.
2. Review draft PR #42 head `audit/fast-ui-and-intelligence-20261115`. It integrates compact startup metadata, chart shards, search/redraw coalescing, guarded fallback and tests. Check exact commit SHA and GitHub CI logs/artifacts: source, Python, Node, Chromium 390/1440 and actionlint, synthetic payload report. Do not merge failing/unverified code.
3. Test data collector `scripts/public_market_snapshot.py` and `.github/workflows/public-market-data.yml`: five coherent generation files plus 32 shards; source counts equal (no partial quotes, silent dropped IDs, bogus volume). Publish safely only through existing workflow.
4. Before any performance claim, run repeated production-equivalent Android cold/warm loads, item search and chart opens; capture network payload bytes and p50/p95. Verify that API key, account scoped history, saved research and detailed view are unaffected.
5. Never change private D1, account credentials, history retention, wallet/Trading Post orders, analytical evidence gates or collector secrets while optimising presentation. An audit of real D1 live observation coverage remains blocked on authenticated readback.
6. Private long programme PR #31 remains separate. New UI code follows previous QA fixes and must not silently merge the incomplete model work.

Historical QH-001 2026-11-09 snapshot material remains in other audit files. Don't follow old unreconciled release instructions as current state.
