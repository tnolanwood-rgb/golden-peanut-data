# Latest refinement checkpoint

Implementation: c775c4ec3f0efb22cf95455941156190579e635a. STATUS: TESTED locally, not release-ready.
All source/Python/JS and NINE browser programs passed. Chart axes now use adaptive
logical widths with >=12px labels at tested phone sizes and exact tap mapping;
loading preserves modal geometry; cached OSRS reopen performs no extra request.
Confirmed manual fill feedback remains visible after form close, with duplicate
submission guard retained and purchase wording never implying realised proceeds.
Shared tokens now cover advanced-view variables/charts. No feed or accounting change.
Reviewed 320px OSRS, 390px GW2 chart and 390px advanced screenshots.

100 synthetic reduced-motion GW2↔OSRS + cached-chart cycles after five warmups:
961 DOM nodes at every sample; one mapping/latest/5m/1h/timeseries request each;
no errors, continuity marker retained, no ledger writes. Explicit-GC JS heap rose
2,865,140→3,007,264 bytes (+142,124; ~5%); no leak-free or native long-session claim.

PR #65 draft exists. Exact-head CI for prior checkpoint 0307e68 passed in run
43850320880. Current implementation CI pending. Added read-only Cloudflare inspection
metadata (source/trigger/binding presence only) on this branch; not yet run. It does
not change production settings or deploy. Next: serial corrected benchmark comparison,
read-only isolation inspection, final local/CI evidence and further acceptance work.
The previous exploratory benchmark used different static response paths between
revisions; it is superseded for acceptance by identical interception in the corrected
harness. No causal speed conclusion is supported by those old samples.

Production freeze remains in force; main/live last verified at 097f012. No merge,
deploy, APK, storage, private data, Worker/D1 or collector change. Candidate incomplete.

---

# Golden Experience — authoritative checkpoint

Date: 2026-11-16. Overall: IN PROGRESS. Candidate incomplete; release blocked.
Branch: `feature/golden-experience`. Base main/live production:
`097f012c1f912411790dd7dce21434a9cdc497d2`, unchanged at latest readback.
Tested chart implementation: `da58fbb0f8f133c92a776445eaf197cf607df133`. Design implementation: `0288a66`.
Checkpoint: `git log -1 -- docs/golden-experience/STATE.md`. PR: https://github.com/tnolanwood-rgb/golden-peanut-data/pull/65 (DRAFT, do not merge).
No production authorization. Historical audit release instructions do not apply.

GE-00: discovery/isolation and complete original baseline TESTED; real Android
measurement BLOCKED (no original device, adb/emulator/signer). All eleven Actions
inspected, Cloudflare read-only run 43847842746 confirms production branch main.
Feature branch push cannot invoke repository deploy workflows; see ISOLATION.md.
GE-01: shared tokens/surfaces/typography, native-colour preservation and immediate
CSS press feedback TESTED. GE-02/03: initial surface/Delivery Box/control polish in
progress; no accounting/storage/lifecycle/gesture-controller change.

Validation: full original baseline passed; full design baseline source/Python/JS
and all seven browser programs passed. Includes 16 viewport/font/game states,
4.5:1 financial-label contrast, >=44px buttons, no monetary/page/tab overflow,
keyboard switching and reduced motion. Swipe cases show zero vertical jump and
zero content mutations/storage writes during drag. Adapted only resized test's
fixed coordinate, which had landed in an intentionally protected search input.
Screenshots reviewed: 390px both desks and 320px doubled-font OSRS. Large-text tabs
now stack when minimum readable width requires it. All captures use synthetic data.

Evidence: evidence/ baseline/check/matrix/initial benchmark JSON; ignored artifacts
contain screenshots/logs, CI uploads nested Golden Experience artifacts.
Exploratory 10 cold +10 warm samples/game are not a speed claim: baseline ran with
concurrent checks, font-grid refinement followed initial after samples; final serial
comparison remains required. Synthetic GW2 measurement is unconnected shell only.

GE-04 rendering sub-batch TESTED: both charts now queue at most one render per
animation frame, read geometry once per contact, cancel queued work on close and
do not inspect on pointercancel. Exact final windows are unchanged (14 OSRS buckets,
11 GW2 days in the 60-event burst). Measured rebuilds: OSRS 40→1, GW2 35→1;
synthetic synchronous event-task time fell from 51.5/56.5ms to below 1ms locally.
This is a work-count result, not Android FPS. Full source/Python/JS/eight browser
programs passed after the change. No feed/history/dependency/accounting changes.

NEXT: finish GE-02/04/05/06 visual/loading/confirmation work. Preserve asynchronous
chart frame scheduling. Improve advanced-view/chart token coverage; inspect stable
loading geometry and visible confirmed-save feedback. Then repeat serial benchmark,
complete error/forms/advanced/chart screenshots and long-session/accessibility checks.
Native Android acceptance and isolated staging/release remain open blockers.

Production behavior changes: none deployed. Dev changes affect visual surfaces,
typography, focus and press feedback only. No engine, user data, account schema,
APK, origin, services, collectors or production configuration changed. Global audit
state untouched. Original OSRS v4 migration/parity/calibration remain separate work.
No candidate is frozen and no readiness declaration is warranted.
