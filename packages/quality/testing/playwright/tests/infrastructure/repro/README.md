# Repro harness

Local-only harness that reproduces queue-mode, drain and runner bugs on a fresh container stack. It runs against any n8n Docker image: a released tag, or an image built from any branch. The harness does not need to be on the branch under test.

This branch (`repro-harness`) is never pushed. Its canonical home is a separate clone, not a worktree, so worktree cleanup cannot remove it:

```bash
HARNESS=~/Workspace/tools/repro-harness
```

## Set up the clone (once)

Clone from the local n8n repository (fast, objects are hard-linked), then point `origin` at GitHub for fetches and disable pushes:

```bash
git clone --branch repro-harness ~/Workspace/n8n "$HARNESS"
cd "$HARNESS"
git remote set-url origin https://github.com/n8n-io/n8n.git
git remote set-url --push origin DISABLED
git fetch origin

pnpm install --frozen-lockfile
pnpm turbo build --filter='n8n-playwright^...' > build.log 2>&1
```

Rebuild the Playwright dependencies (the last command) after you rebase the branch.

## Run against a released tag

No build is needed. Docker pulls the image on first use.

```bash
cd "$HARNESS/packages/quality/testing/playwright"
TEST_IMAGE_N8N=n8nio/n8n:2.42.2 \
REPRO_RESULTS_FILE=/tmp/repro/2.42.2.jsonl \
npx playwright test --project=repro:infrastructure --reporter=line --repeat-each=5
```

The stack derives the runners image from the n8n image (`n8nio/runners:<same tag>`).

## Run against any branch

1. Get the branch into the clone. For a branch on GitHub, use `git fetch origin <branch>`. For a local-only branch, fetch it from the n8n repository:

   ```bash
   cd "$HARNESS"
   git fetch ~/Workspace/n8n <branch>
   ```

2. Make a throwaway build worktree from the clone at that commit. Do not build in another session's worktree:

   ```bash
   NAME=<short-name>                      # becomes the image tag, e.g. cat-4728-fix
   git worktree add --detach "$HARNESS-builds/$NAME" FETCH_HEAD   # or origin/<branch>
   ```

3. Build the images under your own tag. Never use the `local` tag: other sessions use `n8nio/n8n:local`.

   ```bash
   cd "$HARNESS-builds/$NAME"
   pnpm install --frozen-lockfile > install.log 2>&1
   IMAGE_TAG=repro-$NAME pnpm build:docker > build.log 2>&1
   ```

   This makes `n8nio/n8n:repro-$NAME` and `n8nio/runners:repro-$NAME`. Expect about 15 minutes from a fresh worktree.

4. Run the harness from the clone, not from the build worktree:

   ```bash
   cd "$HARNESS/packages/quality/testing/playwright"
   TEST_IMAGE_N8N=n8nio/n8n:repro-$NAME \
   REPRO_RESULTS_FILE=/tmp/repro/$NAME.jsonl \
   npx playwright test --project=repro:infrastructure --reporter=line --repeat-each=5
   ```

5. When you are done, remove the build worktree and, if you do not need it again, the images:

   ```bash
   git -C "$HARNESS" worktree remove "$HARNESS-builds/$NAME"
   docker rmi n8nio/n8n:repro-$NAME n8nio/runners:repro-$NAME
   ```

One Playwright run uses one image. To compare a released tag with a fix, do two runs.

## Read the results

- Each run appends one JSON line to `REPRO_RESULTS_FILE`: image, stack start time, execution status, stall log, worker exit code and time after SIGTERM, Bull state, `passed`
- Logs of the last run (main, draining worker, other worker) are in `test-results/*/logs/`
- The spec asserts correct behaviour. On an image with the bug it fails, and the JSON line shows the failure mode

Summary of a results file:

```bash
jq -c '{image, anchor: .releaseAnchor, status: .execution.status, stall: .stallLogged, exit: .exitCode, exitMs: .exitAfterSigtermMs, passed}' /tmp/repro/<name>.jsonl
```

## Limits

- The pause point patches compiled internals: `dist/scaling/job-processor.js`, `JobProcessor.processJob` and its `executionPersistence.findSingleExecution` call. If a branch changes these, the worker logs `[repro-hook] ... not installed`, or no hit occurs. The test then fails at `waitHit` after 30 s. Check the worker log for `[repro-hook]` lines first
- The harness releases the paused job when the worker drain log contains `(execution IDs: <id>)`. A branch that changes that log text makes a fixed build look broken
- Checked on 2.38.6, 2.42.2 and the CAT-4728 fix stack. Older releases may need changes to `hooks/preload.js`
- The containers package reads `TEST_IMAGE_N8N` when it loads, so set it on the command, not inside the spec

## Files

- `harness.ts`: stack start, pause-point control, signals, exit, logs, Postgres and Bull probes
- `hooks/preload.js`: loaded into every n8n process through `NODE_OPTIONS`; adds the `job-before-track` pause point
- `worker-drain-fetched-job.spec.ts`: scenario for a job fetched before SIGTERM (CAT-4728)
