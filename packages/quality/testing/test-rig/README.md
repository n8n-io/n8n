# Test rig

`@n8n/test-rig` runs a real n8n stack in Docker and gives a test full control over it. Use it when a bug depends on timing between processes: a worker that gets SIGTERM while it holds a job, a main that loses leadership, a database that stops answering for a few seconds. A scenario can pause any method inside a running n8n process at the exact moment it matters, then signal, freeze or restart containers, slow or cut the network, and read Postgres, Redis and the logs to see what happened.

Most scenarios run twice. The `before` variant runs on a release that has the bug and checks that the bug shows. The `after` variant runs on an image with the fix and checks that the bug is gone. Some scenarios have only an `after` variant; they check that n8n stays correct under a fault, for example that a follower takes over when the leader dies.

The rig needs no change to n8n itself. It works on released images and on images that you build from any branch.

## Set up

From the repository root, install and build the packages the Playwright suite depends on:

```bash
pnpm install
pnpm turbo build --filter='n8n-playwright^...' > build.log 2>&1
```

Docker must be running. A scenario starts up to six containers, and the scenarios run one at a time.

## Run the scenarios

The scenarios live in `packages/quality/testing/playwright/tests/infrastructure/test-rig/`. The file `scenarios.json` in that directory lists each one with its spec file and its `before` and `after` images. The `pnpm scenarios` command reads that list, pulls the released images it needs, runs each variant several times and prints a table of passes.

```bash
cd packages/quality/testing/test-rig
pnpm scenarios                                       # every scenario, both variants, 5 runs each
pnpm scenarios worker-drain-fetched-job --runs 1     # one scenario, one run per variant
pnpm scenarios --variant before                      # only the before images
pnpm scenarios --after-image n8nio/n8n:my-build      # every after variant on one image
```

A variant passes when the image behaves as the spec expects for that variant. A `before` run passes only when it shows the bug in the way the spec describes, so a `before` run that fails for some other reason counts as a failure. A scenario with no image for a variant shows `no image` and is skipped. An image tagged `rig-*` or `local` that is not on your machine shows `image missing` and fails the run, because the rig cannot pull a local build. The command exits with a non-zero code when any variant did not pass on every run.

## Read the results

The command prints the results directory when it finishes. By default it is `test-rig-results/<timestamp>/` under your system temporary directory, and `--out` changes it. Each variant writes `<scenario>.<variant>.jsonl` there, with one line per run. A line holds whether the run passed, the values the scenario recorded, the names of the checks that failed, and a timeline of the steps with their times in milliseconds. When a run fails, the timeline and the failed checks are usually the fastest way to see what went wrong.

The container logs of each run are in `<scenario>.<variant>/<test>/logs/`, one file for each n8n process: `main.log`, `worker-1.log` and so on.

To run one spec by hand, without the table, run Playwright directly from the Playwright package:

```bash
cd packages/quality/testing/playwright
TEST_IMAGE_N8N=n8nio/n8n:2.42.2 TEST_RIG_VARIANT=before npx playwright test --project=test-rig --reporter=line tests/infrastructure/test-rig/<spec>
```

Set `TEST_IMAGE_N8N` on the command itself, because the containers package reads it when it loads. The runners image follows it with the same tag (`n8nio/runners:<tag>`). Without `TEST_RIG_VARIANT`, a spec runs as `after`. A run by hand writes no JSONL file, but the logs still go to the Playwright output directory. The `test-rig` project is separate from the `*:infrastructure` projects, so `pnpm test:infrastructure` does not start these scenarios.

## Write a scenario

A scenario is a Playwright spec in the test-rig directory plus an entry in `scenarios.json`. The spec starts a stack with `RigStack.start`, declares the hooks it needs, drives the stack, and then checks the outcome for the variant under test. This example pauses a job on the worker, sends SIGTERM, releases the job and checks that the execution still finishes:

```ts
import { expect, test } from '@playwright/test';
import { chain, FILES, hook, is, nodes, RigStack, Scenario, signal, stopAllStacks, waitForExit, webhookPath } from '@n8n/test-rig';

test.afterEach(async () => await stopAllStacks());

test('worker drain: a running job finishes before the worker exits', async () => {
	const rig = await RigStack.start({
		name: 'drain-example',
		workers: 1,
		runners: 'internal',
		scale: 6,
		hooks: [
			{
				point: 'job-start',
				file: FILES.jobProcessor,
				target: 'JobProcessor.prototype',
				method: 'processJob',
				detail: { executionId: 'args.0.data.executionId' },
			},
		],
	});
	const s = new Scenario('drain-example', rig, test.info().outputPath());

	await s.run(test.info(), async () => {
		await rig.api.signIn();
		const path = webhookPath('drain');
		await rig.api.createWorkflow(chain('drain', [nodes.webhook(path), nodes.code('Code', 'return [{ json: {} }];')]));

		const worker = rig.worker(1);
		const point = hook([worker], 'job-start');
		await point.arm();
		const hit = point.waitHit(30_000);
		await rig.api.webhook(path);
		const { detail } = await hit;

		await signal(worker, 'SIGTERM');
		await point.release(worker);
		const exit = await waitForExit(worker, 90_000);
		const execution = await rig.db.waitForExecution(String(detail.executionId), 90_000);

		const failed = s.verify({
			always: [['worker exit code', exit?.exitCode, is(0)]],
			after: [['execution status', execution.status, is('success')]],
		});
		expect(failed).toEqual([]);
	});
});
```

The `scale` option divides the Bull lock, lock renewal and stall timeouts and the graceful shutdown window, so a scenario that waits for a stalled job takes seconds rather than minutes. It must be 1 or more, and `env` can override any single value. The `workflows` helpers build simple workflows: `chain(name, nodes)` connects the nodes in order, and `nodes.webhook` and `nodes.code` cover most needs.

Always wait on something the product does: a log line that names an execution id, a process exit, a row in Postgres, or a state in Bull. Never wait a fixed time, because Docker timing varies from run to run. Log text can change between versions, so when the line you need differs between the `before` and `after` images, add an `observe` hook on the method instead and wait for its hit.

Checks are plain data. `s.verify` takes `before`, `after` and `always` lists of `[label, value, expectation]` entries, runs the lists for the current variant together with `always`, and returns the labels that failed. The expectations are `is`, `isNot`, `below`, `atMost`, `includes`, `excludes` and `anything`. Use `s.mark`, `s.step` and `s.race` to add steps to the timeline, and `s.set` to record values in the result. `s.run` records the result and stops the stack whatever happens, and `s.collectLogs` saves the container logs and returns them by container name.

To add the scenario to `pnpm scenarios`, give it an entry in `scenarios.json`. The key is the scenario name, in lower case with dashes. The entry names the `spec` file, the `before` and `after` images (either can be `null`), and optionally the `issue` it reproduces, an `afterRef` that says what to build the `after` image from, and `env` values whose names start with `TEST_RIG_`. Two entries can share one spec and differ only in `env`; the external runner variants do this with `TEST_RIG_RUNNERS=external`.

### Hook specs

A hook wraps one method in a compiled n8n file. By default it pauses the call until the test releases it, but it can also only log the call, make it fail, or skip it. The test arms a hook with `hook(containers, point).arm()`, waits for it with `waitHit`, and lets the call continue with `release`. `RigStack.start` checks every spec and fails at once if a hook did not install, so a wrong file or method name shows up before the scenario starts.

| Field | Meaning |
|---|---|
| `point` | Name of the hook, used to arm it and to match its hits |
| `file` | Path suffix of the compiled file; `FILES` lists the known ones |
| `target`, `method` | Where the method lives inside the module exports, such as `JobProcessor.prototype`, `prototype` for a class export, or `''` for the exports object, and the method name |
| `kind` | `pause` (default: wait for release, then call through), `observe` (log a hit only), `fault` (fail the call), or `drop` (return `returns` without calling) |
| `arm` | `file` (default: the test arms it) or `always` (default for `observe`) |
| `once` | Fire once each time the hook is armed; default for every kind except `drop` |
| `scope` | Another method (`file`, `target`, `method`); fire only inside a call of it, once per call |
| `where` | Conditions on the call, such as `[{ path: 'args.0.node.name', equals: 'Pause' }]`; a condition can use `truthy` instead of `equals` |
| `detail` | Values to log with each hit, such as `{ executionId: 'args.0.executionId' }` |
| `phase` | `before` the call or `after` it resolves, when `where` and `detail` can also read `result`; default `before`, except `fault`, which calls through and then rejects |
| `message` | Error message for a `fault` |
| `async` | Set to `false` when the method is synchronous, so `fault` throws and `drop` returns the value directly |
| `preserve` | For a `fault` after the call: methods to copy from the original return value onto the rejected promise |
| `roles`, `lazy` | Containers that must show the hook installed before the scenario starts (default `worker`); `lazy` skips that check for a file that loads only on first use |

Paths in `where` and `detail` start at `args`, `this`, `scope.args` or `result`. A paused call continues by itself after two minutes if the test never releases it.

## Multi-main scenarios

A stack with more than one main needs a licence that allows several mains. Set `N8N_LICENSE_ACTIVATION_KEY` or `N8N_LICENSE_CERT` in your shell before you run one; the stack fails to start without one. The stack uses the sandbox licence tenant by default, so use a sandbox key, and never commit a key or a cert.

Every new stack activates the key again. When you run many multi-main scenarios, a cert is faster: start one stack with the key, read the cert from the `settings` table where `key = 'license.cert'`, and export it as `N8N_LICENSE_CERT`.

Single-main stacks always start with an empty licence, so a licence in your shell cannot change their results. The multi-main helpers `LEADER_HOOKS`, `fastLeaderElection`, `currentLeader` and `oneLeaderAtATime` cover the common leader checks.

## Chaos runs

`pnpm chaos` starts a stack with one main and two workers, sends a steady webhook workload, and applies a random schedule of faults chosen from a seed. A fault can kill or stop a process, freeze it, delay or cut its link to Postgres or Redis, or arm a hook for a while that makes a worker skip its lock renewal or fail a job. After the schedule, the run checks that every execution finished, no accepted request was lost, no run wrote its row twice, every successful run wrote its row, and the queue drained.

```bash
TEST_IMAGE_N8N=n8nio/n8n:2.42.2 pnpm chaos                       # random seed
TEST_IMAGE_N8N=n8nio/n8n:2.42.2 pnpm chaos --seed 1234 --shrink  # replay a seed and shrink it
```

The run prints its seed and the schedule first, so you can replay a failing schedule with `--seed`. With `--shrink`, a failing run removes faults one at a time until the smallest failing schedule is left. A seed fixes the schedule but not the outcome, because Docker timing still varies, so the shrinker runs each candidate `--repeats` times and keeps it only when it fails at least `--min-failures` times. The logs and a `record.json` for each run go to `test-rig-chaos/` under your system temporary directory, or to `--out`. Run `pnpm chaos --help` for the other options.

## Build an image from a branch

An `after` image for a fix that is not released yet comes from a local build, and `afterRef` in `scenarios.json` says what to build.

1. Make a throwaway worktree at a short path, such as a directory directly under your home. pnpm puts the absolute source path into package directory names and cuts long names, so under a long path the build fails with `No files left under *@file+*packages+*/dist/*.js.map`.

   ```bash
   git worktree add --detach <short-path> <ref>
   ```

2. Build the images under your own tag that starts with `rig-`. Do not use the `local` tag, because other work on the machine uses it.

   ```bash
   cd <short-path>
   pnpm install --frozen-lockfile > install.log 2>&1
   IMAGE_TAG=rig-<name> pnpm build:docker > build.log 2>&1
   ```

   This builds `n8nio/n8n:rig-<name>` and `n8nio/runners:rig-<name>` in about 15 minutes.

3. Run the scenario with `--after-image n8nio/n8n:rig-<name>`, or put the tag in `scenarios.json`.

4. Remove the worktree and the images when you are done.

## Clean up

A stack stops when its scenario ends, when its test times out, and when you press Ctrl-C in `pnpm chaos`. If a process dies before that, remove what is left:

```bash
docker ps -aq --filter 'name=^rig-' | xargs docker rm -f
docker network prune -f --filter 'label=org.testcontainers=true'
```

## Test the rig

```bash
pnpm test           # unit tests, no Docker
pnpm test:docker    # contract tests against real stacks
```

The Docker tests start real stacks one at a time. They check that every hooked method installs in each scenario image you have locally, and they cover a smoke run, network faults and the workload. When a spec hooks a method for the first time, add it to `src/hooks/catalogue.ts`, with `since` if older releases do not have it. A unit test fails when a spec hooks a method the catalogue does not list.

## How it works

The rig builds on the stacks from the `n8n-containers` package. It adds a small preload script to every n8n process through `NODE_OPTIONS`, and the preload wraps the methods named in the hook specs as their files load. The test arms and releases hooks by writing files inside the container, and it reads hits from `[test-rig]` lines in the container log. Signals, freezes and restarts use `docker kill`, `docker pause` and `docker start`. Network faults run `tc netem` from a short-lived sidecar container that shares the network of the target container; the rig builds the small `n8n-test-rig/netem` image the first time it needs it.

## Limits

Hooks depend on compiled file paths and on class and method names, so a refactor in n8n can break them. The install check and the Docker tests name every hook that does not install. Some scenarios also wait on log text, which can change between versions.

One Playwright process uses one image, because the runners image follows `TEST_IMAGE_N8N`. The `image` option of `RigStack.start` changes only the n8n image, so use it only with internal runners.

Scenarios shorten timeouts to keep runs short. They show the mechanism of a bug, not its timing in production.
