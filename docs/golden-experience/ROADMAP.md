# Golden Experience roadmap

| Batch | Status | Dependency / remaining acceptance |
|---|---|---|
| GE-00 Discovery/isolation/baseline | TESTED | Production main identified; all Actions inspected; Cloudflare main confirmed. Full baseline passed; physical Android measurement BLOCKED. |
| GE-01 Shared design system | TESTED | 0288a66; full baseline/16 viewport-font states, contrast, visual review; final Android acceptance open |
| GE-02 Main interface refinement | IN PROGRESS | GE-01; headers/metrics/Delivery Box/cards/details/controls, preserve functionality |
| GE-03 Motion and gestures | IN PROGRESS | Retain swipe fixes; press/card/interruption/reduced motion; repeated tests |
| GE-04 Charts | IN PROGRESS | Profile existing SVG engines; optimize only diagnosed issues; feed-supported ranges |
| GE-05 Startup/loading | TODO | Compare startup/requests/cache/imagery with baseline |
| GE-06 Signature details | TODO | Confirmed feedback, no-haptics fallback/support investigation |
| GE-07 Performance | TODO | Before/after distributions, long sessions, Android evidence |
| GE-08 Regression/accessibility | TODO | Complete matrix in TESTS, screenshot review and device lifecycle |
| GE-09 Integrated candidate | TODO | All preceding source integrated; synthetic isolated staging verified |
| GE-10 Final readiness | TODO | Freeze commit/tree/hashes, rehearsed release/rollback, no blockers |

Physical-device portions of discovery may remain BLOCKED while independently safe
local work proceeds. No batch is VERIFIED solely because source is implemented.
