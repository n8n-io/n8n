# sizing-matrix aggregator fixture

Real, captured Playwright `test-results.json` output from the `Test: E2E Infrastructure`
benchmark run — **not** synthetic `RunReportBuilder` mocks. Used to exercise the
sizing-matrix aggregator end-to-end against the exact shape the benchmark lanes emit.

**Provenance:** captured from run `27965055540` (master, 2026-06-22). Trimmed to keep
each lane's suite structure (`suite.file`, `spec.title`) and the inline
`run-report.json` attachments; per-step stdout, traces, and `metric:*` attachments
were stripped to keep the fixture small (~250 KB vs ~9 MB raw).

**Why captured, not generated:** the aggregator's failure modes live in the gap between
the real artifact shape and the idealized `RunReport` type — reports arrive as inline
base64 attachments (not loose files), and `scenario.spec` is a human title (not a spec
path). A fabricated fixture re-encodes the same wrong assumptions the code makes, so the
test passes while CI fails. Only a real artifact catches it.

**Consumed by:** the aggregator end-to-end test (DEVP-531) — asserts the pipeline
produces a non-empty matrix (`cells.length > 0`) with `concurrency` per cell.
Across these four lanes it should resolve the six measured cells: L-S0/S1/S2, D-S1, X-S0/S1.

The lane files are named `test-results.json` on purpose — the aggregator matches on that
exact basename, so the fixture must use it to exercise the real extraction path. That
name is in the repo `.gitignore`, so these files are tracked via `git add -f`.

To refresh: download the `benchmark-*-shard-*` artifacts from a recent infra run and
re-trim (keep `run-report.json` attachments + suite `file`/`title`; drop the rest), then
`git add -f` the lane `test-results.json` files.
