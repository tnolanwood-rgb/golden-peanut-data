# Findings

| ID | Severity / certainty | Root cause and consequence | Repair / next test |
|---|---|---|---|
| F001 | Critical / CONFIRMED | `github-collector.py` caught API/D1/poll errors and returned normally. `__main__` discarded result; workflow could report successful collection after failure. Synthetic HTTP 503 exited 0 although original 10 tests passed. Secondary error-write failures could expose traceback. | P0-001, implementation `e81d770`: explicit 0/1 exit; safe failure reporting; 7 new process tests. No-key/disabled are explicit successful skips, not collection proof. |
| F002 | High / CONFIRMED | Main release-labelled 7.24 still uses `7.16.0-evidence` in integrity/release gates and package version. `pages-production.yml` checks old substring/static signatures; `pages-preview.yml` pins old 7.16 branch. Stale source can satisfy version checks; green deployment is insufficient identity evidence. | P0-002: exact source/asset/version negative tests. No production change in this batch. |
| F003 | High / CONFIRMED | `execution-engine.js` returns `calibrated:false`, while `market-board.js` marks forecasts `calibrated-24h` and `focus-edition.js` displays “CALIBRATED 24-HOUR OPPORTUNITIES”. Presentation asserts evidence the model explicitly lacks. | P3-001 (expedite as bounded follow-up after P0): uncalibrated fixture must never acquire calibrated label. No live improvement claim. |
| F004 | High / UNVERIFIED PATH | Source has private collector, D1 schema and authenticated app import. Latest inspected run logs a success marker, but no independent persisted-row/readback-to-UI proof was accessible. | P2-001. Trace bounded private observations without exposing rows/account secrets. Do not confuse this with F001 reproducer. |
| F005 | High / SUSPECTED | Current `market-board.js` has equipment/name preferences (`souvenir`, Pearl/exotic kinds); later changes may reintroduce category bias despite complete public catalogue. | P4-001 category-neutral fixtures and full trace through shortlist budgets before concluding whole categories excluded. |
| F006 | Medium / CONFIRMED | 7.16 documentation claimed no Worker, no private collector, no GitHub write access long after these existed. No durable session state; conversation-only continuation would regress current main. | P0-001 adds authoritative audit directory, AGENTS startup protocol and historical-note links. |

No real-account profitability, missing transaction count, data corruption or physical
Android defect has been proved in this batch. Those remain tests to perform, not facts.
