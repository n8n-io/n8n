# Capture a feature or E2E workload

Use a repeatable workload and define when its cleanup finishes.
Warm the feature before recording its baseline.

## Capture manual actions

1. Start a measurement session:

   ```bash
   pnpm memory run --url http://localhost:5689 --gc
   ```

2. Perform a fixed batch of actions in n8n.
3. Wait for the work and its cleanup to finish.
4. Enter a checkpoint name in the capture terminal:

   ```text
   after-batch-1
   ```

5. Repeat the same batch.
6. Enter another checkpoint name.
7. Type `quit` to capture the final checkpoint and save the run.
8. Run the printed report command.

**Verify:** the process identity stays constant and each checkpoint follows completed work.
Without `--gc`, checkpoints record natural memory use instead of requesting GC.
The continuous timeline always lets normal GC run.

## Capture existing E2E tests

Use a disposable instance with built editor assets and E2E test accounts.
The capture tool does not create accounts or reset the database.
Workload capture requires macOS or Linux process groups.

1. Build editor assets when you prepare the instance:

   ```bash
   pnpm build --filter=n8n-editor-ui... > editor-build.log 2>&1
   ```

2. Install Chromium for the E2E runner:

   ```bash
   pnpm --filter n8n-playwright exec playwright install chromium
   ```

3. Clear a split-editor override in the preparation terminal:

   ```bash
   unset N8N_EDITOR_URL
   ```

4. Initialize and warm the selected tests on that disposable instance:

   ```bash
   N8N_BASE_URL=http://localhost:5689 \
   PLAYWRIGHT_SKIP_WEBSERVER=true \
   RESET_E2E_DB=true \
   pnpm --filter n8n-playwright exec playwright test \
     --project=e2e tests/e2e/credentials/crud.spec.ts \
     --grep 'should delete credentials from NDV' \
     --workers=1 --retries=0 --reporter=list
   ```

   This explicit preparation step resets that instance's test data.

5. Capture repeated tests against the same process:

   ```bash
   pnpm memory run --url http://localhost:5689 --gc -- \
     pnpm --filter n8n-playwright exec playwright test \
       --project=e2e tests/e2e/credentials/crud.spec.ts \
       --grep 'should delete credentials from NDV' \
       --workers=1 --repeat-each=3 --retries=0 --reporter=list
   ```

6. Generate the printed report.
7. Compare baseline, final, and the sampled timeline.

The workload runs from your original working directory.
Its arguments pass through unchanged.
It receives `N8N_BASE_URL`, `PLAYWRIGHT_SKIP_WEBSERVER=true`, and `RESET_E2E_DB=false`.
The tool clears `N8N_EDITOR_URL` to prevent split-editor startup and backend teardown.
An unsuccessful workload produces a failed partial capture.

**Verify:** tests pass and expected execution or connection counts recover after the workload.
Tests that leave workflows or projects behind can cause legitimate cache growth.
Fresh browser contexts do not test cleanup within one long-lived editor page.

## Capture retention snapshots

Use a separate run. Snapshot capture pauses n8n and changes memory use.

1. Warm the feature on the running process.
2. Start snapshot mode:

   ```bash
   pnpm memory run --url http://localhost:5689 --snapshots
   ```

3. Perform the action while keeping its temporary state live.
4. Enter `action` to capture that state.
5. Finish the action and its cleanup.
6. Type `quit` to capture the final state.
7. Generate the report to check the snapshot files.
8. Load the baseline and final snapshots into Chrome DevTools' Memory panel.
9. Select Comparison and inspect growing objects and their Retainers.

**Verify:** snapshots belong to the same run and process, and final-state objects outlive their expected lifetime.
Command mode captures only baseline and final snapshots.
Manual mode supplies an action snapshot for three-snapshot analysis.

## Correlate optional observers

1. Keep your existing VictoriaMetrics or Pyroscope collection active during capture.
2. Read `startedAt`, `endedAt`, and checkpoint times from the saved artifacts.
3. Select those exact time windows in the observer.
4. Filter to the process you captured.
5. Check that the observer has samples for that window.

The offline report does not query an observer or claim profile coverage.
Do not extend a workload window merely to wait for profile ingestion.

See [Understand the results](understand-results.md) for interpretation.
