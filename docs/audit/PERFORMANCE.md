# Performance ledger

No responsiveness improvement is claimed in P0-001. The only runtime change is
collector failure status; the baseline runner records overhead, not trading speed.

Baseline `d7d2a24`, Linux container / Node 24.22.1, one synthetic test run:
- Existing stress test: 141,879 transactions, 312 positions, 1,549 unfamiliar leads;
  the Node runner reported ~169 ms for the whole test file subprocess.
- Eight JS test files reported ~871 ms total. These are single smoke observations,
  not repeated benchmarks and not Galaxy S23 Ultra timings.
- Assembled Chromium tests at 1440×1000 and 390×844 passed. Emulation only; no CPU,
  memory or network throttling profile. 390px is not a verified physical S23 viewport.

Reproducible per-command timings: `python scripts/audit_baseline.py` writes
`artifacts/audit/baseline.json` with tested SHA, dirty flag, runtime and conditions.
Committed summaries are in EVIDENCE.md; CI uploads the report. Logs remain ignored.

P8 acceptance: freeze seed/load/runtime/viewport/network settings; record multiple
cold/warm samples, medians/p95 and correctness counts before and after each change.
Separate UI latency, algorithm time, IDB time, memory and network calls. Existing
7.24 performance commit descriptions alone are not benchmark proof. Do not optimize
by dropping markets/history or extending quote freshness.

P1-000/P4-000: existing scale/browser regressions pass; timings saved in
P4-000-baseline.json. No controlled performance comparison or improvement claim.
Reserved scan shares retain the existing total request budget (800 quick / 6500 deep).

P8-000: same-family 1000-row engine microbenchmark, Node locally, 2 warmups + 7
samples. Before 8e5bc43 median 10.796ms; after d19ae75 1.528ms. Exact output IDs
asserted each run. Reproduce with scripts/benchmark_family.cjs and baseline source
extracted using git show (see EVIDENCE). No whole-app/physical Android claim.
