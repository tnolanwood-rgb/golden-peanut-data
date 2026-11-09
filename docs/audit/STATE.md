# Golden Peanut — current engineering checkpoint

2026-11-09. Urgent screenshot repair QH-001 VERIFIED locally; not deployed.
Branch fix/research-quote-headlines, base main 8afad54; implementation 710007c
(and 5cecc05). Checkpoint SHA: git log -1 -- docs/audit/STATE.md.

User reported 250 Invisible footwear recommended for 425,000g. Confirmed root:
a global saved research lot was multiplied across every public quote and rendered
as headline profit, despite no affordability or execution evidence. Fixed list
presentation: no bulk selector/quantity/profit extrapolation; outside-wallet items
show Outside wallet; affordable public quotes show only net spread per item.
Explicit hypothetical sizing remains in item details, with a one-unit initial
reference instead of inheriting the global lot. No account data cleared.

Tests: 79 JS, 34 Python, source/workflow validation and assembled desktop/mobile
Chromium passed. Screenshot regression starts with saved marketResearchLot=250,
checks 1700g footwear, unknown fills/resales, and no 425,000g or bulk profit headline.
QH-001-baseline.json dirty flag is solely local node_modules symlink, not source.
Prior financial/funded-allocation assertions remain unchanged and green.

Next: check hotfix PR CI, review/release the isolated fix through existing Pages
workflow, verify deployed focus-edition.js/market-board.js/index.html cache URLs.
No release-request change or deployment performed. Production background systems,
account history, credentials and Trading Post orders are untouched.

Longer programme remains on audit/competitive-exposure, draft PR #31, checkpoint
4d1511e. Its CE-003c model work is incomplete. Resume that branch's STATE/RESUME after
integrating this hotfix. Do NOT merge or deploy draft #31 to release this small fix.
No private D1 credentials or live predictive accuracy proof. This repair corrects
presentation and quantities attached to quotes; it does not establish market volume.
