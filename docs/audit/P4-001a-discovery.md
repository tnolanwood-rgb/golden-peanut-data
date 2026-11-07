# P4-001a — public catalogue gate replay

Source: public catalogue at repository commit `7379ede` (27,999 rows).
Snapshot SHA256: `28bdb364054dff6e30afdfeb6c02d4aa96aa08cd2c257bfaf33b2c6233531c28`.
Replay clock: snapshot generation timestamp `1794024394`.
Command: `node scripts/audit_discovery.cjs` from repository root.
Before: app source e286321; after: 7e15c00. No API requests/account data.
All stored quotes are replayed to isolate filtering; seed selection is measured
separately. These counts are NOT live coverage, recommendations, or trading volume.
Catalogue count represents names available for search, not a tested search journey.

| Category | Catalogue | Quote eligible / research | Seeded (1450 limit) | Board before | Board after |
|---|---:|---:|---:|---:|---:|
| Consumable | 4906 | 3594 | 394 | 402 | 526 |
| Armor | 6722 | 4079 | 247 | 1458 | 2293 |
| Gizmo | 125 | 75 | 14 | 27 | 28 |
| Container | 686 | 312 | 73 | 119 | 146 |
| Bag | 69 | 39 | 0 | 36 | 36 |
| CraftingMaterial | 1409 | 1020 | 32 | 597 | 817 |
| Trinket | 697 | 586 | 41 | 315 | 331 |
| Weapon | 11780 | 7130 | 477 | 2839 | 3863 |
| Unknown | 26 | 0 | 0 | 0 | 0 |
| Trophy | 237 | 128 | 12 | 50 | 86 |
| MiniPet | 429 | 359 | 40 | 0 | 0 |
| Tool | 1 | 1 | 1 | 0 | 0 |
| UpgradeComponent | 778 | 577 | 39 | 235 | 334 |
| Back | 54 | 32 | 3 | 24 | 25 |
| JadeTechModule | 18 | 14 | 1 | 13 | 13 |
| PowerCore | 10 | 1 | 0 | 1 | 1 |
| Relic | 52 | 48 | 2 | 45 | 45 |

Overall board retention: 6,161 → 8,544 of 17,995 research candidates. Only the
50-copper minimum was relaxed; positive rounded net margin remains necessary.
Malformed standing quantities now explicitly fail validation. No quantity or
expected-profit forecast is assigned to these public-only rows.

Remaining first rejection reasons (each row counted once):
- `name-policy`: 1230
- `price-ceiling-policy`: 1110
- `roi-policy`: 5680
- `unlock-policy`: 1401
- `standing-depth-policy`: 30

Rejections depend on gate order; these counts do not claim independent causal
impact for overlapping gates. `publicCoverage.byCategory` exposes per-category
counts from the runtime board. Regression tests reconcile accepted + rejected
against all scanned rows, including duplicates, stale quotes and malformed depth.

Next: name/unlock restrictions and ROI selection. MiniPet has 359 research
candidates but zero board entries; Bag has 39 research candidates but zero
seed slots. Search and category coverage across repeated refreshes remain to test.
