# rig

`rig` creates and runs local n8n environments. An environment has a fixed
topology: SQLite or Postgres, regular or queue mode, one or more mains,
workers, task runners through the launcher, and engine v2. Postgres and Redis
run in containers. n8n runs as local processes from your checkout or worktree.

Design and status: [`.agents/specs/rig.md`](../../../../.agents/specs/rig.md).

## Setup

You need Docker, Node, and a build of the repository (`pnpm build`).
The Python runner needs [`uv`](https://docs.astral.sh/uv/). `pnpm rig doctor`
checks all of it.

Run `pnpm rig` from the repository root. In a package directory, use
`pnpm -w rig`.

### Task runner launcher

External task runners need the
[task runner launcher](https://github.com/n8n-io/task-runner-launcher). By
default, `rig` uses the release that the runners image of the checkout pins
(`LAUNCHER_VERSION` in `docker/images/runners/Dockerfile.debian`), and caches
it in `~/.cache/rig/launcher/<version>/`:

- On Linux, `rig` downloads the release and checks its SHA-256 sum.
- On macOS, releases have no binary. `rig` builds the release source once with
  Go.

To use another release, or your own launcher checkout:

```bash
pnpm rig config set launcher.version 1.5.1
pnpm rig config set launcher.path ~/work/task-runner-launcher   # rig runs `make build` when the Go code changes
pnpm rig config unset launcher.path
```

### Global install

```bash
pnpm rig install-global       # builds rig and writes ~/.local/bin/rig
rig --version
```

The global `rig` is one bundled file in
`~/.local/share/rig/versions/<version>+<commit>/`. It does not depend on the
checkout that built it, so a branch switch or a deleted worktree does not
break it.

- Inside an n8n checkout that contains rig, the global `rig` runs the rig of
  that checkout. `RIG_NO_DELEGATE=1` turns this off. `rig --version` shows
  both versions.
- Outside a checkout, `rig` runs n8n from `repo` in the global config
  (`rig config set repo ~/work/n8n`). To pin one environment to a checkout,
  set `source: repo:<path>` in its `env.yaml`.
- `rig self-update` rebuilds from the current checkout, `repo`, or the
  checkout of the installed version. `rig self-update --rollback` returns to
  the previous version. `rig` keeps the last five versions.

## Quick start

```bash
pnpm rig create                      # interactive wizard (arrow keys)
pnpm rig create mm --preset multi-main
pnpm rig up                          # services + all components, merged logs
```

`rig create` without topology flags starts a wizard. Choose a preset, or
choose `custom` to pick the database, execution mode, mains, workers, engine
v2, and runners one by one.

In `rig up` and `rig run`, press `o` to open the editor in the browser, `p` to
open the public URL (see below), `r` to
restart components with changed env vars, `R` to restart all of them, and `q`
to quit. Quitting stops the
components of that terminal. The containers keep running.

## Public HTTPS URL

A Cloudflare tunnel gives `main-1` a public HTTPS URL, for example for webhooks
from external services and OAuth callbacks. Create the environment with
`--tunnel`, choose it in the wizard, or add it to `env.yaml`:

```yaml
tunnel: cloudflare        # quick tunnel: random https://<words>.trycloudflare.com, no account
```

The tunnel runs as a container next to Postgres and Redis. `rig` sets
`N8N_WEBHOOK_URL` to the public URL and `N8N_PROXY_HOPS=1`. n8n also builds
OAuth callback URLs from it. The editor stays on localhost. A quick tunnel keeps
its URL until `pnpm rig stop`. After a new URL, running components show drift.

For a URL that does not change, use a named tunnel from the Cloudflare
dashboard. Point its public hostname at `http://host.docker.internal:5678`, and
put the token in secrets.env (`pnpm rig env edit --on secrets`):

```yaml
tunnel:
  provider: cloudflare
  hostname: n8n-dev.example.com   # needs CLOUDFLARE_TUNNEL_TOKEN in secrets.env
  target: main-1                  # optional, the main to expose
```

`pnpm rig status` shows the URL. `pnpm rig open --public` opens it.

## Run components in separate terminals

```bash
# Terminal 1
pnpm rig run main-1          # also runs launcher@main-1
# Terminal 2
pnpm rig run worker          # all workers and their launchers
```

When a dependency is not running, `rig run` asks you to start it in the
background or to wait for it. `--yes` starts it in the background.

| Topology | Components |
|---|---|
| Regular mode | `main-1`, `launcher@main-1` |
| Queue mode | `main-N`, `worker-N`, a launcher for each worker, and for each main that does not offload manual executions |
| Engine v2 remote | `main-1`, `engine`, `launcher@main-1`, `launcher@engine` |

## Env vars

Env vars come from layers. A later layer wins:

1. Defaults and wiring from `rig` (ports, database, Redis, engine URLs)
2. `env/shared.env`
3. `env/<role>.env`: `main`, `worker`, `engine`, `launcher`
4. `env/<component>.env`, for example `env/worker-2.env`
5. `secrets.env` (mode 0600)
6. `rig run -e KEY=VALUE` (not saved)

The runners of a launcher get `env/runner-js.env` or `env/runner-py.env`, then
`env/runner-js@<host>.env`.

```bash
pnpm rig env browse                                # interactive editor, see below
pnpm rig env set N8N_LOG_LEVEL=debug --on worker   # one role
pnpm rig env set N8N_LOG_LEVEL=debug --on worker-2 # one component
pnpm rig env set NODE_FUNCTION_ALLOW_EXTERNAL=lodash --on runner-js
pnpm rig env edit --on main                        # opens $EDITOR
pnpm rig env ls worker-1                           # resolved env with sources
pnpm rig env explain N8N_LOG_LEVEL --on worker-2   # every layer that sets the key
```

After a change, `rig` lists the running components that the change affects and
offers a restart. The terminal that runs them also shows the drift.

### Interactive editor

`pnpm rig env browse [--on <layer>]` lists every env var that n8n reads. `rig`
finds them in the `@Env` declarations of your checkout, with their
descriptions, types, defaults, and allowed values.

- Type to search names, descriptions, and config groups. Vars that the layer
  sets come first, with their values.
- Pick a var to see its details and the value that each component runs with.
- Enums and booleans show a list of options. Lists of enums, such as
  `N8N_LOG_OUTPUT`, show checkboxes. Other types use a text field. Empty input
  unsets the var.
- `⇄ Change layer` switches between `shared`, roles, and components.
  `+ Other variable…` sets a name that n8n does not declare.
- Ctrl+C in a value prompt goes back to the search. `✓ Done` or Ctrl+C in the
  search ends the session and offers to restart the affected components.

The first run reads the source with the TypeScript compiler and takes a few
seconds. Later runs use a cache until the commit or one of the scanned files
changes. `--refresh` reads the source again.

## Commands

| Command | Function |
|---|---|
| `create`, `ls`, `use`, `reset`, `destroy` | Manage environments |
| `up`, `run`, `stop`, `restart`, `status`, `logs`, `open` | Run components |
| `services up\|down` | Start or stop only the containers |
| `env browse\|set\|unset\|edit\|ls\|explain` | Read and change env vars |
| `exec <component> -- <cmd>` | Run a command with the env of a component |
| `print <component> --format shell\|dotenv\|json` | Print the resolved env |
| `psql`, `redis-cli` | Open a shell in a service container |
| `config get\|set\|unset` | Read and change the global config: `launcher.path`, `launcher.version`, `repo` |
| `doctor` | Check Docker, Node, Go, `uv`, the checkout and its build, the launcher, ports, and the global install |
| `install-global`, `self-update [--rollback]` | Install and update the global `rig` |

Add `--env <name>` after a command to select an environment. Without it,
`rig` uses `RIG_ENV`, then the default environment from `rig use`.

## Files

| Path | Content |
|---|---|
| `~/.config/rig/config.yaml` | Global config |
| `~/.local/share/rig/envs/<name>/env.yaml` | Topology |
| `~/.local/share/rig/envs/<name>/env/*.env` | Env layers |
| `~/.local/share/rig/envs/<name>/secrets.env` | Generated and own secrets |
| `~/.local/share/rig/envs/<name>/logs/` | One log file for each component |
| `~/.local/share/rig/envs/<name>/data/` | User folders and binary data |

`~/.cache/rig/env-catalog/` holds the env var catalog of each checkout, and
`~/.cache/rig/launcher/` the launcher releases. `~/.local/share/rig/versions/`
holds the global installs. `RIG_CONFIG_DIR`, `RIG_DATA_DIR`, `RIG_CACHE_DIR`,
and `RIG_BIN_DIR` (the shim directory, default `~/.local/bin`) change these
locations.

## Relation to n8n-containers

`pnpm --filter n8n-containers services` starts short-lived test containers for
`pnpm dev`. `rig` starts persistent containers for a full topology. Both read
the image tags from `n8n-containers/test-containers.ts`.
