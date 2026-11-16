# Golden Experience roadmap

| Batch | Status | Evidence / remaining dependency |
|---|---|---|
| GE-00 Discovery/isolation/baseline | TESTED | Actual main/live 097f012; all 11 Actions and read-only CF inspection; full baseline. Hardware measurements BLOCKED. |
| GE-01 Shared design system | TESTED | Tokens/surfaces/type/focus/press, official colours preserved,16 browser visual states. Whole-product/native acceptance remains. |
| GE-02 Main interface | IN PROGRESS | Both main desks/Delivery Box/controls/advanced token bridge done; populated-account/detailed/forms/error visual acceptance open. |
| GE-03 Motion/gestures | IN PROGRESS | Existing swipe retained; press/reduced motion,26-case CPU 1+CPU 4 proofs; physical feel/press latency/complete motion review open. |
| GE-04 Charts | IN PROGRESS | Frame coalescing/cancel/axes/exact tap/loading/cache tested; real touch feel/large-history performance/complete accessibility open. |
| GE-05 Startup/loading | IN PROGRESS | Existing caches preserved, new stylesheet request removed; mixed startup tails and real lifecycle remain open. |
| GE-06 Signature details | IN PROGRESS | Visible confirmed-save feedback, no duplicate writes; graceful no-haptics. Remaining confirmation/interaction acceptance open. |
| GE-07 Performance | IN PROGRESS | Corrected serial browser distributions and 6+6 CPU-sampled cold comparisons in two CI jobs; one intermittent DOM growth failure followed by one passing retention rerun, root unresolved; press/scroll/item/long-session/Android still open. |
| GE-08 Regression/a11y | IN PROGRESS | Full source/56 Python/129 JS/ten browser programs including OSRS settings, purchase/offline/recovery state matrix pass at CI 43857515705. Some enlarged-font and failure screenshots reviewed. Complete populated GW2/advanced/accessibility and physical Android remain. |
| GE-09 Integrated candidate | TODO | Distinct synthetic staging, complete integration/acceptance, incorporate newer main without losing fixes. |
| GE-10 Final readiness | TODO | Freeze exact complete candidate, asset/dependency preflight/drift detection, tested release/rollback; no blockers allowed. |

TESTED means the listed local sub-batch evidence exists, not that physical/platform
or whole-product acceptance is VERIFIED. No phase is READY. Preserve compatibility;
OSRS v4 parity/import and calibration remain separate audit work.
