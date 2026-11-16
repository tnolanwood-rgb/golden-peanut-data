# Production isolation evidence — 2026-11-16

## 16 November — preview APK verification did not cross the production boundary
PR #65 DRAFT source `bf84c76e5d4ad68c99cd3fafa3c1235777a4e9e8`: [Android workflow 43941763186 PASS](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43941763186) used GitHub Actions to build `com.goldenhub.dual.preview`, package/check 37 static app assets and upload an artifact. It did **not** install an APK, use a production signing key, publish a Cloudflare site, merge main, invoke Worker/D1 operations or touch the existing package. [Source/browser CI 43941763243 PASS](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43941763243). Current main held at `097f012c1f912411790dd7dce21434a9cdc497d2`. This is packaging isolation only: staging Cloudflare synthetic environment and physical device isolation tests still OPEN.


Inspected all eleven `.github/workflows/*.yml` before branch creation. Actual main
and live `/build-info.json` both identified `097f012c1f912411790dd7dce21434a9cdc497d2`.
Production run [43836621817](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43836621817)
completed successfully; job 133194731236 confirms project/branch validation, source/
browser checks, deployment, exact hashes and hosted touch smoke steps passed.

Read-only existing workflow `pages-preview.yml`, operation=inspect on main, run
[43847842746](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43847842746),
job 133232443837, directly queried Cloudflare Pages. Output: `thegoldenpeanut
[production branch: main]`; `No deployment attempted`. Checkout/validation/deployment
steps were skipped. No project settings or data changed.

| Workflow | Trigger / impact on this branch |
|---|---|
| guided-ui-production | main push paths app/release request/workflow, manual; job additionally requires refs/heads/main. This branch cannot invoke production through push/PR. |
| account-monitor-deploy | main monitor-request push or manual; job main-only; do not dispatch |
| private-readonly-audit | main audit-request push or manual; do not dispatch for redesign |
| public-market-data | scheduled/default branch, main snapshot-request push, manual; untouched |
| Background Collector | schedule/manual; untouched |
| private-account-collector | schedule/manual; untouched |
| private-dual-hub-preview | push only feat/private-dual-game-hub-20261115 or manual; no match |
| private-hub-android | Android-path PR / old preview branch push / manual; no native changes planned |
| pages-preview | manual only; only inspect used; do not deploy through this project |
| ci | PR/manual, read-only checks; no release step |
| gw2-test | manual public API probe; unused |

Cloudflare confirms main as production branch: non-main Git builds, if enabled,
cannot replace that production branch. Do not dispatch any deploy workflow or open
a staging environment until its data/credentials/bindings are separately checked.
Development uses local synthetic fixtures. Repository webhooks API returned 403;
arbitrary external hooks and full Pages Git-source/build settings were not visible.
This is a recorded limit, not an assertion those settings were inspected. Reinspect
before staging/release. No production-secret access outside existing read-only job.

Freeze verification: record live build identity and remote main before/after each
checkpoint; changes from independent maintenance must be identified, never reverted.
Do not edit global audit state, production release requests, Workers/D1/collectors or
original Android package/signing/origin. Never merge or enable auto-merge.

## Expanded read-only inspection

Run43851667207 at f05a47f, job133245493740, operation=inspect: Cloudflare Pages
production branch main, source_type=null and no listed preview/production D1/KV/R2/
service/durable-object/env bindings. Git trigger fields null with no source reported.
Checkout/validation/deployment skipped. Sanitized result:
evidence/cloudflare-isolation.json. Existing main workflow unmodified; only this
branch's inspect output was expanded, never settings. This strengthens the earlier
limited branch evidence; it does not authorize deploying into the production project.
New staging still requires a distinct project/origin with no private write access.
