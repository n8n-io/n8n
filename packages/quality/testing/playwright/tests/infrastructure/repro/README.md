# Repro harness

Local-only harness that reproduces queue-mode, drain and runner bugs on a fresh container stack. It runs against any n8n Docker image: a released tag, or an image built from any branch. The harness does not need to be on the branch under test.

This branch (`repro-harness`) is never pushed. Its canonical home is a separate clone, not a worktree, so worktree cleanup cannot remove it:

```bash
HARNESS=~/Workspace/tools/repro-harness
BUILDS=~/Workspace/tools/rb        # keep this path short, see "Build an image from a branch"
```

## Set up the clone (once)

Clone from the local n8n repository (fast, objects are hard-linked), then point `origin` at GitHub for fetches and disable pushes:

```bash
git clone --branch repro-harness ~/Workspace/n8n "$HARNESS"
cd "$HARNESS"
git remote set-url origin https://github.com/n8n-io/n8n.git
git remote set-url --push origin DISABLED
git branch --unset-upstream
git fetch --prune origin

pnpm install --frozen-lockfile
pnpm turbo build --filter='n8n-playwright^...' > build.log 2>&1
```

Rebuild the Playwright dependencies (the last command) after you rebase the branch.

## Run scenarios

Each scenario is listed in `scenarios.json` with its issue, spec, and `before` and `after` images. The runner pulls released images when missing, runs each variant 5 times (one Playwright process per variant), and prints a pass table:

```bash
cd "$HARNESS/packages/quality/testing/playwright/tests/infrastructure/repro"
node run.mjs                                   # every scenario, both variants, 5 runs
node run.mjs worker-drain-fetched-job --runs 1 # one scenario, one run each
node run.mjs --variant before                  # only the before images
node run.mjs --after-image n8nio/n8n:repro-x    # every after variant on one image
```

- `env` in a `scenarios.json` entry is passed to that scenario's Playwright process; the runner-mode variants use `REPRO_RUNNERS=external`
- A variant passes when the image behaves as the spec expects for that variant: the bug's failure mode on `before`, correct behaviour on `after`. A `before` run that fails for another reason is reported as a failure
- Results go to `$TMPDIR/repro-results/<timestamp>/<scenario>.<variant>.jsonl` (or `--out DIR`). Each line holds the outcome fields, `passed` and a timestamped `timeline` of steps
- Logs of the last run of each test are in `packages/quality/testing/playwright/test-results/*/logs/`

To run one spec by hand against any image:

```bash
cd "$HARNESS/packages/quality/testing/playwright"
TEST_IMAGE_N8N=n8nio/n8n:2.42.2 REPRO_VARIANT=before REPRO_RESULTS_FILE=/tmp/repro/x.jsonl \
npx playwright test --project=repro:infrastructure --reporter=line tests/infrastructure/repro/<spec>
```

The stack derives the runners image from the n8n image (`n8nio/runners:<same tag>`). The containers package reads `TEST_IMAGE_N8N` when it loads, so set it on the command.

## Build an image from a branch

1. Get the branch into the clone: `git fetch origin <branch>` for GitHub, or `git fetch ~/Workspace/n8n <branch>` for a local-only branch.
2. Make a throwaway build worktree at a short path. pnpm puts the absolute source path into its package directory names and cuts long names short; under a long path the build's own check fails with `No files left under *@file+*packages+*/dist/*.js.map`:

   ```bash
   NAME=<short-name>                                      # e.g. m51c; becomes part of the image tag
   git -C "$HARNESS" worktree add --detach "$BUILDS/$NAME" FETCH_HEAD   # or origin/<branch>
   ```

3. Build under your own tag. Never use the `local` tag: other sessions use `n8nio/n8n:local`.

   ```bash
   cd "$BUILDS/$NAME"
   pnpm install --frozen-lockfile > install.log 2>&1
   IMAGE_TAG=repro-<tag> pnpm build:docker > build.log 2>&1
   ```

   This makes `n8nio/n8n:repro-<tag>` and `n8nio/runners:repro-<tag>`, in about 15 minutes. Put the image in `scenarios.json`; the runner does not build `repro-` images itself.
4. Remove the worktree and images when you no longer need them:

   ```bash
   git -C "$HARNESS" worktree remove --force "$BUILDS/$NAME"
   docker rmi n8nio/n8n:repro-<tag> n8nio/runners:repro-<tag>
   ```

## Write a scenario

A spec starts a stack with `ReproStack.start({ name, workers, runners, scale, hooks, env })`, drives it through a `Scenario`, and asserts per variant. See `worker-drain-fetched-job.spec.ts` for a full example.

- `scale` divides Bull lock, renew and stall timeouts and the shutdown window by a factor; `env` overrides any of them
- `workflows.ts` builds workflows: `chain(name, [nodes.webhook(path), nodes.code(...), ...], settings)`. `repro.createWorkflow(wf, { activate: false })` creates without activating (error workflows, sub-workflows)
- `Scenario`: `step(label, fn)` and `mark(label)` record a timeline, `race(label, { a: p1, b: p2 })` returns the key that settles first, `set({...})` adds result fields, `collectLogs()` saves and returns every n8n container log, `finish(passed)` writes the JSONL line
- Probes on `ReproStack`: `execution(id)`, `executionsOf(workflowId)`, `waitForExecution`, `waitForStatus`, `executionDataContains(id, text)`, `bull(jobId)`, `bullJob(jobId)`, `sql`, `redis`, `webhook`, `webhookInBackground`
- Containers: `main()`, `workers()`, `worker(n)`, `runner()`. Process control: `signal(c, 'SIGTERM' | 'SIGKILL')`, `waitForExit(c, ms)`, `freeze(c, true | false)`, `startAgain(c)`, `waitForLog(cs, snippet | snippets, ms, abort)`, `logs(c)`

Anchors: wait on product state (a log line naming an id, a process exit, a DB or Bull state), never on a fixed delay. Where the log text differs between versions or is missing, add an `observe` hook and wait for its hit.

### Hook points

Hooks patch compiled code at module load. Declare them in `ReproStack.start({ hooks })`; the preload reads them from the `REPRO_HOOKS` env var in every n8n process, and `ReproStack.start` fails at once if a hook did not install in the containers of its `roles` (default `worker`). Set `lazy: true` for a file that loads only on first use.

| Field | Meaning |
|---|---|
| `point` | Name used for arming, hits and logs |
| `file` | Path suffix of the compiled file; `FILES` in `harness.ts` lists the known ones |
| `target`, `method` | Dotted path inside `module.exports` (`JobProcessor.prototype`, `prototype` for a class export, `''` for the exports object) and the method to wrap |
| `kind` | `pause` (wait for release, then call through), `observe` (log a hit only), `fault` (reject or throw once), `drop` (return `returns` instead of calling, every call while armed) |
| `arm` | `file` (default; enable by `hook(...).arm()`) or `always` (default for `observe`) |
| `scope` | Only fire inside an async call of another method (`{ file, target, method }`), once per call |
| `where` | Filters: `[{ path: 'args.0.node.name', equals: 'Pause' }]` |
| `detail` | Values to log with each hit: `{ executionId: 'args.0.executionId' }`. Paths start at `args`, `this`, `scope.args` or `result` |
| `phase` | `pause`: `before` the call (default) or `after` it resolves, holding the result; `where` and `detail` can then read `result`. `observe`: `before` the call or `after` it resolves. `fault`: `before` (no call) or `after` (call, then reject) |
| `preserve` | `fault` after: methods copied from the original return value onto the rejected promise (for example `cancel`) |

Control from the spec: `const p = hook(containers, point)`, then `p.arm()`, `p.waitHit(ms)` (returns the container and detail), `p.release(container)`, `p.disarm(exceptContainer)`. The channel is a file per point under `/tmp/repro-hooks` in the container, written through `docker exec node`.

## Limits

- Hooks depend on file paths, class and method names in the compiled image. The install check names any hook that did not install; check the `[repro-hook]` lines in the container log
- Some anchors depend on product log text, which changes between versions
- One Playwright process uses one image

## Files

- `harness.ts`: stack start, hook control, scenario runner, probes, process control
- `hooks/preload.js`: generic hook loader, injected through `NODE_OPTIONS` as a data URL
- `workflows.ts`: workflow builders
- `scenarios.json`, `run.mjs`: scenario list with before and after images, and the runner
- `*.spec.ts`: one scenario each
