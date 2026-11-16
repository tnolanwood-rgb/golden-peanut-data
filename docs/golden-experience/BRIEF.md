# GOLDEN EXPERIENCE — protected development contract

Owner brief received 2026-11-16. Project: The Golden Peanut (GW2) and The Golden
Exchange (OSRS), repository `tnolanwood-rgb/golden-peanut-data`. This is a continuing
assignment. This document preserves the operative requirements and acceptance
criteria; it does not supersede the owner's original instructions.

## 1. Production freeze and authority

Until the owner says **Implement** AFTER the final readiness report: no production
deployment, merge into production, installed-app modification, APK identity/signing
change, data migration/reset/clearing, D1/Worker/credential/monitor configuration
change, origin/domain change or experimental production migration. Preserve normal
collectors, refreshes, trading services and concurrent maintenance. Historical audit
release authorizations do not authorize this project. Inspect ALL Actions and
Cloudflare triggers before creating/pushing a branch. If isolation cannot be proved,
stop deployment operations and establish a safer workflow. Development belongs on
`feature/golden-experience`, with isolated staging and synthetic accounts/data.

## 2. Product vision

CALM POWER — a living, precision-engineered trading instrument: immediate, fluid,
tactile, intelligent, substantial, calm, beautiful, coherent and reliable. Combine
the games' personalities with a refined workstation. Avoid generic finance/crypto
dashboards, noisy gaming decoration and basic HTML styling. Responsiveness,
clarity, accounting and reliability take precedence over decorative complexity.

## 3. Discovery and real baseline

Read AGENTS, README, global audit STATE/RESUME/ROADMAP/FINDINGS, entry points/styles,
Android wrapper/configuration, performance/swipe tests, Actions, Cloudflare and test
harness before changes. Resolve actual main AND served production identity. Preserve
prior audit/performance/swipe repairs. Map all functionality (see FUNCTIONALITY.md).
Use `python scripts/audit_baseline.py` with documented dependencies. Measure repeated
cold/warm startup, useful content, interaction readiness, frame timing/drops, switching,
scrolling, navigation, charts, imagery, requests/payloads, blocking, long-session
memory/layout shifts, CPU/battery where measurable, WebView and background/resume/
rotation. Use comparable conditions and synthetic accounts. Browser emulation NEVER
proves physical Android performance. Record unavailable measurements explicitly.

## 4. Shared visual system

Dark refined foundation: obsidian #0C1110, pine #15231D, elevation #203027,
antique gold #E2BE78, ivory #F3EFE3, muted #A9B8AE, profit #93D2AB,
caution/loss #E9A09A are starting tokens subject to contrast/visual tests. Preserve
official GW2 rarity, currency denominations/icons and OSRS value tiers/GP. Restrained
gold, surface separation and cheap shadows; avoid blur, glow and excess borders.
Shared typography/spacing/radii/elevation/motion; tabular financial numerals,
clear primary figures and readable secondary trading detail on small screens and
large fonts. Never clip monetary values or sacrifice critical detail for minimalism.

## 5. Signature interactions

Horizontal finger-tracked switching must settle physically, reverse/cancel cleanly,
avoid blank/overlap/vertical jumps, remain fluid over long use and reuse both DOMs.
No data reset. Native vertical scrolling and horizontal gestures in recommendation
scroll areas must coexist; chart gestures and interactive controls must be protected.
Preserve Android Back and previous swipe corrections. Use compositor transforms,
no synchronous heavy work during dragging and reduced-motion fallbacks.
Press feedback is immediate, subtle physical depth/scale/contrast, with no operation
delay or duplicate ledger writes. Recommendation text/icons/prices update together;
stable expansion avoids expensive measured-layout animation with slower-device
fallback. Profit feedback reflects confirmed recorded values only, never pending
money, with exact final totals. Delivery Box remains prominent, accurate, accessible,
imaged and responsive; observation/recording must never imply in-game collection.
Investigate optional native/WebView haptics for confirmed actions/snap/save/selection,
provide disable setting, no scrolling vibration, new APK or permission requirement.
If installed app cannot support them safely, use no-haptics and report limitation.

## 6. Charts

Inspect existing engines before optimizing/replacing. Fluid drag/pinch/pan, bounded
inertia where useful, precise inspection, readable tooltips/axes/times, stable size,
1D/7D/30D/90D/All ONLY where actual feed supports them. No accidental close or game
switch, redundant earlier/later controls or needless cached reopen fetch. Preserve
history accuracy and responsiveness at scale. No larger dependency without measured
justification; sample/cache/progress/worker only when evidence warrants.

## 7. Startup and loading

Meaningful genuine cached content promptly; clearly distinguish fresh/cached/stale.
No manufactured prices. Remove blank screens, redundant requests/parsing/work.
Stable icon placeholders, responsible caching/decoded reuse, visible recommendation
and finances first, secondary research/images deferred. Background work cannot block
touch. Loading polish must never delay content.

## 8–9. Compatibility and trading engines

Single calm page per game, meaningful figures and one explained next action, with
research/settings/results/tools still reachable. True fresh launch starts at top and
recommendation one. Temporary app resume keeps work without reload; rotation keeps
credentials, drafts and interactions; internal switching keeps session state.
Preserve settings/watchlists/accounting/purchases/records; Previous/Next, no Skip;
owned sales even when recommendations change; Delivery Box/wallet/performance/orders;
official imagery and unambiguous money. Distinguish cold launch, resume, rotation,
process restoration and internal navigation. Preserve BOTH engines, price feeds,
discovery/history/explanations/guidance/fees/taxes/realised profit/inventory/orders/
watchlists/backups/charts/account integration/risk/privacy/key protections. No automated
in-game trading or inflated confidence. Preserve observations vs estimates vs research.
Record unfinished OSRS v4 parity/import separately, never silently discard legacy
fields or claim parity. Unrelated audit work is not implicitly redesign scope.

## 10–12. Performance, motion and accessibility

Diagnose JS/main-thread/listener/DOM/layout/compositing/decode/cache/storage/fetch/
waterfall/filter/sort/polling/GC/leak/WebView/slow-network/large-history bottlenecks.
Avoid framework migration/broad rewrites. Budget from repeated baseline distributions
and realistic hardware: aim p95 press <100ms, refresh-rate motion, minimal drops,
zero visible switch Y jump, no full redraw for small changes, no meaningful startup/
interaction p95/p99 regression, persistent memory growth or expensive finger-down work.
Never claim 60 FPS/zero latency from browser tests. Shared interruptible, reversible,
predictable, nonblocking motion tokens: initial press 70–130ms, small 120–180ms,
card 160–240ms, distance/velocity-adaptive switching. Prefer transform/opacity, no
idle effects, reduced motion supported. Check small/typical/large phone portrait/
landscape, large fonts, reduced motion, slow CPU/network, offline/partial data.
Readable contrast, >=comfortable touch targets, no overflow/clipped money/obscuring
overlays/scroll traps, keyboard/focus support, non-colour profit/loss cues, clear
loading/errors and accessible gesture alternatives. Capture and actually review
principal-state screenshots.

## 13–16. Batches, continuity and integration

GE-00 discovery/isolation/baseline; GE-01 tokens; GE-02 main UI/Delivery Box/cards;
GE-03 gestures/motion; GE-04 charts; GE-05 startup; GE-06 signature/haptics;
GE-07 performance; GE-08 full regression/accessibility; GE-09 integrated isolated
candidate; GE-10 frozen readiness verification. Phases are resumable checkpoints,
not optional stopping points. Maintain BRIEF, STATE, RESUME, ROADMAP, DECISIONS,
TESTS, BENCHMARKS, RELEASE in this directory without overwriting global audit state.
After each batch/before ending: test, commit/push safely, update evidence, branch/
actual SHA/PR, defects/next actions/production-behavior changes and freeze verification,
then concise handoff. Status vocabulary: TODO / IN PROGRESS / BLOCKED / TESTED /
VERIFIED / READY FOR IMPLEMENT. Code alone is not VERIFIED. Never invent hashes or
test/CI results; use `git log -1 -- docs/golden-experience/STATE.md` for checkpoint.
Resume by reading documents, verifying GitHub refs and starting first unfinished task.
Complete accessible work when capabilities unavailable and record exact blocker.
No owner-managed assembly/copying/repeating instructions. Preserve unrelated edits.
Staging has separate origin/project, synthetic/isolated data and no production D1
write access/credentials/private monitoring. Inspect all push/PR/manual actions.
Integrate every batch; incorporate intervening main fixes without overwriting them.
Run source, JS, Python, all browser/both-game/performance/accessibility/touch/lifecycle/
backup/data-preservation checks and relevant Android build/tests; verify staging,
review screenshots, attest no production mutation and freeze exact candidate.

## 17–19. Release and readiness contract

Prepare exact commit/tree/dependency locks, production-compatible asset manifest,
tested deploy pipeline/hash checks/preflight/drift detection/main-fix incorporation,
safe deploy/live-host smoke/rollback/failure monitoring/storage protection and staging
evidence BEFORE approval. Prefer same-origin web assets compatible with installed
app, no reinstall/database transfer. Native change only if proven compatible signer/
package/data update; debug preview is not an original-app update. Feature flags may
not install experimental production code during freeze. Prepare controlled near
one-command deploy/rollback; no unfinished development after approval.
Declare READY FOR IMPLEMENT only when ALL batches integrated/completed, required
automated tests passed, functional/visual acceptance documented, performance compared,
no blockers, verified staging, prepared/tested release/rollback, frozen identified
candidate, no further development/integration/redesign and untouched production.
Explicitly report unavoidable platform limitations. Otherwise continue or report
precise blockers; do not claim readiness. Only THEN owner's Implement authorizes
preflight, verify frozen candidate and current production, abort on divergence,
tested complete deploy, exact live assets/both-game/core/storage verification,
immediate prepared rollback on critical failure, exact version/results/limitations.
Implement is not permission to start assembling unfinished work.

## 20–22. Session continuity and quality

Before allowance/session end save/commit/push completed work and STATE/RESUME with
failed/unavailable tests, precise next action and incomplete/ready status. ChatGPT
and Codex resume from GitHub, never solely chat memory. Begin discovery immediately,
establish safe workspace/docs then actual implementation, continue until real
constraints. No mockup-only delivery, premature approval or production modification.
Every change must improve response/coherence/clarity/touch/data/edge-case reliability
and measurable experience; remove effects whose removal improves usability. Correctness,
functionality and performance outrank animation/minimalism/effects. Deliver one complete
professionally engineered release candidate awaiting only final implementation.
