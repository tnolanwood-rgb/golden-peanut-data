# CE-002 deployment sequence (prepared, not executed)

Branch audit/competitive-exposure / draft PR #31. Full acquisition repair remains
partial; do not describe this evidence pipeline as a completed forecasting release.

1. Review/complete the intended release scope, obtain green latest PR CI and merge
   through the existing repository process. User has authorised a verified repair
   deployment; no release-request files have been changed in this batch.
2. On the merged release SHA, run the existing **account-monitor-deploy.yml**
   workflow via workflow_dispatch. It applies services/account-monitor/schema.sql
   before deploying the private Worker, using existing Actions secrets. The new
   gp_monitor_exposure table/index is additive; existing tables/data are preserved.
   Do not reset MONITOR_ENCRYPTION_KEY or credentials.
3. Run **private-account-collector.yml** manually on that SHA (or allow its existing
   half-hour schedule). Confirm competitive exposure coverage status and successful
   D1 persistence. Public quote failures are recorded as unavailable, not zero fills.
   Schema absence explicitly reports schema-migration-required and leaves the old
   collector functioning; it does not establish successful priced monitoring.
4. Authenticated /exposure?after=0 readback must return only the requesting account,
   timestamped batches, truthful sample/quote coverage and advancing cursor. Repeat
   the read to verify idempotent import. Keep API keys out of URLs, logs and fixtures.
   No credentials are available locally to perform this private verification.
5. Run **pages-production.yml** via workflow_dispatch on the same verified SHA.
   Check actual live bytes for HTML, competitive-exposure.js, account-monitor-client.js,
   execution-engine.js, focus-edition.js, capacity-intelligence.js and market-board.js.
   In the authenticated app, refresh twice and verify no duplicate exposure, correct
   account scope and unchanged accounting/Delivery Box. Then close phone for multiple
   polls and verify imported background observations on return.
6. Rollback: redeploy prior Pages/Worker revision if necessary; retain the additive
   D1 table and IndexedDB config shards. No destructive down migration or history
   deletion is required. Legacy competitive-exposure-v1 values remain for recovery.

Limits: only GitHub polling produces priced batches; Worker-native polling reports
worker-unpriced. The UI reads recent 90 days / at most 10,000 samples, explicitly
labels partial views and retains older data. The legacy quantity model is CE-003.
