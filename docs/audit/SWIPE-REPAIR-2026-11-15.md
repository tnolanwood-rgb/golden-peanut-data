# GW2 ↔ OSRS navigation repair

Status: **DEPLOYED AND AUTOMATICALLY VERIFIED** at the existing production origin.
PRs #58 and #59 are merged; final production commit is
`99fcd36ac9eed80a56362f8a5de465052a5367f2`. Physical Android acceptance remains
separate from the browser and asset verification below.

The user reported visible jumps, shifts and snapping after merged PR #57, including
when starting a horizontal swipe inside the OSRS recommendation scroller. The
requested delivery is a verified repair at the existing production origin,
`https://thegoldenpeanut.pages.dev/`, through its existing Cloudflare Pages workflow.
The screen recording `38594.mp4` was unavailable in this session; the user confirmed
they could not attach it. No claim here depends on viewing that recording.

## Reproduction and measured failure

The new acceptance harness uses Chromium's native touch injection and samples the
rendered geometry on animation frames. It checks both full-page sheets while the
finger is down and through the final layout/scroll handoff. This differs from
dispatching a sequence of JavaScript PointerEvents and asserting inline transforms.

The previous implementation was replayed against the same acceptance test:

```sh
SWIPE_ASSET_REF=dd868f7 SWIPE_OUTPUT=artifacts/audit/swipe-before node tests/swipe.browser.cjs
```

At a 390 × 844 mobile viewport, OSRS had document scroll 480px and GW2 had scroll
120px. The first slow native OSRS → GW2 swipe failed: the incoming header moved
vertically **360px** at completion. Its 62 sampled frames included 56 active frames,
a 16.7ms frame-interval p95 and no intervals above 34ms. Smooth frame delivery alone
therefore did not establish smooth navigation. Panel adjacency was within 0.001px;
the discontinuity was in scroll geometry rather than horizontal panel separation.

An earlier diagnostic using the live-content layout and an empty GW2 account view
reproduced a **480px** jump from OSRS scroll 480px to GW2 scroll zero. Both
reproductions ran in desktop Chromium mobile emulation, not a physical WebView.

The baseline laid the incoming page out at the outgoing game's document scroll,
then restored the destination's independent scroll only after the slide. The
incoming content therefore changed viewport Y at the final frame. Previous tests
could pass because they checked gesture state, inline transforms and eventual
game selection without asserting continuity of rendered viewport coordinates.

## Repair and audit decisions

- **Position and scroll handoff:** compensate the incoming sheet's top for the
  difference between the games' scroll positions, maintain a stable document
  extent during movement, and apply the final layout/scroll handoff in one task.
  Capture the outgoing GW2 resume before hiding it. Preserve nested scroller positions separately and restore them before painting
  the incoming view. Keep both games mounted throughout navigation.
- **Input ownership:** keep Pointer Events as the primary movement stream before
  native touch slop. Use an exclusive Touch Events fallback when Pointer Events
  are cancelled or unavailable, rather than processing the same movement and
  velocity sample twice. Retain horizontal/vertical axis lock and native vertical
  scrolling inside the OSRS recommendation box.
- **Completion and interruption:** resume from the currently rendered compositor
  position when a new gesture interrupts settling. Share one animation timeline
  origin, reject stale completion callbacks, clamp dragging at the valid page
  boundary, and derive velocity from event timestamps. Retain the existing
  145–315ms duration range; longer animation or extra easing is not the repair.
- **Startup and asynchronous work:** prepare cached startup content before the
  first gesture. Defer OSRS JSON processing, ranking, persistence and rendering
  during navigation. Defer affected GW2 guided, Focus and legacy DOM work as well,
  including pending search/review timers and nested section appends. Resume
  pending work after navigation; do not discard account or market records.
- **Lifecycle and saved state:** cancel or finish navigation before saving on
  lifecycle interruptions. Invalidate obsolete delayed scroll restoration after
  user interaction. Keep item selection, chart state, form drafts, account data,
  ledgers and per-game scroll state in their existing storage locations.

The scope excludes APK replacement, package/signing changes, storage namespace
changes, API credential changes, in-game orders, and a new production origin.

## Automated verification

Completed during implementation:

| Check | Observed result | Conditions |
|---|---|---|
| Existing JavaScript suites (`npm test`) | 129 passed; no skipped or cancelled tests | Synthetic fixtures; working tree |
| Existing Python suites (`python -m unittest discover -s tests -p 'test_*.py' -v`) | 56 passed; no skipped tests | Existing suite; no private production writes |
| Release integrity (`python scripts/check_release.py`) | Passed, including 38 JavaScript programs, Python, YAML/heredocs, assets, manifest, version and credential guards | Working tree |
| Existing three browser programs | Passed during implementation | Desktop/mobile Chromium; synthetic data |
| New native-touch acceptance harness against `dd868f7` | Failed as expected on a measured 360px vertical discontinuity | Same acceptance assertions as the repair |
| Native-touch cases and per-move tracking assertions | 26 passed | 4,002 synthetic mappings; 390×844 and 412×915 plus orientation interruptions |
| Full local baseline (`scripts/audit_baseline.py`) | VERIFIED | Source, 56 Python, 129 JavaScript, all four browser programs; remote exact-head CI pending |

The native-touch coverage includes slow drags, quick flicks, held fingers,
cancellation, reversal, settling interruption, nested-card horizontal and vertical
gestures, orientation changes and repeated/rapid switching. Geometry assertions
check vertical continuity and panel adjacency; per-move assertions check finger
tracking. The harness also records DOM changes, storage writes and frame intervals
during active movement. The normal-emulation run sampled 745 frames (605 during
active movement), with zero unexpected vertical discontinuity, panel gaps below
0.001px, no content rebuilds or storage writes during movement, and per-case frame
interval p95 and maximum at most 16.8ms (no intervals above 34ms). The same harness
passes all 26 behavior cases at 4× CPU slowdown. That full slower run overlapped
other regression checks and recorded 25 intervals above 34ms, with a 150ms maximum;
it is not an isolated device-performance measurement. Isolated trace comparison
is recorded separately in the evidence JSON. Nine isolated comparisons at 4× CPU
showed p95/max frame intervals at most 16.8ms, no intervals above 34ms, zero Layout
and Paint events during steady motion, and zero handoff shift. The first 100ms
of acquisition and final settling/cleanup were excluded from the steady-motion
trace window. Paint containment, opaque navigation, layer promotion and overflow
variants showed no measurable gain, so no further CSS change was made.

Local ignored evidence includes
`artifacts/audit/swipe-before/{report.json,trace.json,different-scroll-slow-osrs.json}`,
`artifacts/audit/swipe-before.log`,
`artifacts/audit/swipe-existing-summary.json`, and the corresponding existing-suite
logs. Final evidence paths and any slower-CPU trace results must be added after
their runs finish. See also `SWIPE-EVIDENCE-2026-11-15.json`. Instrumented headless-browser frame intervals are not Android
device FPS measurements or proof of compositor behavior on the owner's phone.

## Release and remaining acceptance

| Evidence | Final value |
|---|---|
| Tested implementation commit | Core `400b43e`; final startup head `cc0af3e1029df2ee2d4114a8f90fba562daf75a0` |
| Pull request / exact-head CI | [#58](https://github.com/tnolanwood-rgb/golden-peanut-data/pull/58), [#59](https://github.com/tnolanwood-rgb/golden-peanut-data/pull/59); [final CI 43780386225](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43780386225) succeeded |
| Merge commit | `99fcd36ac9eed80a56362f8a5de465052a5367f2` |
| Existing `guided-ui-production.yml` deployment run | [43780619441](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43780619441) succeeded |
| Exact deployed asset checksum verification | 38 exact SHA-256 matches, including build identity, independently repeated from the task environment |
| Browser smoke verification against production | Six native-touch switches from GitHub Actions plus six independent task-browser switches; every measured vertical jump 0px; vertical card scroll 225px in each run; selected item preserved; no page errors |
| Final native-touch report / trace | All 26 motion cases and both delayed-script boot cases pass; CI uploads raw traces. [Production screenshots/frames/report](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43780619441/artifacts/14188561398) |

Production verification must compare the served assets and release identity with
the merged source, then repeat the relevant navigation checks at the existing
Pages origin. Neither a successful local process nor a green build alone proves
that the deployed bytes are current.

Physical-phone acceptance remains separate: test the already installed Android
app against the deployed website, including slow and interrupted swipes and both
gesture directions inside the OSRS recommendation box. The session has no attached
physical phone or available recording, so it cannot claim owner-phone smoothness,
device frame timings, or real hardware orientation/lifecycle acceptance.

## Production startup follow-up — 16 November 2026

Core PR [#58](https://github.com/tnolanwood-rgb/golden-peanut-data/pull/58) merged as
`ffa5dece1414297aae6bace492df468ebcc5ebff` after exact-head CI
[43778305615](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43778305615)
passed. Pages release
[43778510487](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43778510487)
passed all checks. Independent task-environment readback matched **38 exact asset
SHA-256 values**, including the generated release identity, following normal Pages
redirects. The unrelated Android preview was cancelled before its build step.

The live touch check caught an intermittent remaining startup race: the OSRS desk
could be visible before dynamically loaded GW2 Guided initialization finished;
`guided(true)` then unconditionally reset the shared document scroll to zero.
This could move the recommendation box away from the physical touch target.
The first production smoke therefore did not pass and the task continued.

The follow-up loads the GW2 chart and Guided scripts as ordered deferred assets,
in parallel with the existing dependencies, before either desk accepts input.
Standalone Focus retains its dynamic fallback. Hidden GW2 activation cannot reset
OSRS document scroll, and delayed installation waits through active navigation.
A delayed-script regression checks that both desks remain behind the boot screen
until initialization is ready. Existing native gesture cases remain unchanged.

The existing Pages workflow also runs a fresh-profile native Chromium smoke
against the actual deployed origin after exact asset verification: six repeated
game swipes (all OSRS starts inside the recommendation box), rendered Y continuity,
selected-item preservation, and actual vertical scrolling in the same box.
It uploads screenshots, frame samples and the report even on failure. Website-only
pull requests no longer invoke an APK build; the Android source/manual workflow
and its existing test/build commands remain available.

The cloud workspace disconnected during this follow-up. The source was safely
reconstructed from the verified GitHub commit and committed using repository tools.
Final checks and production browser verification run on GitHub Actions; this does
not turn browser automation into a physical-phone test.

Follow-up exact-head CI **43780386225 PASSED** at `cc0af3e`; PR #59 merged as
`99fcd36`. Production run **43780619441 PASSED**, including all existing suites,
38 exact asset hashes, six actual deployed native-touch switches with **0px**
vertical discontinuity, selected-item preservation, and **225px** vertical scroll
in the recommendation box. An independent task-browser run repeated all six
switches with the same 0px result and 225px vertical scroll. Neither browser run
had page errors. The task environment independently matched all 38 asset hashes.

The boot release now also requires both initialized desk APIs. Regressions hold
Guided and Dual Hub independently so neither loading order can expose a partial
screen. The final local baseline passed again after the last test-harness change;
its old-source replay still fails at the original **360px** handoff. Replay routes
are preserved when temporary startup delays are removed, so the old-asset control
cannot accidentally run current files.

The final instrumented local run recorded 749 frames, no unexpected Y movement,
no active content rebuilds or storage writes, and a maximum frame interval of
33.4ms (per-case p95 at most 33.3ms). Earlier normal and isolated 4× CPU traces
are retained above and in the JSON; these are automation measurements, not phone
FPS. No replacement APK was built or installed. The original origin, package,
signing, credentials, storage namespaces and account/trading data remain intact.
