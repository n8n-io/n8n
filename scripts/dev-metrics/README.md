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
       track.mjs  (found by walking up from $PWD) → PostHog capture API
```

- Replaced **in place**, so it works regardless of PATH order. If the binary's
  dir isn't writable it's skipped (rare — corepack pnpm lives in a user-writable
  dir).
- `N8N_DEV_SHIM_ACTIVE` guards against double-counting nested calls (e.g.
  `turbo -> pnpm`) and the tracker's own `<bin> --version` probe.
- The tracker (`track.mjs`) is a committed file found by walking up from `$PWD`,
  so each checkout uses its own and pnpm runs outside any n8n checkout are
  ignored. pnpm prompts via `/dev/tty` because it pipes lifecycle-script stdio.

| File | Role |
| --- | --- |
| `setup.mjs` | Consent prompt; replaces/restores binaries; `--status`/`--enable`/`--disable`/`--reset`. |
| `shadow-shim.sh` | Shim template (versioned via `# n8n-shadow-shim-version`); rendered per binary with the binary name, saved-real path, and its dir baked in. |
| `track.mjs` | Builds the anonymous event and POSTs it to PostHog (fire-and-forget). |
| `capture-server.mjs` | Local PostHog stub for testing — logs every event instead of sending it upstream. |

State lives in `~/.n8n/dev-telemetry.json` (separate from n8n's secret `config`):

```json
{ "schemaVersion": 1, "consent": "granted", "anonId": "<uuid>", "week": "2026-W26" }
```

## What is sent

Event `dev:cli_command` with `distinct_id` = the weekly anonymous id, and:

| Property | Example | Notes |
| --- | --- | --- |
| `actor` | `human`, `claude-code`, `cursor`, `ci` | Who ran it, inferred from env markers (`CLAUDECODE`, `CURSOR_TRACE_ID`, `AIDER_VERSION`, `CI`/`GITHUB_ACTIONS`); defaults to `human`. |
| `binary` | `pnpm` | The shadowed CLI. |
| `binary_version` | `10.32.1` | The CLI's own version, detected at runtime by the tracker via `<bin> --version` (`null` if unknown). |
| `command` | `build`, `test`, `install` | Allowlisted per binary (for pnpm: root `package.json` scripts + builtins); anything else → `other`. |
| `duration_ms` | `41230` | Wall-clock duration. |
| `exit_code` | `0` | The command's exit code. |
| `os` / `arch` | `darwin` / `arm64` | |
| `node_version`, `repo_version`, `schema_version` | | For segmenting. |

**Never sent:** paths, file names, branch names, git email, username, or raw
command arguments. Only allowlisted command names leave the machine.

One lifecycle event is also sent: **`dev:metrics_opt_in`**, fired once when a
developer opts in (the transition into `granted`), under the same anonymous
weekly `distinct_id` with only the common properties (os/arch/node/repo/schema).
Opting *out* is deliberately **not** tracked — we don't send telemetry about
someone who just declined it.

## Privacy & anonymity

- **Opt-in.** Off until an internal developer accepts the prompt. External
  contributors are never prompted and never tracked.
- **Anonymous.** The `distinct_id` is a random UUID that **rotates every ISO
  week**, so individuals cannot be followed across weeks. Weekly unique
  `distinct_id` counts give "how many developers" without identifying anyone.
- **Scoped.** Only commands run inside an n8n checkout are considered; the
  wrapper looks for `scripts/dev-metrics/track.mjs` by walking up from `$PWD`.
- **Non-disruptive.** The tracker runs detached with a 2s network timeout and
  swallows all errors; it can never slow or fail your command.

## Tracking another binary

To start tracking, say, `turbo`:

1. **setup.mjs** — add it to `SHADOWED_BINARIES`:
   ```js
   const SHADOWED_BINARIES = ['pnpm', 'turbo'];
   ```
2. **track.mjs** — optionally register a resolver in `BINARY_RESOLVERS` so command
   names are meaningful and PII-safe (e.g. return the leading bareword
   subcommand). Without one, the binary is still recorded but `command` is
   always `other`.

Existing installs pick up the new binary on the next `pnpm install` (the granted
bootstrap re-runs the install, which is idempotent). The shim itself is versioned
via `# n8n-shadow-shim-version`; shims are re-rendered when their content changes
(version bump or a moved real binary). Each binary's version is detected per
command by the backgrounded tracker (`<bin> --version`), so it's always current.

## Managing it

```bash
node scripts/dev-metrics/setup.mjs --status    # show consent + per-binary shim status
node scripts/dev-metrics/setup.mjs --enable    # opt in + replace binaries with shims
node scripts/dev-metrics/setup.mjs --disable   # opt out (records denied) + restore binaries
node scripts/dev-metrics/setup.mjs --reset     # restore binaries + wipe state -> first-run
export N8N_DEV_TELEMETRY=0                      # runtime kill switch (no sending)
```

Endpoint and key are overridable for a dedicated PostHog project:
`N8N_DEV_METRICS_POSTHOG_HOST`, `N8N_DEV_METRICS_POSTHOG_KEY` (defaults reuse
n8n's existing PostHog instance at `ph.n8n.io`).

## Testing locally

`track.mjs` reads its endpoint from `N8N_DEV_METRICS_POSTHOG_HOST`, so you can
point it at the bundled stub instead of `ph.n8n.io` and watch events arrive.

```bash
# terminal A — start the stub (optionally append raw events to a file)
node scripts/dev-metrics/capture-server.mjs --port 9999 --out /tmp/events.jsonl
```

```bash
# terminal B — drive the tracker directly (fastest; run from inside the repo)
U=$(mktemp -d); mkdir -p "$U/.n8n"; echo '{"consent":"granted"}' > "$U/.n8n/dev-telemetry.json"
N8N_USER_FOLDER="$U" \
N8N_DEV_METRICS_POSTHOG_HOST=http://localhost:9999 \
N8N_DEV_TRACK_BIN=pnpm \
N8N_DEV_TRACK_ARGS='run build' N8N_DEV_TRACK_MS=1234 N8N_DEV_TRACK_CODE=0 N8N_DEV_TRACK_CWD="$PWD" \
node scripts/dev-metrics/track.mjs
```

To exercise the **full path** (actually type `pnpm`), point the tracker at the
stub, opt in, run a command, then restore:

```bash
export N8N_DEV_METRICS_POSTHOG_HOST=http://localhost:9999
node scripts/dev-metrics/setup.mjs --enable   # replaces pnpm with the shim in place
pnpm list          # → event appears in terminal A (wait ~1s; it's backgrounded)
node scripts/dev-metrics/setup.mjs --reset    # restores the real pnpm
```

Nothing is sent unless **consent is granted** and the command runs **inside an
n8n checkout**; `N8N_DEV_TELEMETRY=0` disables sending entirely.

`sh scripts/dev-metrics/selfcheck.sh` runs the whole enable→run→reset flow
against a fake binary in a temp dir (never touches your real pnpm).

## Querying in PostHog

- **Most-used commands:** Trends on `dev:cli_command`, break down by `command`
  (optionally filter by `binary`), math = total count.
- **How many developers:** same event, math = unique `distinct_id` (per week).
- **Opt-ins:** Trends on `dev:metrics_opt_in`, math = unique `distinct_id`.
- **Human vs AI agent:** break any of the above down by `actor`.
- **How long commands take:** Trends on `duration_ms`, math = p50/p90, broken
  down by `command`.
