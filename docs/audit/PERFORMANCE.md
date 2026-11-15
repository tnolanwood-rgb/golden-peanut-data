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

QH-001: list evidence lookups use a single-unit reference; no extra API calls, no new timers. Existing assembled and performance regressions pass; no measured speed claim.

## 2026-11-15 · staged performance audit #42 (not yet an Android claim)

Confirmed from repository data sizes (not transferred network bytes): full `data/market_public.json` ~15.7 MB and `data/market_history.json` ~6.6 MB. The prior startup fetched the full former for labels; prior charts fetched the full latter even for one item. See `SYSTEMS-2026-11-15.md` for causal paths and guards.

Proposed improvement: complete compact `market_index.json` provides only public ID/name/type/rarity on startup; the full quote file remains for deep research. A 32-way daily-history partition lets an individual chart fetch only its ID-modulo-32 shard. These files are generated/published by the existing complete-data collector; fallback preserves functionality until new files exist. HTTP conditional revalidation replaces forced `no-store` requests, and duplicate simultaneous chart loads share one in-flight promise.

UI side: 130ms trade/order search coalescing (last character wins, Enter immediate) and guided market-board cache keyed on account, wallet, plan reference/arrays/lengths, market index state and minute. The cache deliberately reevaluates at least once/minute for quote freshness. The capital-budget field is not replaced during typing (merged PR #41).

Synthetic CI output: `scripts/benchmark_startup.cjs`, reports 24,000-row quote+metadata JSON and 12,000×21-day price-history fixtures with 2 warmups and 7 trials. GitHub Actions uploads `artifacts/audit/startup-benchmark.json`. Results represent fixture byte sizes and Node JSON parse medians, **not** a measured S23 Ultra page-open speed, server-side transfer compression, or end-to-end search latency. Do not assert an improvement percentage without the report and real Android before/after data.

Release evidence required: inspect latest collector generation and shard parity, check 404/invalid/stale fallback, verify exact served JS paths and use mobile network throttling or a physical phone to compare 10 repeated cold/warm load runs, median/p95; record bytes, render count, error rate, account history count and queue stability. No sample source/user data is discarded to improve benchmark results.

## 2026-11-15 integrity-release performance follow-up

The reviewed release changes static public site headers from `no-store` to `no-cache, must-revalidate` so previously downloaded bytes may be reused after an HTTP conditional check. Private API/monitor requests remain separate no-store requests; no claim of an offline sensitive-data cache. The single release workflow checks exact served SHA-256, closing a stale-script detection gap.

Existing synthetic Node fixture reports from PR #42 showed 84.5% smaller startup JSON and 96.9% smaller single-item history slice than equivalent full-file fixtures. **These percentages are not real Android load-time improvements.** New collector-generated `market_index.json` and 32 history shards were absent in the initial 15 Nov main tree. Fallback still transfers full public/history JSON until the collector publishes the new files successfully. Before claiming live speed gains, verify their publication, generation parity and network p50/p95 on repeated phone loads. Device CPU, WebView memory, storage/IndexedDB and hidden-tab refresh remain unmeasured.
