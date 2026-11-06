# The Golden Peanut 7.16 — evidence-based 24-hour trading research

Cloudflare Pages application in `app/`, public GW2 collector in `scripts/`, and
existing Cloudflare D1 collection workflows. No game orders are placed or changed.

This development release replaces the primary ranking with an empirical joint
purchase-and-resale baseline. It funds only exact lot sizes supported by comparable
prospective 24-hour observations, including zero fills. Otherwise it displays
**Research — insufficient execution evidence**. Its accuracy is not yet established.

- [Engineering audit and actual validation results](docs/ENGINEERING_AUDIT.md)
- [Model, data contracts and research](docs/MODEL_AND_DATA.md)
- [Exact deployment and rollback steps](docs/DEPLOYMENT.md)
- [Public collector setup](README_DATA_SETUP.md)
- [Source attribution](docs/SOURCES.md)

## Local checks

```sh
npm ci --ignore-scripts
python -m pip install PyYAML==6.0.3
npm run check
python -m unittest discover -s tests -p 'test_*.py' -v
npm test
npx playwright-core install --with-deps chromium
npm run test:browser
```

The browser test uses the assembled application and synthetic HTTP/account fixtures.
It proves application behavior, not live trading returns. Serve `app/` on localhost
or HTTPS; IndexedDB and compressed backups need a browser with secure-context APIs.

## Data separation

Public files contain public GW2 quotations, metadata, recipes and outstanding
order-book quantities only. Personal API keys, holdings, completed transactions,
learning cohorts and backups stay in the user's browser/downloads. Never commit
personal exports. The stable IndexedDB name is `golden-peanut-clean-v1`; keep the
same Pages production origin to retain existing data.

The original D1 workflow remains unchanged. No D1 migration is required by 7.16.
