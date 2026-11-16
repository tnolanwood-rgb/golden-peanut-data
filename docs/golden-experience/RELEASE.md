# Protected release and rollback — INCOMPLETE, DO NOT EXECUTE

Owner has NOT authorized implementation. No candidate is frozen. No merge/deploy,
release-request edit, Worker/D1 action, APK replacement or production-data migration.
Only the owner's **Implement**, after an evidence-backed final readiness report,
authorizes the prepared production operation.

Release architecture: prefer existing same-origin static assets, keeping installed
APK/package/signer, `https://thegoldenpeanut.pages.dev/`, IndexedDB/config/ledger and
all services unchanged. Existing guided-ui-production.yml checks main/project,
runs source/Python/JS/browser checks, embeds exact source commit, deploys app/, checks
every asset SHA-256 and runs live swipe smoke. It auto-deploys main app changes;
therefore no merge before final authority. Existing rollback is frontend-only revert
through the tested pipeline; never clear storage or roll back account databases.

Before readiness, implement/test a controlled release wrapper and record:

1. Frozen candidate commit/tree, lockfile hash, complete asset manifest, all tests
   and isolated synthetic staging URL/deployment identity.
2. Exact current production source/assets and last known good bundle/hash manifest.
3. Drift check against main/live identity; incorporate any intervening fixes in dev,
   rerun affected/full acceptance, freeze replacement candidate before approval.
4. Isolated staging deploy + exact hash/functional verification and rollback rehearsal.
5. Explicit authorization gate; single prepared release invocation with fail-closed
   preflight, compatible same-origin assets and postdeploy live-host verification.
6. Critical-smoke failure detection and immediate prepared frontend rollback, verifying
   old assets and both games without account mutation; report deployment identity.
7. Monitoring and all remaining platform/external failure limitations.

Staging is not yet configured. Full Pages source/build settings, preview write
isolation and production wrapper compatibility need evidence. Do not reuse private
monitor credentials/CORS or bind staging to production D1. No readiness declaration
or deployment command is authorized by this document.

## Current preparation checkpoint

Intermediate implementation 51e95269e3cbfd5873e9772539160f8ef28bafc9/tree 181340c1cc538feedd27f6e7034b60fdf8e8a656
has37 source distributable assets (generated build-info adds one at deployment),
exact hashes and unchanged lock identity in evidence/implementation-identity.json.
This is NOT the final candidate manifest. Main/live 097f012 is the current predecessor,
not a permanently pinned rollback target; recheck intervening releases at readiness.
No staging, frozen candidate or executable rehearsed release operation exists yet.
Original package/signer unavailable; source repository Android package is separate
QA and must never be substituted for installed-app compatibility proof. No native
source change required by current web implementation. All production data protected.
