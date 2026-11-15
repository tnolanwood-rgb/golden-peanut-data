# Golden Peanut — current engineering checkpoint

**2026-11-15 · full-system integrity audit, PR #43 (staged; not deployed).**

Repo `main` includes the user-requested **Previous/Next-only** navigation in PR #41 and the startup/chart/search performance changes in PR #42. Both were merged and their source-level CI passed. The Cloudflare production site and private D1 were not directly accessible to this chat's tools. **Never claim deployed without an exact live artifact check.**

**Current continuation:** PR #43, branch `audit/complete-integrity-release-20261115`, contains critical private-monitor correctness repairs, 140k-record independent accounting/DST oracle, duplicate production workflow removal, exact SHA-256 live asset verifier, conditional public-asset caching, fixed manual preview branch, read-only aggregate D1 audit workflow, and tests. Check the latest PR head SHA against GitHub. Earlier attempts failed and were corrected (D1 REST rejects JSON null bind); inspect the **latest** final run, not an earlier green commit.

**Main findings:** Worker disable deleted its account row for Worker-enrolled accounts, allowing a configured GitHub secret to recreate monitoring; now retains inactive token-digest tombstone. GitHub collector's capped 2-/12-page history could be mistaken for exhaustive coverage; now marks and persists incomplete backfill. Client account switches during an async monitor fetch could corrupt status scoping; now account/key/db locked with strict event cursor and replay dedup. Existing duplicate Pages deploys had separate concurrency groups and no exact public SHA verification; consolidated in this branch. A stale manually previewed 7.16 branch was still pinned; repaired.

**Exact audit report:** `docs/audit/COMPLETE-COVERAGE-2026-11-15.md` covers P0–P12, source/data connections, risks, tests and the remaining live evidence requirements. Prior `SYSTEMS-2026-11-15.md` remains a historical checkpoint through PR #42; this file supersedes stale future-tense PR #42 labels.

**Non-negotiable preservation:** `golden-peanut-clean-v1` IndexedDB, personal transaction ledger and API key, full public quote/recipe/history/depth data, independent private D1, Trading Post orders and account-specific backups. All UI actions remain read-only. Do not fabricate unknown fills or trained probabilities from public outstanding orders.

**Full completion depends on external evidence:** a successful Pages exact-checksum deployment; successful scheduled public collector publishing `market_index.json` and 32 history shards; successful private read-only D1 checks from the repository's own secrets; and genuine held-out future trade outcomes for calibration. Physical Android performance needs device measurements and cannot be inferred from CI's emulated viewport. A live failure must remain documented, not silently skipped.

**Separate incomplete research:** `audit/competitive-exposure` draft PR #31 must not be blindly merged into this integrity release.
