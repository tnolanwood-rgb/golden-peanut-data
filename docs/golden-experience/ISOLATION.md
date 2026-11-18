# Production isolation evidence — 2026-11-16

## 17 Nov — current main drift and API-correct staging-host guard
Read-only GitHub main is `02f0e8640b5a22be590f55e9598937cb3f6e7161`, one public-market-data snapshot commit ahead of `097f012`. The complete diff only includes data/market JSON and shards, **no app/**; preserve the collector's independent maintenance. Could not independently read production hosted build-info in this continuation. No production deployment was performed by Golden Experience.
Cloudflare Pages' documented project `subdomain` is its default pages.dev host; `domains` lists *custom* domains. Offline staging guard now requires exact independent `subdomain=golden-experience-staging.pages.dev` and explicit inspected custom-domain inventory (an empty array is valid), while rejecting production name/branch/host, Git-linked auto-deploy and unknown or private bindings. No real Cloudflare staging project created, viewed or deployed, no production credentials touched.


## 16 November — stricter offline independent-domain gate, no staging deployment
The offline staging validator at 2434543 now rejects an empty domains list; synthetic test 3d5915b confirms this missing-domain case is blocked. Staging must explicitly report the exact `golden-experience-staging.pages.dev` host in addition to excluding the live domain/branch/project, unknown config, Git auto-deploy and all nonempty private bindings. This is a fail-closed local test only, **not proof that a real Cloudflare staging project exists**. No Cloudflare production/staging deployment or original app modification occurred.


## Cloudflare staging configuration refusal guard — 16 November
An offline guard now requires a distinct `golden-experience-staging.pages.dev` identity, branch `golden-experience-staging`, no unexpected domain, no Git-linked auto-deploy source and explicitly empty production/preview private resource bindings. Unknown nonempty config fails closed. This is inspection-only: no new project has been created or deployed, and no production tokens, D1 schemas or original website settings were touched. Require real Cloudflare readback before any staging deployment.


## 16 November 2026 — isolated emulator now TESTED, not production acceptance
Source `e538b648d1d2d48eb360b8615f7fbd8707b73486`, [Actions 43965081137](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43965081137) SUCCESS, package `com.goldenhub.dual.preview`, Android 35 Google APIs ephemeral emulator. Root-only GitHub Actions contents: read, no Cloudflare secrets/bindings/deploy/Workers/D1, no original Android app package or owner user data. Native swipe, rotation and resume test report/screenshots artifact 14277315133. Full source CI and APK verify at same source passed. User's physical installation and separate Cloudflare synthetic staging remain untouched/unverified, and must not be conflated with emulator proof. Main independently read at `097f012c1f912411790dd7dce21434a9cdc497d2`.


## Preview-only Android emulator (new CI pending)
Workflow golden-experience-emulator.yml uses GitHub contents: read, pinned public emulator action and a fresh runner. Only package com.goldenhub.dual.preview is built/installed; its debug WebView exposes CDP for test inspection, while release builds remain non-debuggable. No Cloudflare production deploy, credentials, D1 writes, production package, user storage, signing or backend configuration is in scope. Physical device proof and synthetic Cloudflare staging are separate outstanding gates.


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


## 18 Nov 2026 — exact PR head and current external boundaries
PR #65 head `cca17780315ca8c923f3506edb931fc586d1ff99`: regression/audit #430, Android 35 emulator #59 and separate preview APK #91 all pass. Main is exactly `41e3ef709059922ccae7f7e5570ac7764eeb3817`; no drift at this checkpoint. The branch contains a fail-closed `pages-preview.yml` inspection/deploy workflow, but no successful feature-branch Cloudflare inspection is recorded. The last real Cloudflare readback is historical and identified only the production project `thegoldenpeanut`; it does not establish a separate staging project. No staging deployment or hosted rollback has occurred. The workflow push trigger only runs an inspection when its own workflow file changes; the protected manual dispatch still requires an authorized GitHub UI/account action. No Cloudflare secrets or account access are exposed to this assistant connection.

Physical device and current installed package/signer/storage remain unverified. The old minimal WebView wrapper and bundled Capacitor APKs differ; do not assume site deploy updates bundled app copies. AOSP framebuffer is black. No production mutation, merge, deployment, Worker/D1 write or APK install occurred.
