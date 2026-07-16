# Remaining packages to migrate to TypeScript 7

Tracks packages **outside `packages/@n8n/`** still on the default `catalog:`
(→ `typescript@6.0.2`). A package counts as migrated once its `typescript`
devDependency points at `catalog:typescript` (plain tsgo) or
`catalog:typescript-tooling` (side-by-side, for runtime compiler-API use).
See [README.md](./README.md) for the per-package migration loop.

Snapshot taken 2026-07-16 on branch `typescript-migration-8`.

## Already migrated (for reference)

- [x] `n8n` (`packages/cli`) — on `catalog:typescript-tooling`

## Backend / core libraries

Leaf-first order — `n8n-workflow` is a dependency of nearly everything, so
migrate it before the others to keep downstream typechecks green.

- [x] `n8n-workflow` (`packages/workflow`)
- [x] `n8n-core` (`packages/core`)
- [x] `n8n-nodes-base` (`packages/nodes-base`)
- [x] `n8n-node-dev` (`packages/node-dev`)

## Testing packages

- [x] `@n8n/code-health` (`packages/testing/code-health`)
- [x] `@n8n/playwright-janitor` (`packages/testing/janitor`)
- [ ] `@n8n/performance` (`packages/testing/performance`)
- [ ] `n8n-playwright` (`packages/testing/playwright`)
- [ ] `@n8n/rules-engine` (`packages/testing/rules-engine`)
- [ ] `@n8n/test-impact` (`packages/testing/test-impact`)
- [ ] `n8n-containers` (`packages/testing/containers`) — no `typescript`
      devDependency today; add `catalog:typescript` if/when one is needed

## Frontend / `vue-tsc` packages (blocked)

These all depend on `vue-tsc` (`catalog:frontend`). `vue-tsc` cannot run on
tsgo/TS 7 yet, so these are **blocked on the vue-tsc toolchain** — a catalog
flip alone won't migrate them. Revisit once `vue-tsc` supports the native
compiler.

- [ ] `n8n-editor-ui` (`packages/frontend/editor-ui`)
- [ ] `@n8n/chat` (`packages/frontend/@n8n/chat`)
- [ ] `@n8n/composables` (`packages/frontend/@n8n/composables`)
- [ ] `@n8n/design-system` (`packages/frontend/@n8n/design-system`)
- [ ] `@n8n/frontend-module-sdk` (`packages/frontend/@n8n/frontend-module-sdk`)
- [ ] `@n8n/i18n` (`packages/frontend/@n8n/i18n`)
- [ ] `@n8n/rest-api-client` (`packages/frontend/@n8n/rest-api-client`)
- [ ] `@n8n/stores` (`packages/frontend/@n8n/stores`)
- [ ] `@n8n/storybook` (`packages/frontend/@n8n/storybook`)
- [ ] `@n8n/n8n-extension-insights` (`packages/extensions/insights`) — also
      pulls in `vue-tsc`
