# Local memory profiling

Capture one running n8n process and inspect its memory timeline. No n8n Docker image build is required.

```bash
pnpm memory run --url http://localhost:5689
pnpm memory run --url http://localhost:5689 -- <workload-command>
pnpm memory report <run-directory>
```

The tool attaches to your process. It does not start, reset, or stop n8n.
It cancels its own foreground workload when collection fails or you interrupt it.

- [First capture](docs/first-capture.md): start a disposable local instance and produce a report.
- [Capture a feature or E2E workload](docs/capture-workload.md): manual checkpoints, test selection, and snapshots.
- [Understand the results](docs/understand-results.md): measurements, retention, and limits.

## Requirements

- Node 24 and the repository's pnpm version.
- Installed workspace dependencies and built shared utilities.
- A running backend with `E2E_TESTS=true` and `GET /rest/e2e/internals`.
- Diagnostics must include `processStartId`, which changes on every process restart.
- `node --expose-gc` for `--gc` or `--snapshots`.
- macOS or Linux for foreground workload cancellation through process groups.

The CLI checks the diagnostics response before it runs a workload.
Rebuild and restart an older backend from a checkout that contains these diagnostics.

VictoriaMetrics, VictoriaLogs, and Pyroscope are optional observers.
Capture and offline reporting do not require them.
This package collects backend process readings. Browser collection belongs to the Playwright runner.

## Run options

| Option | Default | Purpose |
| --- | --- | --- |
| `--url` | Required | Instance URL, including an optional base path |
| `--output` | `.memory-runs` | Parent directory for unique runs |
| `--interval` | `2` seconds | Continuous sampling interval |
| `--timeout` | `10` seconds | Timeout for a diagnostics request |
| `--gc` | Off | Request GC before named checkpoints |
| `--snapshots` | Off | Capture a snapshot at each checkpoint instead of continuous sampling |

Snapshots can take up to two minutes per request.
The server also keeps the snapshot file in its working directory.

## Artifacts

Each run has its own directory. Report generation reads only that directory.

| File | Contents |
| --- | --- |
| `manifest.json` | Run identity, target identity, mode, completion status, and snapshot paths |
| `samples.jsonl` | Ordered readings and named checkpoints |
| `snapshot-*.heapsnapshot` | Downloaded snapshots, when requested |
| `report.json` | Validated checkpoints, deltas, and interpretation notes |
| `memory.svg` | Sampled memory timeline for a measurement run |

A failed or interrupted run can produce a partial report. It remains visibly incomplete.
Reports reject mixed identities, missing observations, and incomplete snapshot files.

## Development

```bash
pnpm --filter @n8n/memory test
pnpm --filter @n8n/memory lint
pnpm --filter @n8n/memory typecheck
```
