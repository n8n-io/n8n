# Local backend memory profiling

Record backend memory while you use n8n. View the live chart or open a saved
recording. Use the same recorder without a browser for agent workflows.

Use a built checkout. This tool does not need a Docker image rebuild. Build n8n
first if the checkout has no current build outputs. Follow the repository build
instructions and redirect build output to a log file.

## Interactive recording

From the repository root, start the backend, compiler, frontend with hot reload,
and profiling viewer together:

```bash
pnpm dev:profile
```

The command selects available backend and editor ports. It prints both URLs.
The viewer, backend, and editor URLs use `localhost`.
The compiler keeps terminal output so the profiler URL remains available.
The viewer's **Open n8n** link opens the editor with hot reload after readiness.
Press Ctrl+C to stop the processes and save the recording. The viewer's
**Stop recording** button pauses capture and leaves the backend and editor running.
Use **Start recording** to resume capture in a new interval. Use **Finish session**
to save the recording and stop owned servers. The interactive viewer stays open
for analysis. Frontend memory stays outside the profile.
This command uses the normal local n8n data configuration.

Use `--port 5678 --editor-port 8080` to select fixed ports. Use recording options
such as `--duration 120s`, `--no-open`, and `--json` for an unattended run.
Read `backendUrl` and `editorUrl` from the session status. Start a browser workload
at `editorUrl` after `ready` becomes `true`. Check `frontend.log` if Vite fails.

### Backend only

From `packages/cli`:

```bash
pnpm run dev --inspect-memory
```

This keeps TypeScript compilation and nodemon reloads. It enables metrics and
Inspector only for the backend launch. It opens a local viewer on an available
port. The default backend port is also available automatically, unless you set
`N8N_PORT` or `--port`. The compiler and viewer are outside the measured process.

This command does not start the frontend development server. The backend serves
the editor from its existing build. The **Open n8n** link appears after startup
and warm-up. If startup fails, check `backend.log` in the recording directory.
The interactive viewer stays open so you can read the failure details.

For frontend hot reload, use the same backend port in two terminals. From the
repository root, start the profiled backend:

```bash
N8N_PORT=5678 pnpm --filter n8n run dev --inspect-memory
```

In another terminal, start the editor:

```bash
N8N_PORT=5678 pnpm dev:fe:editor
```

Open `http://localhost:8080` for the editor with hot reload. The editor proxies
backend requests to port `5678`. Choose another port if `5678` is in use.
Set that port in both commands. The viewer's **Open n8n** link opens the built
editor on the backend port.

Use the viewer to add action markers or capture a heap snapshot. A snapshot
pauses the backend and needs extra memory. Press Ctrl+C or use the `stop` command
to finish recording. Reopen the saved recording to continue analysis.

From the repository root, record the built backend without a compiler watcher:

```bash
pnpm --silent profile:memory record --duration 120s --warmup 30s --workload workflow-execution
```

The recorder uses the normal local n8n data configuration. Use `N8N_USER_FOLDER`
to select a separate development instance when needed. Keep sensitive values
in environment variables. The recorder stores only selected configuration fields.

## Agent recording

```bash
pnpm --silent profile:memory record --duration 120s --warmup 30s --workload workflow-execution --no-open --json --output .context/memory-profiles/before
```

Start this command through a persistent process tool. Use another command to
read readiness. Start the workload when `ready` is `true`. Readiness follows the
startup check and warm-up. The duration counts active capture time. Pauses do not use that duration.

```bash
pnpm --silent profile:memory status --session .context/memory-profiles/before --json
pnpm --silent profile:memory mark --session .context/memory-profiles/before --label "Executed the workflow" --json
pnpm --silent profile:memory pause --session .context/memory-profiles/before --json
pnpm --silent profile:memory resume --session .context/memory-profiles/before --json
pnpm --silent profile:memory stop --session .context/memory-profiles/before --json
```

JSON recording requires `--duration`. It does not open a browser or request
terminal input. Use `--silent` so pnpm does not add script output to stdout.
The recorder writes one final JSON result to stdout. It writes logs to stderr.
The output directory must not exist. A status file is written atomically.

Use `--startup-timeout 120s` and `--request-timeout 5s` to bound waits. Use
`--interval 1s` for process metrics and `--profile-interval 5s` for allocation
checkpoints. Use `--sampling-interval 524288` to set the average allocation
sampling interval in bytes. Smaller intervals increase profiling overhead.

Use `--help --json` to discover commands, defaults, units, and exit codes.

## Attach to an existing backend

Start that backend with metrics and Inspector enabled. Apply the Inspector flag
to the server Node process. A global `NODE_OPTIONS` can also affect build tools.

```bash
N8N_METRICS=true N8N_METRICS_INCLUDE_DEFAULT_METRICS=true N8N_MEMORY_PROFILING=true pnpm exec node --inspect=127.0.0.1:9229 bin/n8n
```

Run the command above from `packages/cli`. Then record from the repository root:

```bash
pnpm --silent profile:memory record --url http://127.0.0.1:5678 --inspector http://127.0.0.1:9229 --duration 120s --no-open --json
```

You can supply an Inspector WebSocket URL directly. The HTTP discovery URL can
follow backend restarts on the same Inspector port. Each process has a separate
segment. Comparisons reject recordings that span multiple segments.

Use `--metrics-only` instead of `--inspector` for a timeline without allocation
profiles. This mode cannot verify the target runtime and configuration. Reports
mark it as unsuitable for a controlled before-and-after comparison.
This mode does not record API requests.

Stopping a recording leaves an attached backend running. The recorder stops a
backend that it started. It saves checkpoints during the run and retains partial
artifacts after a failure or interruption.

## API requests

Profiling launches enable middleware for the configured internal and public API
prefixes. The recorder subscribes through Inspector. It writes request events
outside the backend. Attach mode needs `N8N_MEMORY_PROFILING=true` on the backend.
Check `capabilities.requests` in status to confirm that capture is active.

Each call records its method, route template, API type, process, start time,
duration, response status, and disconnect state. Headers, query strings, bodies,
and route parameter values are excluded. Calls that fail before route matching
use a `/(unmatched)` label. Calls that have not finished use `/(pending)`.
Request capture starts after warm-up. It stops during a recording pause and when
the recorder detaches. A call that spans a pause can remain unfinished in the
recording. Calls that start during a pause are excluded.

Favorite an endpoint in the request table to show its calls on the memory chart.
Favorites use the API type, method, and route template. Select a call in the table
or graph to focus nearby samples and a checkpoint from the same process and
recording interval. The viewer does not select a checkpoint from another interval.
Overlapping requests share process memory. Timing alone does not identify which
request allocated memory. A checkpoint can also include earlier allocations.

Reports retain the latest 1,000 calls and summarize up to 1,000 endpoint patterns.
They return the 50 patterns with the most total request time. The viewer table
shows the latest 200 calls. Download `requests.ndjson` for all recorded events.
JSON reports include started, completed, aborted, unfinished, and invalid event
counts. Old recordings still open without request data.

## Dashboard

Recording controls and **Edit layout** appear at the top right of the header.
The status badge has a colored dot. Header buttons have icons. A divider separates
**Edit layout** from recording controls.
Use the **Markers and snapshots** card to add markers or take a heap snapshot.
The default layout shows the graph first and API requests directly below it.
Snapshot controls and allocation sites follow in the middle. Statistics, markers,
capture details, and saved files appear at the bottom.

The viewer uses local ECharts and GridStack bundles. It needs no external service.
The chart selects axis ticks and units. Hover to inspect values. Use the slider
to zoom. Vertical scrolling over the chart scrolls the page. Endpoint favorites
appear as request spans with endpoint labels in the legend. Use the pin to show
an endpoint on the graph. A vertical line marks each pinned call's start time
across the memory plot. Its color matches the request event.
The graph uses the latest 1,000 calls.
Search the request table to filter all displayed columns and highlight matches.
Search ignores case. The table shows durations as whole milliseconds.

Elapsed time includes pauses by default. Enable **Hide recording gaps** to remove
pauses and missing scrape periods from the displayed time axis. Memory lines
still break at recording boundaries and process changes. This filter does not
change saved timestamps or report statistics.

Select **Edit layout** to move, resize, remove, or add cards. Drag a Move handle
to move a card. Drag a card corner to resize it. For keyboard control, focus
**Move** and use the arrow keys. Hold Shift to resize. You can also focus
**Resize** and use the arrow keys. Restore a removed card with **Hidden cards**
and **Add card**. Use **Reset layout** to restore all default cards and sizes.
The layout locks when you select **Done editing**. Narrow screens use one column.
Cards move up to close empty rows. A subtle grid helps align cards in edit mode.
Cards appear only when their data applies to the recording.

The browser saves favorites, the gap filter, and the layout for the viewer
origin. Reloading that viewer preserves them. A viewer on another port has
separate browser storage.

Recording pauses stop metric scrapes, request subscriptions, and allocation
sampling. Resuming starts new allocation sampling. Samples, requests, and
checkpoints carry a `recordingId`. The manifest stores recording intervals and
pause times. Comparisons flag recordings with pauses as unsuitable for a
controlled before-and-after measurement.

## Reports and replay

```bash
pnpm --silent profile:memory report --input .context/memory-profiles/before/session.json --json
pnpm --silent profile:memory serve --input .context/memory-profiles/before/session.json
pnpm --silent profile:memory compare .context/memory-profiles/before/session.json .context/memory-profiles/after/session.json --json
```

From `packages/cli`, you can also use:

```bash
pnpm run inspect-memory-snapshot --filePath=/absolute/path/to/session.json
```

The viewer accepts standalone `.heapprofile` and `.heapsnapshot` files too. A
standalone capture has no historical timeline. Heap snapshots show object counts
and shallow sizes. Open the file in Chrome DevTools for retention paths and
detailed comparisons. Each viewer uses a separate available port.

## Saved data

| File | Contents |
| --- | --- |
| `session.json` | Versioned metadata, process segments, recording intervals, pauses, markers, gaps, and artifact references |
| `status.json` | Recording phase, recording state and ID, readiness, backend URL, control URL, process ID, and capabilities |
| `timeline.ndjson` | Timestamped metric samples with phase, recording ID, and process identity |
| `requests.ndjson` | Request start and completion events with route templates, recording ID, and process identity |
| `raw/*.prom` | Original Prometheus scrapes |
| `profiles/*.heapprofile` | Native V8 sampling profiles |
| `profiles/*.locations.json` | Source locations and allocation-site summaries for each checkpoint |
| `snapshots/*.heapsnapshot` | Explicit V8 heap snapshots |
| `summary.json`, `summary.md` | Statistics and comparison limits |
| `backend.log` | Logs for an owned backend |
| `frontend.log` | Logs for the frontend dev server started by `dev:profile` |

Memory values use bytes. Timestamps use Unix milliseconds. Elapsed time uses
milliseconds from the start of the recording. Copy the full directory to keep
the session portable. The JSON schema version is `1`.
Request durations use milliseconds. Request IDs are unique within each process.
Join start and completion events with `segmentId` and `id`.

Only the selected backend process and its V8 isolate are profiled. Workers and
task runners need separate recordings. Metrics use the existing process gauges.
V8 allocation samples do not explain all native allocations or every byte of RSS.
The report maps allocation frames to TypeScript when local source maps exist.
Mapped locations are saved with each checkpoint for replay without source files.

By default, allocation samples describe objects that remain alive when a profile
is read. Use `--churn` to include allocations that GC has already collected.
Allocation sites show where objects were created. Heap retention paths show why
objects remain alive.

## Interpret comparisons

Use the same machine, workload, runtime, launch mode, warm-up, duration, and
sampling settings. Give both recordings the same `--workload` value. The report
excludes warm-up samples. Initial and final values are medians of up to five
samples in separate endpoint windows.

A comparison reports numerical changes. It applies no regression threshold.
Repeat the workload to assess variation. A lower final heap alone does not prove
a reduction in retained memory. Review RSS, heap, allocation sites, and GC effects.

Exit codes:

| Code | Meaning |
| --- | --- |
| `0` | Command succeeded. A comparison passed its compatibility checks. |
| `1` | Input is invalid, capture failed or has gaps, or recordings are incompatible. |
| `130` | Recording was interrupted. Partial artifacts remain available. |

The report command can read a partial recording. Check `session.status` and
`comparison.eligible` before using its values. A comparison rejects gaps, missing
measurement data, runtime differences, and different recording settings.

For deeper snapshot analysis, use the existing
[MemLab helper](../../../testing/playwright/utils/benchmark/run-heap-analysis.ts).
Supply baseline, target, and final snapshots from one process. Forced GC remains
an explicit diagnostic choice and is not part of normal recording.

## Development checks

The browser check uses local fixtures. It does not start n8n or need Docker.
Set `PLAYWRIGHT_CHANNEL=chrome` to use an installed Chrome browser.

```bash
pnpm --filter @n8n/efficiency test --maxWorkers=1
pnpm --filter @n8n/efficiency exec playwright test --project=memory-profiler --workers=1
```
