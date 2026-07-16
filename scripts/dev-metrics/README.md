# Dev-tooling usage metrics

Opt-in, anonymous telemetry that helps us understand how internal n8n developers
use their CLIs in the monorepo: **which commands are run, how long they take, and
roughly how many developers run them each week.**

It is deliberately low-friction: no command to remember and no per-run flags.
Internal developers are asked **once** (during `pnpm install`) and the answer is
remembered. Today only `pnpm` is tracked; add another CLI in one line.

## How it works

On opt-in we **replace the tracked binary with a shim in place**: the original
is moved next to it as `<binary>.n8n-real`, and a shim takes its path. Every
invocation — interactive, non-interactive, or from an AI agent — hits the shim,
which runs the real binary, times it, and reports usage. No shell function, no
rc editing, no PATH-ordering dependence.

```
pnpm install
  └─ scripts/prepare.mjs
       └─ scripts/dev-metrics/setup.mjs   ← asks once (git email @n8n.io; prompts via /dev/tty)
            └─ on "yes": replace $(command -v pnpm) with a shim,
                          save the original as pnpm.n8n-real

pnpm <anything>
  └─ pnpm shim → runs pnpm.n8n-real, then (backgrounded) →
       track.mjs  (installed copy in ~/.n8n/dev/bin) → RudderStack (n8n-dev)
```

- Replaced **in place**, so it works regardless of PATH order. If the binary's
  dir isn't writable it's skipped (rare — corepack pnpm lives in a user-writable
  dir).
- `N8N_DEV_SHIM_ACTIVE` guards against double-counting nested calls (e.g.
  `turbo -> pnpm`) and the tracker's own `<bin> --version` probe.
- The tracker (`track.mjs`) is **copied to `~/.n8n/dev/bin`** and run from there, so
  it's independent of which checkout (or none) you're in. Install only overwrites
  the copy when the checkout's `// n8n-track-version` is newer, so the newest
  version wins and an older checkout can't downgrade it. It self-scopes: it checks
  the monorepo root from the command's cwd, so pnpm runs outside any n8n checkout
  send nothing. pnpm prompts via `/dev/tty` because it pipes lifecycle-script stdio.

| File | Role |
| --- | --- |
| `setup.mjs` | Consent prompt; replaces/restores binaries; `--status`/`--enable`/`--disable`/`--reset`. |
| `shadow-shim.sh` | Shim template (versioned via `# n8n-shadow-shim-version`); rendered per binary with the binary name, saved-real path, and its dir baked in. |
| `track.mjs` | Builds the anonymous event and POSTs it to RudderStack (fire-and-forget). Copied to `~/.n8n/dev/bin` on install; the shim runs that copy. |
| `capture-server.mjs` | Local capture stub for testing — logs every event instead of sending it upstream. |

State lives in `~/.n8n/dev/dev-telemetry.json` (separate from n8n's secret `config`):

```json
{ "schemaVersion": 1, "consent": "granted", "anonId": "<uuid>", "week": "2026-W26" }
```

## What is sent

Event `dev:cli_command` with `anonymousId` = the weekly anonymous id, and:

| Property | Example | Notes |
| --- | --- | --- |
| `actor` | `human`, `claude-code`, `cursor`, `ci` | Who ran it, inferred from env markers (`CLAUDECODE`, `CURSOR_TRACE_ID`, `CI`/`GITHUB_ACTIONS`); defaults to `human`. |
| `binary` | `pnpm` | The shadowed CLI. |
| `binary_version` | `10.32.1` | The CLI's own version, detected at runtime by the tracker via `<bin> --version` (`null` if unknown). |
| `args` | `["run","build"]`, `["add","left-pad"]` | The command's **argv as an array** (boundaries preserved, incl. quoted/empty args). Parsed/aggregated on the collection side. |
| `dir` | `packages/cli`, `.` | Where it ran, **relative to the repo root** — never an absolute path. |
| `duration_ms` | `41230` | Wall-clock duration. |
| `exit_code` | `0` | The command's exit code. |
| `os` / `arch` | `darwin` / `arm64` | |
| `cpu_cores` / `cpu_model` | `10` / `Apple M2 Pro` | Static machine profile — informs tooling defaults (memory caps, turbo concurrency). |
| `mem_gb` / `mem_free_gb` | `32` / `3.21` | Total RAM class and free RAM at command start (headroom for memory tuning). |
| `os_version` | `macOS 14.6.1`, `Ubuntu 22.04` | Friendly OS version where cheap; kernel release otherwise. |
| `node_version`, `repo_version`, `schema_version` | | For segmenting. |

**Sent:** the sanitized argv (`args`), plus the repo-relative `dir`, binary +
version, timing, exit code, OS, and a static machine profile (CPU/RAM/OS version —
none of it identifying). **Never sent:** git email, username, absolute paths as a
field (the `dir` is repo-relative). `args` is sanitized before sending: for
the first secret-carrying word (`config`, `login`, `publish`, `token`) — whether a
subcommand or baked into a flag (`--config.//…=SECRET`) — the arg is kept up to the
word plus up to 4 hint chars, and everything after is dropped (e.g.
`["--filter","foo","config"]`, `["install","--config.//r"]`). The home dir is
replaced with `~`. Everything else is sent as-is, so scrub/aggregate on the
collection side too.

One lifecycle event is also sent: **`dev:metrics_opt_in`**, fired once when a
developer opts in (the transition into `granted`), under the same anonymous
weekly `anonymousId` with only the common properties (os/arch/node/repo/schema).
Opting *out* is deliberately **not** tracked — we don't send telemetry about
someone who just declined it.

## Privacy & anonymity

- **Opt-in.** Off until an internal developer accepts the prompt. External
  contributors are never prompted and never tracked.
- **Anonymous.** The `anonymousId` is a random UUID that **rotates every ISO
  week**, so individuals cannot be followed across weeks. Weekly unique
  `anonymousId` counts give "how many developers" without identifying anyone.
- **Scoped.** Only commands run inside an n8n checkout are considered; the
  tracker resolves the monorepo root from the command's cwd and sends nothing
  otherwise.
- **No IP.** Each event is sent with `context.ip` = `0.0.0.0`, so RudderStack
  records no caller IP and does no geo-lookup — the weekly id is the only
  identifier.
- **Non-disruptive.** The tracker runs detached with a 2s network timeout and
  swallows all errors; it can never slow or fail your command.

## Tracking another binary

Add it to `SHADOWED_BINARIES` in **setup.mjs** — that's it:
```js
const SHADOWED_BINARIES = ['pnpm', 'turbo'];
```
The tracker sends its raw argv like any other binary; no per-binary code needed.

Existing installs pick up the new binary on the next `pnpm install` (the granted
bootstrap re-runs the install, which is idempotent). The shim itself is versioned
via `# n8n-shadow-shim-version`; shims are re-rendered when their content changes
(version bump or a moved real binary). Each binary's version is detected per
command by the backgrounded tracker (`<bin> --version`), so it's always current.

## Managing it

```bash
pnpm dev-metrics:opt-in                         # opt in + replace binaries with shims
pnpm dev-metrics:status                         # show consent + per-binary shim status
pnpm dev-metrics:reset                          # restore binaries + wipe state -> first-run
node scripts/dev-metrics/setup.mjs --disable    # opt out (records denied) + restore binaries
export N8N_DEV_TELEMETRY=0                       # runtime kill switch (no sending)
```

Defaults point at the `n8n-dev` RudderStack workspace (its data plane + HTTP
source write key, baked into `track.mjs` — client-side keys, safe to ship).
Override with `N8N_DEV_METRICS_RUDDERSTACK_URL` / `N8N_DEV_METRICS_RUDDERSTACK_KEY`
(e.g. point the URL at the local stub when testing).

## Testing locally

`track.mjs` reads its data plane from `N8N_DEV_METRICS_RUDDERSTACK_URL`, so you
can point it at the bundled stub instead of the real one and watch events arrive.

```bash
# terminal A — start the stub (optionally append raw events to a file)
node scripts/dev-metrics/capture-server.mjs --port 9999 --out /tmp/events.jsonl
```

```bash
# terminal B — drive the tracker directly (fastest; run from inside the repo)
U=$(mktemp -d); mkdir -p "$U/.n8n/dev"; echo '{"consent":"granted"}' > "$U/.n8n/dev/dev-telemetry.json"
N8N_USER_FOLDER="$U" \
N8N_DEV_METRICS_RUDDERSTACK_URL=http://localhost:9999 \
N8N_DEV_TRACK_BIN=pnpm N8N_DEV_TRACK_MS=1234 N8N_DEV_TRACK_CODE=0 N8N_DEV_TRACK_CWD="$PWD" \
node scripts/dev-metrics/track.mjs run build   # argv after the script = the command's args
```

To exercise the **full path** (actually type `pnpm`), point the tracker at the
stub, opt in, run a command, then restore:

```bash
export N8N_DEV_METRICS_RUDDERSTACK_URL=http://localhost:9999
node scripts/dev-metrics/setup.mjs --enable   # replaces pnpm with the shim in place
pnpm list          # → event appears in terminal A (wait ~1s; it's backgrounded)
node scripts/dev-metrics/setup.mjs --reset    # restores the real pnpm
```

Nothing is sent unless **consent is granted** and the command runs **inside an
n8n checkout**; `N8N_DEV_TELEMETRY=0` disables sending entirely.

`sh scripts/dev-metrics/test/selfcheck.sh` runs the whole enable→run→reset flow
against a fake binary in a temp dir (never touches your real pnpm).

## Querying

Once the `n8n-dev` RudderStack source is wired to a destination (warehouse /
analytics tool), query the `dev:cli_command` events there:

- **Most-used commands:** derive a subcommand from `args` (e.g. its first token)
  and group by it, optionally filtered by `binary`.
- **How many developers:** unique `anonymousId` per ISO week.
- **Opt-ins:** unique `anonymousId` on `dev:metrics_opt_in`.
- **Human vs AI agent:** group any of the above by `actor`.
- **Which packages:** group by `dir`.
- **How long commands take:** p50/p90 of `duration_ms`, grouped by the derived
  subcommand.
- **Fleet profile:** distribution of `mem_gb` / `cpu_cores`, Apple-Silicon vs
  Intel vs Linux split via `cpu_model`/`arch`, OS versions via `os_version` — to
  tune tooling defaults (e.g. `pnpm agent:setup` memory caps and concurrency)
  against the machines devs actually run.
