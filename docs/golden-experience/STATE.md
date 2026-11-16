# Golden Experience — authoritative checkpoint

Date: 2026-11-16. STATUS: IN PROGRESS. Release incomplete; no implementation approval.
Branch: `feature/golden-experience`. Draft PR: https://github.com/tnolanwood-rgb/golden-peanut-data/pull/65
DO NOT MERGE / DEPLOY / ENABLE AUTO-MERGE. Historical global audit release authority
is superseded by this project's production freeze. Global audit files are untouched.

Tested implementation: `51e95269e3cbfd5873e9772539160f8ef28bafc9`.
Source tree: `181340c1cc538feedd27f6e7034b60fdf8e8a656`.
Checkpoint commit: `git log -1 -- docs/golden-experience/STATE.md`.
This identifies intermediate tested code, NOT a frozen release candidate.
Base/main/live production: `097f012c1f912411790dd7dce21434a9cdc497d2`.

## Completed tested source batches

- Permanent BRIEF, preservation map, roadmap, decisions, tests, performance/release
  documents and resumable checkpoints. Production isolation inspected before branch.
- Shared design tokens/surfaces/type/spacing/focus/press response for both desks;
  Delivery Box hierarchy retained; official colours, currencies and framed icons
  preserved. Premium layer is appended to dual-hub.css, avoiding an extra stylesheet
  request. No new runtime dependency, storage schema or native requirement.
- Both SVG chart engines coalesce pointer work to one render per animation frame,
  cache gesture geometry and avoid point selection on cancel. Exact data/windows
  preserved. Adaptive canvas widths keep tested phone axes >=12px; exact tap mapping,
  stable loading modal and cached OSRS reopen tested.
- Successful manual OSRS fill feedback remains visible after the form closes and
  only appears after durable validated save. Existing duplicate guard/FIFO/tax and
  purchase-vs-realised wording preserved. No in-game actions introduced.

## Evidence and limits

Full original and each implementation baseline passed source, 56 Python, 129 JS
and all NINE current browser programs. Final local report: evidence/consolidated-checks.json.
Asset hashes and unchanged dependency lock: evidence/implementation-identity.json.
16 game/viewport/font/reduced-motion states plus chart loading/cache/axes, keyboard,
financial contrast, touch targets, overflow, lifecycle/backup/owned-sale/stats tests.
Reviewed main desks, narrow doubled-font OSRS, phone charts and advanced GW2 entry.
All principal populated-account/forms/error/research states are not yet accepted.

Both original/current sources passed 26 swipe cases at 4× Chromium CPU throttle,
zero visible Y discontinuity and no active-drag content mutation/storage writes.
60-event chart burst: 40 OSRS /35 GW2 rebuilds before, one each after, exact final
windows unchanged. These are synthetic browser measures, NEVER phone FPS claims.
100 accelerated cached-navigation cycles: DOM961 throughout, one request/feed,
continuity sentinel retained, no ledger writes/errors; explicit-GC heap +~5%.
No hours-long memory, real WebView, CPU/battery or hardware lifecycle proof.

Corrected serial 10 cold +10 warm runs/game, identical asset interception:
ready median/p95 ms baseline→current: GW2 cold611/797→550/674, warm230/293→244/305;
OSRS cold671/726→645/798, warm190/311→198/307. Mixed tails: no universal speed or
no-regression claim. OSRS cold p95 needs follow-up profiling. p95/p99 choose the
maximum at n=10; GW2 useful-content measure is the unconnected desk shell only.
All raw samples/hashes/conditions committed; old exploratory results are superseded.

CI: exact tested implementation 51e9526 passed run 43852759439 (all source/Python/JS/
nine browser programs, repeated-session probe and actionlint). Full step evidence:
evidence/ci-51e9526.json. A documentation-only checkpoint follows that tested source;
no runtime assets changed. Check the PR's latest actual checks on resume.

## Isolation and production verification

All eleven Actions inspected. Feature pushes match no deploy trigger. Read-only
Cloudflare run 43851667207 confirms production main, source_type=null, no listed
preview/production D1/KV/R2/service/durable-object/environment bindings; all deploy
steps skipped. Sanitized evidence committed. No production deployment, merge,
release-request edit, private-data access, original APK/origin/storage alteration,
Worker/D1/collector/monitor configuration change. Protected paths diff empty.
Latest main and live build-info still identify097f012. Separate staging not created.

## First unfinished work and blockers

1. GE-07: profile/trace repeated OSRS cold-start tail with identical/rerandomized
   conditions; measure press p95, navigation/scroll/large-history chart costs and
   longer memory behavior. Keep distributions/limitations, no cosmetic workaround.
2. GE-02/03/08: complete populated-account, expanded Delivery Box, forms, errors,
   research/settings/history/backup and chart visual/accessibility acceptance at
   small/large/landscape/large-font/reduced-motion/slow/offline states. Existing
   trading workflows remain; do not rewrite engines or existing swipe fixes.
3. BLOCKED hardware: original installed Android WebView cold/warm/resume/rotation/
   process restoration/Back/long-session tests and real device performance. No adb,
   emulator, original package/signer or physical device available in this session.
4. GE-09/10: distinct synthetic staging project without private bindings/write
   access; integrate main fixes, complete acceptance, freeze exact candidate and
   prepare/rehearse controlled release/rollback/live verification. Not yet done.

Haptics are not enabled; repository QA wrapper has no vibration permission/bridge,
original wrapper support unverified. Preserve graceful no-haptics with no APK or
permission change. OSRS v4 parity/import and real-world calibration remain separate
unfinished audit work, not silently included or declared solved.
