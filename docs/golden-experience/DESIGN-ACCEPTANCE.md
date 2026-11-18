# Golden Experience — extraordinary visual acceptance bar

Owner requirement: **truly stunning, premium, solid, precisely engineered**. An ordinary HTML card stack with a dark palette or gold borders is NOT sufficient; the original version appeared too similar. This standard governs all later design decisions and overrides any assumption that passing regression tests alone proves an exceptional experience.

## Core physical metaphor
A fine precision instrument, not fintech SaaS, casino/crypto screens, or fantasy game clutter. Desktop-like credibility at phone scale: milled header fascia, clear status identity, restrained brass/green enamel, exact tabular readouts, purposeful negative space, and cards with clear material/chassis hierarchy. GW2 and OSRS are genuinely related but visually differentiated. Keep official item colours, artwork, coin units, certainty/status and game identity.

## Observable review criteria
1. **At first glance** both desks are unmistakably more beautiful and coherent than the main-production screenshots; comparisons must include both 390×844 default and a populated synthetic account, not just empty-state placeholders.
2. **First action** is easy to find, with the one recommended move and its evidence/payoff/limitations clear. Key values remain readable, correct, and precise; completed vs conditional money never implied wrongly.
3. **Interaction** has no flicker, unrelated reflow, input swallowing, accidental game switch, or Y position jump; Next/Previous, chart touch, nested recommendation scroll, OSRS owned sales and GW2 Delivery Box remain integrated.
4. **Scale** passes 320px narrow, 390px usual, large screens/landscape, 100%/200% fonts, reduced motion and keyboard focus. Screenshots are reviewed for aesthetics and clipping, not mere DOM existence. Large exact OSRS GP figures require another refinement pass at 200% zoom.
5. **Every state**, including populated account/order/inventory, loading, cached/stale, partial failure, charts, expanded details, backups, settings and long item titles, has consistent finish. No blank/cheap raw legacy panels when navigating deeper.
6. **Performance evidence** has actual before/after distributions on a representative Android WebView before any whole-product “smoothest possible” claim; static gradients and shadows must be rejected if they harm latency/power.
7. **Release** only after isolated staging with synthetic accounts, original APK compatibility check, complete regression and rehearsed rollback. Until then protected design is not live.

## Current visual batch and next critique
Current implementation at `27169f6e9dbdb2fe3ea73bb6828881db45631b1b` creates a noticeably different initial instrument face using scoped CSS. Screenshots from run [43874452456](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43874452456), artifact `14230105976`, were reviewed. Still **not final**: 200%-text long numbers wrap, the GW2 sample is unconnected, some deep tools still inherit older geometry, real Android touch/press appearance unverified. Next work: simulate a richly populated GW2 account and OSRS long-name/complex-stat states, review screenshots at every size, fix specific visual shortcomings without gutting trading intelligence.

**No premature READY FOR IMPLEMENT.** Production main currently `097f012` and remains frozen by this project.

## Current acceptance checkpoint
Protected branch `feature/golden-experience`, commit `4e377852dab66d837b86f6c4b112a8560c3f33a5` green at [CI 43877907764](https://github.com/tnolanwood-rgb/golden-peanut-data/actions/runs/43877907764), artifact `14231456749` includes populated GW2 screenshots and advanced states. Visual priority remains **solid, breathtaking, meticulously designed** rather than only performance. External peer/device judgment and complex state QA have not yet been completed; user has not approved any deployment.
