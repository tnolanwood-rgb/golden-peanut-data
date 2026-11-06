# Deployment / rollback — 7.16

No production deployment was performed. The environment has GitHub repository access
but no Cloudflare API token, account/database IDs, or verified Pages project name.
The existing Worker source/configuration is absent from GitHub and both supplied ZIPs.
This release does not change that Worker or D1 schema.

## Before changing the existing site

1. In the current app, export a safety backup and verify the downloaded `.json.gz`
   file exists. It contains private account data and potentially the API key.
2. Keep the existing Pages production hostname. Browser history and credentials are
   scoped to origin; a preview URL/new project cannot automatically access them.
3. Review and merge the development PR. Do not enable deployment of personal exports.

## Enable public data

In GitHub Actions, run **Golden Peanut — Full Public Market Snapshot** on `main`.
The workflow needs contents-write permission. It uses no personal key. Verify its
successful commit contains all four `data/market_*.json` files with the same
`generation`, `quotes_complete: true` and explicit `missing_metadata`/depth coverage.
The existing D1 workflow continues to use the already-configured `CF_API_TOKEN`,
`CF_ACCOUNT_ID`, `CF_DATABASE_ID`; do not replace those secrets or the database.

```sh
gh workflow run public-market-data.yml --repo tnolanwood-rgb/golden-peanut-data --ref main
gh run list --repo tnolanwood-rgb/golden-peanut-data --workflow public-market-data.yml
```

Allow at least five elapsed daily observations before the new stability gate can
qualify a market from this feed; the app may use a sufficiently recent labelled
public fallback. Never synthesize five days by running the workflow five times.

## Publish the app to the existing Pages project

For a Git-connected Pages project, use production branch `main`, build command
`python scripts/check_release.py` only if the build environment installs PyYAML and
Node; otherwise use no build command and rely on required PR CI. Set build output
directory **`app`**. Do not set the whole repository as the output directory.

For direct upload, sign in with the normal Cloudflare CLI or configure
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in your trusted shell. Then:

```sh
# This read-only command identifies the existing project; its name was not available here.
npx wrangler@4 pages project list
# Set GP_PAGES_PROJECT to that existing project name, then deploy the reviewed app.
npx wrangler@4 pages deploy app --project-name "$GP_PAGES_PROJECT" --branch main
```

An upload-ready ZIP can be created with `python scripts/package_release.py`; upload
its contents using the existing Pages project's direct-upload flow if supported by
that project. The ZIP root contains `index.html`, `_headers` and the JS/CSS/assets.
Never upload the separate collector ZIP as a Pages site. No D1 migration is needed.

## Production verification

- Hard reload and confirm `7.16.0-evidence · components verified`.
- Confirm the existing ledger count, account, saved goals and open orders remain.
- Use a GW2 API key with `account`, `tradingpost`, `inventories`, `characters` access
  for complete learning. No key needs game-order write access; no such operations exist.
- Refresh account/history. Confirm wallet and inventory freshness. Missing scopes
  should leave recommendations in Research and preserve history functionality.
- Search a previously untraded item, use catalogue pagination, inspect Orders and
  Legendary Planner on mobile. Verify no horizontal overflow.
- Confirm new empirical forecasts remain absent until real comparable cohorts meet
  the documented evidence requirements. A public scan alone must not produce them.
- Export and verify a new private safety backup after real observation collection.

## Rollback

Use Pages' deployment history to roll back to the previous 7.15 deployment on the
same origin. Existing database name/version was not changed and no stores were
removed. The new learning config key is additive. Keep the new backup; older builds
will ignore the new learning key. The public workflow is independent and backward
compatible with the eight-column 7.15 feed. Disable only that new schedule if needed;
do not disable/delete the existing background collector or D1 database.

## Still requires live access / further implementation

- Verify the actual production Pages project and Worker/D1 health after credentials
  are provided; no live private data or production deployment was accessible here.
- Observe prospective personal 24-hour cohorts and evaluate real held-out outcomes.
  This release does not establish improved live accuracy.
- Always-on private collection, learned censoring/queue/crafting-supply effects and
  a globally optimized multi-cycle capital allocator are not delivered in this stage.
  The simple model withholds recommendations where its data assumptions fail.
