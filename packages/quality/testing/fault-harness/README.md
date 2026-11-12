# Fault harness

`@n8n/fault-harness` runs a real n8n stack in Docker under test control. Use it when a bug depends on timing between processes, for example a worker that gets SIGTERM while it holds a job. A test can pause any method inside a running n8n process. It can then signal, freeze or restart containers, and read Postgres, Redis and the logs.

The harness needs no change to n8n. It works on released images and on local builds.

## Set up

From the repository root, install and build the packages the harness depends on:

```bash
pnpm install
pnpm turbo build --filter='@n8n/fault-harness^...' > build.log 2>&1
```

Docker must be running. A stack starts Postgres, Redis, a main and its workers as separate containers.

## How it works

The harness builds on the `n8n-containers` stacks. It loads a preload script into every n8n process through `NODE_OPTIONS`. The preload wraps the methods named in the hook specs as their files load. The test arms and releases hooks by writing files inside the container. It reads hits from `[fault-harness]` lines in the container log. Signals, freezes and restarts use `docker kill`, `docker pause` and `docker start`.

`HarnessStack.start` starts a stack with its hooks. The stack has a REST client (`harness.api`), a Postgres probe (`harness.db`) and a Redis probe (`harness.redis`). The `scale` option divides the Bull lock, lock renewal and stall timeouts and the graceful shutdown window. A test that waits for a stalled job then takes seconds, not minutes. `scale` must be 1 or more. `env` can override any single value. `chain(name, nodes)` builds a workflow that runs the nodes in order, from `nodes.webhook` and `nodes.code`.

Single-main stacks start with an empty licence, so a licence in your shell cannot change their results. A licence that the test sets in `env` still applies.

### Hook specs

A hook wraps one method in a compiled n8n file. By default it pauses the call until the test releases it. It can also only log the call. A `set` hook wraps no method: it writes fixed values into the module when the file loads, before n8n reads them. The test arms a hook with `hook(containers, point).arm()`, waits for it with `waitHit`, and lets the call continue with `release`. `HarnessStack.start` fails at once if a hook did not install, so a wrong file or method name fails before the test starts.

| Field | Meaning |
|---|---|
| `point` | Name of the hook, used to arm it and to match its hits |
| `file` | Path suffix of the compiled file; `FILES` lists the known ones |
| `target`, `method` | Where the method lives inside the module exports, such as `JobProcessor.prototype`, `prototype` for a class export, or `''` for the exports object, and the method name. A `set` hook has a `target` and no `method` |
| `kind` | `pause` (default: wait for release, then call through), `observe` (log a hit only), or `set` (write `values`) |
| `arm` | `file` (default: the test arms it) or `always` (default for `observe`) |
| `once` | Fire once each time the hook is armed (default) |
| `scope` | Another method (`file`, `target`, `method`); fire only inside a call of it, at most once per call |
| `where` | Conditions on the call, such as `[{ path: 'args.0.node.name', equals: 'Pause' }]`; a condition can use `truthy` instead of `equals` |
| `detail` | Values to log with each hit, such as `{ executionId: 'args.0.executionId' }` |
| `phase` | `before` the call (default) or `after` it resolves, when `where` and `detail` can also read `result` |
| `values` | For a `set` hook: JSON values to write onto the `target` object, such as `{ runningStepMs: 20000 }`. Each key must already be a writable data property of the target, so write a constant on the module that defines it, not on an `index.js` that re-exports it through a getter. Otherwise the hook logs `missing` and writes nothing. The only other fields a `set` hook takes are `point`, `file`, `roles`, `lazy` and `optional` |
| `roles`, `lazy` | Containers that must show the hook installed before the test starts (`main`, `worker` or `engine`; default `worker`); `lazy` skips that check for a file that loads only on first use |
| `optional` | For a file that older images do not have: the install check passes when the file never loads, and still fails when it loads without the method or keys |

Paths in `where` and `detail` start at `args`, `this`, `scope.args` or `result`. A paused call continues by itself after two minutes if the test never releases it.

## Limits

Hooks depend on compiled file paths and on class and method names, so a refactor in n8n can break them. The install check names every hook that does not install. Log text can change between versions.

The runners image follows `TEST_IMAGE_N8N` with the same tag (`n8nio/runners:<tag>`). The `image` option of `HarnessStack.start` changes only the n8n image, so use it only with internal runners.

A test with shortened timeouts shows the mechanism of a bug, not its timing in production.

## Clean up

The tests call `stopAllStacks` after each test. If a process dies before that, remove what is left:

```bash
docker ps -aq --filter 'name=^harness-' | xargs docker rm -f
docker network prune -f --filter 'label=org.testcontainers=true'
```

## Test the harness

```bash
pnpm test:docker
```

The Docker test starts a real stack on `n8nio/n8n:2.42.2`, or on the image in `TEST_IMAGE_N8N`.
