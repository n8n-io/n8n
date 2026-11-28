# Test environment instructions

Read the parent [quality instructions](../AGENTS.md) before you change a test environment.

- Define test services and deployment stacks in `containers/`.
- Reuse existing workspace SDKs for service clients. When a client library (for example `@aws-sdk/client-s3`) already exists in `pnpm-lock.yaml` or `pnpm-workspace.yaml`, add that version to `package.json` and update `pnpm-lock.yaml`. Do not hand-roll wire protocols, XML parsers, or SigV4 signing.
- Unit-test only pure logic in `containers/tests/` (validation, precedence, parsing, and cleanup). Do not add unit tests for mocked third-party clients or wiring tests that only check a setting reaches a container.
- `rig` runs local environments for manual testing. It lives in
  `scripts/experimental/rig/`. See its [README](../../../scripts/experimental/rig/README.md).
- Update CI path filters when you move a service or stack file.
- Check test-impact broad selection for changes that affect the n8n runtime.
