# rig

`rig` creates and runs local n8n environments. An environment has a fixed
topology: SQLite or Postgres, regular or queue mode, one or more mains,
workers, task runners through the launcher, and engine v2. Postgres, Redis,
and the optional Mailpit server run in containers. n8n runs as local processes from your checkout or worktree.

## Setup

You need Docker or Podman, Node, and a build of the repository (`pnpm build`).
The Python runner needs [`uv`](https://docs.astral.sh/uv/). `pnpm rig doctor`
checks all of it.

### Docker or Podman

Postgres, Redis, tunnels, and Mailpit run as containers. The first time `rig` needs
them, it checks which of Docker and Podman is installed. With one, it uses that
one. With both, it asks which one to use. It saves the choice in the global
config:

```bash
pnpm rig config set container.runtime podman   # or docker
RIG_CONTAINER_RUNTIME=docker pnpm rig up         # for one command
```

### Browser and editor

The first time `rig` opens a URL (`o` in `rig up`, `rig open`), it lists the
browsers it finds (Chrome, Firefox, Safari, Arc, Brave, Edge, and more) and
asks which one to use. The first time it opens a file (`rig edit`,
`rig env edit`, `rig config edit`), it asks for the editor: VS Code, Cursor,
Windsurf, Zed, Sublime Text, JetBrains IDEs, Neovim, Vim, Helix, micro, nano,
Emacs, or `$VISUAL`/`$EDITOR`. GUI editors open with `--wait`, so `rig` can
offer a restart when you close the file.

```bash
pnpm rig config set browser firefox     # default, a listed id, or a macOS app name
pnpm rig config set editor cursor       # env ($VISUAL/$EDITOR), a listed id, or a command line
pnpm rig config set editor "code-insiders --wait"
```

Podman needs a running machine on macOS (`podman machine start`) and a compose
provider for `podman compose` (`docker-compose` or `podman-compose`). Stop the
services (`pnpm rig stop`) before you switch: `rig` manages the containers only
in the runtime that is set.

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
  that checkout. A hand-off runs code of the checkout, so the first time `rig`
  asks you to trust it. It saves the trusted checkouts in
  `~/.local/share/rig/trusted-checkouts.json`. Without a terminal, the global
  version runs instead. `RIG_NO_DELEGATE=1` turns this off. `rig --version`
  shows both versions.
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

In `rig up` and `rig run`, the last line of the terminal shows the state of
each component (`●` ready, `◌` starting, `✖` exited, `⟳` env drift). Keys:

| Key | Action |
|---|---|
| `o` | Open the editor in the browser |
| `p` | Open the public URL (see below) |
| `m` | Open the Mailpit UI (see [Email](#email)) |
| `r` / `R` | Restart the components with changed env vars / all components |
| `1`–`9`, `0` | Show only the logs of the numbered components (a key adds or removes one), `0` shows all |
| `?` | Show the keys |
| `q` | Quit. This stops the components of the terminal. The containers keep running |

With `N8N_LOG_FORMAT=json`, the terminal shows each line in a readable form.
The log files keep the raw lines, and `rig logs --raw` shows them.

`pnpm rig clone <env> <new>` copies an environment with fresh data.

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

`rig` passes the token to the container through its environment, so it stays
out of the compose file and out of `ps`. Anyone with access to the container
runtime can still read it with `docker inspect rig-<env>-tunnel`.

`pnpm rig status` shows the URL. `pnpm rig open --public` opens it.

## Email

[Mailpit](https://mailpit.axllent.org/) catches every email that n8n sends,
for example user invites and password resets. No email leaves your machine.
Create the environment with `--mail`, choose it in the wizard, or add it to
`env.yaml`:

```yaml
mail: mailpit
```

Mailpit runs as a container next to Postgres and Redis. `rig` sets
`N8N_EMAIL_MODE=smtp` and points the `N8N_SMTP_*` variables of the mains and
workers at it. The emails stay when you stop the services. `pnpm rig reset`
and `pnpm rig destroy` delete them with the database.

Open the Mailpit UI with `m` in `rig up`, or with `pnpm rig open --mail`
(default `http://127.0.0.1:8025`). To test the Send Email node, create an SMTP
credential with host `127.0.0.1`, port `1025`, and SSL/TLS off. Mailpit
accepts any user and password. `pnpm rig status` shows both ports.

```yaml
mail:
  provider: mailpit
  smtpPort: 1025          # optional, the SMTP port on the host
  uiPort: 8025            # optional, the port of the UI and the API
```

## Run components in separate terminals

```bash
# Terminal 1
pnpm rig run main-1          # also runs launcher@main-1
# Terminal 2
pnpm rig run worker          # all workers and their launchers
```

When a dependency is not running, `rig run` asks you to start it in the
background or to wait for it. `--yes` starts it in the background, and
`--wait-deps` waits for another terminal.

`pnpm rig up --split` opens one tmux pane for each n8n process. Each pane runs
`rig run <process>` with its launcher or runners. Inside tmux, `rig` adds a
window. Outside, it creates the session `rig-<env>` and attaches to it.

| Topology | Components |
|---|---|
| Regular mode | `main-1`, `launcher@main-1` |
| Queue mode | `main-N`, `worker-N`, and a launcher for each worker. Mains offload manual executions to the workers, so they get no launcher. `rig` sets `OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS=true` by default in every environment; n8n reads it only in queue mode. Set it to `false` on a main to give that main a launcher |
| Engine v2 remote | `main-1`, `engine`, `launcher@main-1`, `launcher@engine` |
| `runners.via: direct` | No launchers: `runner-js@<host>` and `runner-py@<host>` for each process that runs tasks |

With `runners.via: direct` (`--runners direct`, or the wizard), `rig` runs each
task runner as its own component and gets its grant token from the broker, as
the launcher does. Use it to debug a runner, or to see its logs on their own.
A restart of a process also restarts its runners.

## Debugging

```bash
pnpm rig run main-1 --inspect          # Node inspector on port block +5: 127.0.0.1:5683
pnpm rig run worker-1 --inspect-brk    # wait for the debugger before the first line
pnpm rig print main-1 --format vscode  # a launch and an attach configuration for .vscode/launch.json
```

Attach from `chrome://inspect` or with the attach configuration. A restart
keeps the inspector. `rig status` shows the inspector port.

## Parallel environments

Each environment has a port slot (`slot` in env.yaml, default 0). Slot `k`
adds `1000 * k` to the n8n ports, `10 * k` to the engine ports, and `k` to the
Postgres, Redis, tunnel, and Mailpit ports. Environments with different slots run at the
same time. `rig create --slot auto` and `rig clone` pick a free slot. When a
port is in use by another environment, `rig` names it and suggests a free slot.

## Engine TLS

`engineTls: true` (`--engine-tls`, or the wizard) turns on mutual TLS between
the main and the engine in `engine: remote`. `rig` creates a CA and a
certificate for each plane in `engine-tls/` with openssl, and renews them
before they expire.

## Env vars

Env vars come from layers. A later layer wins:

1. Defaults and wiring from `rig` (ports, database, Redis, engine URLs)
2. Profiles that the environment turns on, in order (see below)
3. `env/shared.env`
4. `env/<role>.env`: `main`, `worker`, `engine`, `launcher`
5. `env/<component>.env`, for example `env/worker-2.env`
6. `~/.config/rig/secrets.env` (global), then the `secrets.env` of the
   environment. Both have mode 0600
7. `rig run -e KEY=VALUE` (not saved)

The runners of a launcher get `env/runner-js.env` or `env/runner-py.env`, then
`env/runner-js@<host>.env`.

```bash
pnpm rig env browse                                # interactive editor, see below
pnpm rig env set N8N_LOG_LEVEL=debug --on worker   # one role
pnpm rig env set N8N_LOG_LEVEL=debug --on worker-2 # one component
pnpm rig env set NODE_FUNCTION_ALLOW_EXTERNAL=lodash --on runner-js
pnpm rig env edit --on main                        # opens your editor (see below)
pnpm rig env ls worker-1                           # resolved env with sources
pnpm rig env explain N8N_LOG_LEVEL --on worker-2   # every layer that sets the key
pnpm rig env diff main-1 worker-1                  # keys that differ, also <env>:<component>
pnpm rig env set MY_API_KEY=… --secret             # secrets.env of the environment
pnpm rig env set N8N_LICENSE_CERT=… --on global-secrets   # every environment
```

### Profiles

A profile is a reusable env file in `~/.config/rig/profiles/<name>.env`. Any
environment can turn it on.

```bash
pnpm rig env set N8N_LOG_LEVEL=debug --on profile:debug   # creates the profile
pnpm rig profile on debug                                 # this environment uses it
pnpm rig profile ls
pnpm rig profile off debug
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
| `create`, `ls`, `use`, `reset`, `destroy`, `clone` | Manage environments |
| `up`, `run`, `stop`, `restart`, `status`, `logs`, `open` | Run components |
| `services up\|down` | Start or stop only the containers |
| `env browse\|set\|unset\|edit\|ls\|explain\|diff` | Read and change env vars |
| `profile ls\|on\|off` | Turn profiles on or off |
| `exec <component> -- <cmd>` | Run a command with the env of a component |
| `print <component> --format shell\|dotenv\|json\|vscode` | Print the resolved env, or VS Code launch configurations |
| `psql`, `redis-cli` | Open a shell in a service container |
| `config get\|set\|unset\|edit` | Read and change the global config: `launcher.path`, `launcher.version`, `repo`, `container.runtime`, `browser`, `editor` |
| `edit` | Open env.yaml in your editor, then check it |
| `doctor` | Check Docker or Podman, Node, Go, `uv`, the checkout and its build, the launcher, ports, and the global install |
| `install-global`, `self-update [--rollback]` | Install and update the global `rig` |

Add `--env <name>` after a command to select an environment. Without it,
`rig` uses `RIG_ENV`, then the default environment from `rig use`.

## Files

| Path | Content |
|---|---|
| `~/.config/rig/config.yaml` | Global config |
| `~/.config/rig/profiles/<name>.env` | Profiles |
| `~/.config/rig/secrets.env` | Global secrets |
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
