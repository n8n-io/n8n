# Implementation: n8n backend reuse

## Shared boundary

`@n8n/test` now depends on the existing `n8n` package. The supported backend entry is `n8n/dist/testing.js`. No workspace package was added.

| Area | Shared production behavior | Adapter responsibility |
|---|---|---|
| Prepared startup | Await configuration, construct the engine, and start its cancellable execution. Production root and child callers use this operation. | Build the supplied workflow and instance state before this boundary. |
| Credentials | Complete preparation, defaults, expression resolution, authentication, and pre-authentication operations. | Supply credential data and record redaction values. Production retains retrieval, policy, and token persistence. |
| Code tasks | Data builder, stripper, and result application before the following node continues. | Worker transport and sandbox configuration. |
| Children | Prepared startup, inherited context, and output policy. | Resolve workflows from the loaded set and record runs. Production retains storage and policy checks. |
| Webhooks | Option evaluation and response assembly. Immediate responses are captured before downstream work. | Record responses in place of application HTTP transport. |
| Packages | Directory inventory, production readers, limits, and manifest validation. | Project workflows into the test workflow set without database import. |
| Static rules | Variable scanning and declarative node eligibility. | Workflow attribution and issue presentation. |

This is a prepared engine boundary. It does not cover complete application startup. Workflow construction and additional-data assembly still differ. Application permissions, persistence, and queue behavior remain application integration concerns.

## API changes

- Await `loadPackage(path)`.
- Await `result.response`.
- Contract mismatches remain in `workflows.issues()`. They do not add runtime rejection rules to child execution.
- Engine v2 workflows fail explicitly. Streaming webhook responses fail before downstream execution.
- The test package version is aligned with the current n8n version, `2.49.0`.

## Verification

- Complete adapter suite: 140 tests in 28 files passed.
- Production credentials: 102 existing tests and 3 shared-operation tests passed.
- Production root execution: 81 tests passed, including asynchronous configuration ordering through `WorkflowRunner.run`.
- Production child execution: 151 tests passed.
- Production webhooks: 192 tests passed across focused runs with local listener access.
- Production package readers, parser, and static rules: 160 tests passed.
- Shared prepared startup: 2 behavior tests passed. Removing its configuration await caused failures. The source was restored.
- A direct application-versus-adapter comparison passed. An owned root and published child ran through the actual `WorkflowRunner`, then through the public adapter. HTTP effects and outputs matched. Application configuration completed before dispatch.
- Removing the pre-authentication await caused its causal ordering test to fail. The source was restored.
- CLI TypeScript build, adapter build, and adapter typecheck passed after upstream workspace declarations were refreshed.

The direct application comparison runs separately from adapter unit tests. It uses an owned persisted workflow, the actual `WorkflowRunner`, and the public built adapter. Its command is:

```sh
pnpm --dir packages/cli exec vitest run --config ../@n8n/test/vitest.application.config.ts --maxWorkers=1
```

The archive consumer check uses packed CLI and adapter files in an isolated production dependency installation. It checks CommonJS, ESM, workflow execution, Code HTTP requests, and asynchronous package loading. The required nock peer is linked from that installation. It uses no repository source alias.

```sh
node packages/@n8n/test/test/support/packed-consumer.mjs /path/to/isolated/adapter
```

Changed-file formatting, lint, and whitespace checks were run. Comprehensive repository checks remain for CI.

## Dependency cost

The Turbo dry-run graph has 87 build tasks. Removing the new CLI edge leaves 33 tasks. The CLI dependency adds 54 tasks, including editor UI and design-system builds.

The CLI archive is about 6.7 MB. The adapter archive is about 248 KB. The isolated production graph contains 1,850 packages and occupies about 3.4 GiB. This total includes the existing node dependencies. It does not measure the incremental CLI installation size.

The deployment check needed legacy pnpm deployment because the workspace graph has ambiguous peer contexts. It also needed registry metadata absent from the offline cache. These checks changed no workspace policy or dependency version constraint.

## Remaining limits

- Workflow and instance-state assembly remain adapter-specific before shared startup.
- Worker transport still depends on runner message internals. Data conversion and result application are shared.
- Clock and environment overrides remain process-wide. Executions in one process must remain serial.
- Detached-child HTTP attribution still uses the existing active-context stack. Await children when asserting request records.
- Queue, permission, persistence, engine v2, binary response, and streaming behavior require application-level coverage.

The README records API changes and limits. No release, shared-instance deployment, or PR was created.
