# Test rig

`@n8n/test-rig` runs a real n8n stack in Docker under test control. Use it when a bug depends on timing between processes, for example a worker that gets SIGTERM while it holds a job. A test can pause any method inside a running n8n process. It can then signal, freeze or restart containers, and read Postgres, Redis and the logs.

The rig needs no change to n8n. It works on released images and on local builds.

## Set up

From the repository root, install and build the packages the rig depends on:

```bash
pnpm install
pnpm turbo build --filter='@n8n/test-rig^...' > build.log 2>&1
```

Docker must be running. A stack starts Postgres, Redis, a main and its workers as separate containers.

## Run the scenarios

A scenario reproduces one bug, and it runs twice. The `before` variant runs on a release that has the bug and checks that the bug shows. The `after` variant runs on the first release with the fix and checks that the bug is gone.

The scenarios live in `packages/quality/testing/playwright/tests/infrastructure/test-rig/`. The file `scenarios.json` in that directory lists each one with its spec file and its `before` and `after` images. The `pnpm scenarios` command reads that list, pulls the images it needs, runs each variant several times and prints a table of passes. Build the packages the Playwright suite depends on first:

```bash
pnpm turbo build --filter='n8n-playwright^...' > build.log 2>&1
cd packages/quality/testing/test-rig
pnpm scenarios                                     # every scenario, both variants, 5 runs each
pnpm scenarios worker-drain-long-task --runs 1     # one scenario, one run per variant
pnpm scenarios --variant before                    # only the before images
```

A variant passes when the image behaves as the spec expects for that variant. A `before` run passes only when it shows the bug in the way the spec describes, so a `before` run that fails for some other reason counts as a failure. An image that cannot be pulled shows `image missing` and fails the run. The command exits with a non-zero code when any variant did not pass on every run.

## Read the results

The command prints the results directory when it finishes. By default it is `test-rig-results/<timestamp>/` under your system temporary directory, and `--out` changes it. Each variant writes a Playwright JSON report, `<scenario>.<variant>.json`, with one test result per run. Each result has a `scenario` attachment, base64-encoded JSON, that holds the record of the run: the values the scenario recorded, the checks that failed, any error, and a timeline of the steps with their times in milliseconds. When a run fails, the timeline and the failed checks are usually the fastest way to see what went wrong.

The container logs of each run are in `<scenario>.<variant>/<test>/logs/`, one file for each n8n process: `main.log`, `worker-1.log` and so on.

To run one spec by hand, without the table, run Playwright directly from the Playwright package:

```bash
cd packages/quality/testing/playwright
TEST_IMAGE_N8N=n8nio/n8n:2.38.3 TEST_RIG_VARIANT=before npx playwright test --project=test-rig --reporter=line tests/infrastructure/test-rig/<spec>
```

Set `TEST_IMAGE_N8N` on the command itself, because the containers package reads it when it loads. Without `TEST_RIG_VARIANT`, a spec runs as `after`. The `test-rig` project is separate from the `*:infrastructure` projects, so `pnpm test:infrastructure` does not start these scenarios.

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

Always wait on something the product does: a log line that names an execution id, a process exit, a row in Postgres, or a state in Bull. Never wait a fixed time, because Docker timing varies from run to run. Log text can change between versions, so when the line you need differs between the `before` and `after` images, add an `observe` hook on the method instead and wait for its hit.

Checks are plain data. `s.verify` takes `before`, `after` and `always` lists of `[label, value, expectation]` entries, runs the lists for the current variant together with `always`, and returns the labels that failed. The expectations are `is`, `isNot`, `below`, `includes` and `anything`. Use `s.mark`, `s.step` and `s.race` to add steps to the timeline, and `s.set` to record values in the record. `s.run` stops the stack and attaches the record to the test whatever happens, and it fails the test when a check failed or the stack did not stop. `s.collectLogs` saves the container logs and returns them by container name.

To add the scenario to `pnpm scenarios`, give it an entry in `scenarios.json`. The key is the scenario name, in lower case with dashes. The entry names the `spec` file, the released `before` and `after` images, the `issue` it reproduces, and optionally `env` values whose names start with `TEST_RIG_`. Two entries can share one spec and differ only in `env`; the external runner variants do this with `TEST_RIG_RUNNERS=external`.

When a spec hooks a method for the first time, add it to `src/hooks/catalogue.ts`, with `since` if older releases do not have it. A unit test fails when a spec hooks a method the catalogue does not list.

## How it works

The rig builds on the `n8n-containers` stacks. It loads a preload script into every n8n process through `NODE_OPTIONS`. The preload wraps the methods named in the hook specs as their files load. The test arms and releases hooks by writing files inside the container. It reads hits from `[test-rig]` lines in the container log. Signals, freezes and restarts use `docker kill`, `docker pause` and `docker start`.

`RigStack.start` starts a stack with its hooks. The stack has a REST client (`rig.api`), a Postgres probe (`rig.db`) and a Redis probe (`rig.redis`). The `scale` option divides the Bull lock, lock renewal and stall timeouts and the graceful shutdown window. A test that waits for a stalled job then takes seconds, not minutes. `scale` must be 1 or more. `env` can override any single value. `chain(name, nodes)` builds a workflow that runs the nodes in order, from `nodes.webhook` and `nodes.code`.

Single-main stacks start with an empty licence, so a licence in your shell cannot change their results. A licence that the test sets in `env` still applies.

### Hook specs

A hook wraps one method in a compiled n8n file. By default it pauses the call until the test releases it. It can also only log the call, make it fail, or skip it. The test arms a hook with `hook(containers, point).arm()`, waits for it with `waitHit`, and lets the call continue with `release`. `RigStack.start` fails at once if a hook did not install, so a wrong file or method name fails before the test starts.

| Field | Meaning |
|---|---|
| `point` | Name of the hook, used to arm it and to match its hits |
| `file` | Path suffix of the compiled file; `FILES` lists the known ones |
| `target`, `method` | Where the method lives inside the module exports, such as `JobProcessor.prototype`, `prototype` for a class export, or `''` for the exports object, and the method name |
| `kind` | `pause` (default: wait for release, then call through), `observe` (log a hit only), `fault` (fail the call), or `drop` (return `returns` without calling) |
| `arm` | `file` (default: the test arms it) or `always` (default for `observe`) |
| `once` | Fire once each time the hook is armed; default for every kind except `drop`. An `observe` hook ignores it and logs every matching call |
| `scope` | Another method (`file`, `target`, `method`); fire only inside a call of it, at most once per call. An `observe` hook logs every matching call inside it |
| `where` | Conditions on the call, such as `[{ path: 'args.0.node.name', equals: 'Pause' }]`; a condition can use `truthy` instead of `equals` |
| `detail` | Values to log with each hit, such as `{ executionId: 'args.0.executionId' }` |
| `phase` | `before` the call or `after` it resolves, when `where` and `detail` can also read `result`; default `before`, except `fault`, which calls through and then rejects |
| `returns` | Value that a `drop` resolves with |
| `preserve` | For a `fault` after the call: methods to copy from the original return value onto the rejected promise |
| `roles`, `lazy` | Containers that must show the hook installed before the test starts (default `worker`); `lazy` skips that check for a file that loads only on first use |

Paths in `where` and `detail` start at `args`, `this`, `scope.args` or `result`. A paused call continues by itself after two minutes if the test never releases it.

## Limits

Hooks depend on compiled file paths and on class and method names, so a refactor in n8n can break them. The install check names every hook that does not install. Log text can change between versions.

The runners image follows `TEST_IMAGE_N8N` with the same registry, organisation and tag: `ghcr.io/n8n-io/n8n:pr-1` gives `ghcr.io/n8n-io/runners:pr-1`. `TEST_IMAGE_TASK_RUNNER` overrides it. The `image` option of `RigStack.start` changes only the n8n image, so use it only with internal runners.

A test with shortened timeouts shows the mechanism of a bug, not its timing in production.

## Clean up

The tests call `stopAllStacks` after each test. If a process dies before that, remove what is left:

```bash
docker ps -aq --filter 'name=^rig-' | xargs docker rm -f
docker network prune -f --filter 'label=org.testcontainers=true'
```

## Test the rig

```bash
pnpm test                                  # unit tests, no Docker
pnpm --filter @n8n/test-rig test:docker    # contract tests against real stacks
```

The Docker tests start real stacks one at a time. The smoke test runs on `n8nio/n8n:2.42.2`, or on the image in `TEST_IMAGE_N8N`. The install test checks that every method in the catalogue installs in each scenario image you have locally.
