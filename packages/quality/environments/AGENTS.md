# Test environment instructions

Read the parent [quality instructions](../AGENTS.md) before you change a test environment.

- Define test services and deployment stacks in `containers/`.
- `rig/` runs local environments for manual testing. Its design is in `.agents/specs/rig.md`.
- Update CI path filters when you move a service or stack file.
- Check test-impact broad selection for changes that affect the n8n runtime.
