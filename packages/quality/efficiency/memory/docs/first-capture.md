# Produce your first memory report

This exercise captures an idle workload and produces a local chart.
It verifies the capture path. It does not diagnose a product feature.

You need Node 24, pnpm, and a checkout with the process diagnostics routes.
Use two terminals in the repository root.

## Prepare the checkout

1. Install dependencies:

   ```bash
   pnpm install --frozen-lockfile
   ```

2. Build the backend and its dependencies:

   ```bash
   pnpm build --filter=n8n... > build.log 2>&1
   ```

3. Check the capture command:

   ```bash
   pnpm memory --help
   ```

## Start a disposable instance

1. Create a separate data directory in terminal one:

   ```bash
   STATE="$(mktemp -d "${TMPDIR:-/tmp}/n8n-memory.XXXXXX")"
   ```

2. Start n8n:

   ```bash
   E2E_TESTS=true \
   N8N_USER_FOLDER="$STATE" \
   N8N_PORT=5689 \
   N8N_RUNNERS_BROKER_PORT=5688 \
   N8N_SECURE_COOKIE=false \
   DB_TYPE=sqlite \
   EXECUTIONS_MODE=regular \
   node --expose-gc packages/cli/bin/n8n start
   ```

3. Wait for n8n to finish initialization.
4. Check readiness in terminal two:

   ```bash
   curl -fsS http://localhost:5689/healthz/readiness
   ```

   The response must report `status: ok`.

## Capture and report

1. Capture a three-second idle workload:

   ```bash
   pnpm memory run --url http://localhost:5689 --gc \
     -- node -e 'setTimeout(() => {}, 3000)'
   ```

2. Note the `Run:` directory printed by the command.
3. Generate its report:

   ```bash
   pnpm memory report .memory-runs/run-<printed-suffix>
   ```

4. Open `memory.svg` in that directory.
5. Inspect the baseline and final rows in the terminal.

**Success:** capture status is `completed`, both checkpoints exist, and the chart contains readings.
Small positive or negative idle deltas are expected.

## Finish

1. Press Ctrl+C in terminal one to stop the instance you started.
2. Keep the run directory for later offline comparison.

Next, [capture your own workload](capture-workload.md).
