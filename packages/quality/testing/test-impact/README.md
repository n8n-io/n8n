# Select affected tests

`@n8n/test-impact` is the framework-independent library for coverage mapping, dependency selection, and shard distribution. It does not provide a standalone CLI.

To inspect E2E distribution from the repository root, run the Playwright wrapper:

```bash
pnpm --filter n8n-playwright distribution:count
```

To inspect the selection for a pull request, pass `--pr=<number>` after `--`:

```bash
pnpm --filter n8n-playwright distribution:count -- --pr=<number>
```

See the [Playwright orchestration guide](../playwright/docs/ORCHESTRATION.md) for selection and shard commands. Use the exports in [`src/index.ts`](src/index.ts) when you change the framework-independent selector.
