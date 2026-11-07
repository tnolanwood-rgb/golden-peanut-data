# Resume — read after STATE.md

Repository `tnolanwood-rgb/golden-peanut-data`, branch
`development/audit-p0-checkpoint`, PR #20. Read root AGENTS.md.

1. Fetch/status; check PR #20 merge state and newest CI before coding. Current
   implementation baf7c16d292fc65f8f575f2cfef700c31b3b1823 includes main 7379ede (7.29). Do not
   reopen obsolete 7.16 work or redo P0-001. Prior bda60d9 CI 42324339781 passed.
2. **User priority is market discovery first**, then sound calculations/useful bids.
   Release identity P0-002 remains TODO, deliberately deferred.
3. Completed: 003c52b prevents impossible expected profit and shared-wallet overflow,
   removes false calibration claims. Latest fix reserves public and recipe scan
   slots; previous early-lane quota sum exceeded 100%. These are synthetic-tested
   correctness repairs, not proof of better live trading returns.
4. Next **P4-001a**: trace actual catalogue category counts through quote screening,
   seed selection, research candidates and board display. Reproduce low-unit-margin
   commodity/consumable and equipment/name exclusions; fix the highest-impact gate
   with regression coverage. Never replace spread heuristics with invented volume.
5. Then independent accounting oracle (fees/FIFO/partial history/DST) and execution
   evidence/quantity/ranking validation. Keep zero fills and cancellation uncertainty.
6. Test command `python scripts/audit_baseline.py` after dependencies described in
   AGENTS. Check EVIDENCE before repeating unchanged work. Update checkpoint, commit,
   push and PR. No automatic deployment or in-game orders.

No private credentials/readback or physical Android verification. Public HTTP probes
need `User-Agent: Mozilla/5.0` here. No unattended continuation is promised.
