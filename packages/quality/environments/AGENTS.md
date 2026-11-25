# Test environment instructions

Read the parent [quality instructions](../AGENTS.md) before you change a test environment.

- Define test services and deployment stacks in `containers/`.
- `rig` runs local environments for manual testing. It lives in
  `scripts/experimental/rig/`. See its [README](../../../scripts/experimental/rig/README.md).
- Update CI path filters when you move a service or stack file.
- Check test-impact broad selection for changes that affect the n8n runtime.
