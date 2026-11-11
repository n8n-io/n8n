# Oxlint migration blockers

Last reviewed: 2026-11-11
Oxlint version: 1.78.0
Vize version: 0.715.0

This file is the working backlog for the ESLint to Oxlint migration. It focuses on rules that block an Oxlint-only lint command for many packages. `oxlint-gap.json` is the machine-readable source of truth for shared-layer parity.

Oxlint configs are the executable policy for migrated packages. ESLint policy twins may remain temporarily for parity review, but migration tooling must also support packages that have removed them.

## Completion criteria

A blocker is complete when all of these conditions are true:

1. Oxlint enforces equivalent behavior, or we intentionally retire the rule.
2. We remove the rule from `oxlint-gap.json` if it is present there.
3. `node scripts/lint-parity/oxlint-parity.mjs --pkg packages/<package> --eslint /tmp/eslint-snapshot.json` passes.
4. The affected packages no longer need an ESLint pass for that rule.
5. We test fixer behavior when the rule has a fixer.

## Majority-package blockers

These rules come from the shared base or backend layers. Resolve these first because they affect the largest number of packages.

| Priority | Rule | Blocker | Suggested next action |
| --- | --- | --- | --- |
| P1 | `typescript/consistent-type-imports` | Oxlint does not honor the `emitDecoratorMetadata` exception. Its fixer can remove imports that DI needs at runtime. | Wait for upstream support or add a tested shim that skips decorated files. Do not enable the current fixer. |
| P1 | `typescript/prefer-optional-chain` | The native nursery rule changes guarded undeclared globals incorrectly. | Re-test after the rule leaves nursery or after the upstream fixer issue is resolved. |
| P2 | `import/export` | A native rule exists, but it is still in the nursery category. | Run parity samples and enable it after it becomes stable. |
| P3 | `no-octal` | Oxlint has no rule. The parser already rejects relevant octal syntax in module and strict-mode code. | Confirm parser coverage and retire the explicit rule if no supported source form remains. |

## Package-level blockers

### `@typescript-eslint/naming-convention`

Oxlint has no native equivalent. The shared base disables this rule, but multiple package configs enable it at `error`. This blocks those packages from reaching full parity even after the shared blockers are complete.

Possible approaches:

1. Retire rules that only enforce style preferences.
2. Replace important selectors with small syntax-only custom rules.
3. Use existing Oxlint rules for specific conventions, such as filename or identifier restrictions.
4. Keep a narrow ESLint pass only in packages whose convention protects an API contract.

Audit every package configuration before conversion. Do not copy the full generic naming rule into a new custom implementation.

Phase 3 decisions:

- `@n8n/agents`: retire the enum-member casing selector. It enforces style only.
- `@n8n/instance-ai`: retire the quoted object-property selector. It only exempts names that require quotes and protects no API contract.
- `@n8n/instance-ai`: remove the stale package-wide filename exception. The package no longer contains files that need it.
- `@n8n/instance-ai`: override the removed Node 10 module resolution in the scripts tsconfig so tsgolint can keep linting `scripts/**/*.ts`.

### Testing infrastructure decisions

- `@n8n/rules-engine`, `@n8n/code-health`, and `@n8n/playwright-janitor`: retire the exemption-only rule-ID selectors. They enforce no positive naming contract.
- `n8n-containers`: retire the Docker label exemption. Object literal keys are data, not identifier contracts.
- `n8n-playwright`: retire the broad style selectors. Workflow names, fixture keys, and spec paths are data, while identifier casing has no runtime contract.

### Workflow SDK decisions

- Retire the package naming selectors. They enforce style only and exempt node names, AST types, and API fields.
- Retire the stale `adm-zip` restriction. Its referenced lazy loader no longer exists, and the shared dependency rule already rejects the dev-only package from production source.
- Keep `@n8n/eslint-plugin-community-nodes` on ESLint as external tooling. Validate its `no-builder-hint-leakage` rule through the Oxlint bridge when Workflow SDK consumes it.

### Backend storage decisions

- `@n8n/backend-network`: retire the package naming selectors. They enforce style only and exempt protocol-defined header and charset names.
- `@n8n/blob-storage`: retire the package naming selectors. They enforce style only and exempt AWS and HTTP field names.

## Retirement exceptions

### `n8n-node-dev`

Keep `n8n-node-dev` on ESLint. The v3 removal plan makes an Oxlint migration unnecessary.

Reconsider this exception only if the package removal plan changes.

## Frontend: Oxlint and Vize

The frontend packages that dropped ESLint run two tools:

- Oxlint lints the TypeScript files and the `<script>` blocks of each SFC, through `@n8n/oxlint-config/frontend`.
- Native `vize lint` lints the Vue templates and the SFC structure, through `@n8n/oxlint-config/vize`. Each package passes a config file to `vize lint -c`. Vize does not read a file named `vize.config.*` as a `-c` file.

Vize is pinned exactly (`vize: 0.715.0` in the catalog), because Vize is alpha software and releases often.

Run the parity check of such a package with its Vize config:

```sh
node scripts/lint-parity/oxlint-parity.mjs --pkg packages/<package> --eslint /tmp/eslint-snapshot.json --vize packages/<package>/vize-lint.config.mjs
```

`--vize` counts the rules that the Vize config turns on as enforced, under their ESLint ids. A Vize rule that no ESLint rule maps onto fails the check, as an Oxlint one does.

#### Raise the Vize pin

Do these checks for each package that runs `vize lint`, before you change the `vize` version in the catalog:

1. Run `pnpm lint` in the package. It must pass.
2. Add an SFC with no `<script>` block that breaks a rule, for example `<template><ul><li v-for="x in [1]">{{ x }}</li></ul></template>`. Run `pnpm lint`. It must fail and report the rule (`vue/require-v-for-key`). Do this for each rule in `@n8n/oxlint-config/vize` that you want to prove. Then delete the file.
3. Run `oxlint-parity.mjs` with `--vize`, as above. It must pass.
4. Try `vue/valid-attribute-name` and `vue/valid-template-root` the same way. If the new version reports them, turn them on in `@n8n/oxlint-config/vize` and remove their entries from `oxlint-gap.json`.

### Frontend: rules dropped in the move to Oxlint and Vize

Measured with Oxlint 1.78.0 and Vize 0.715.0. ESLint enforced these rules at `error` in the frontend packages. They have no home, or only a partial one, after the move. Each was dropped on purpose. Each row has an entry in `oxlint-gap.json`.

| Rule | Where it applied | Why it has no home | `oxlint-gap.json` |
| --- | --- | --- | --- |
| `@n8n/design-system/no-direct-component-imports`, template half | `.vue` | Oxlint gives JS plugins no template AST. The script half still runs. The `@vue/compiler-dom` technique of the tooltip rule can recover it. | `frontend/no-direct-component-imports-template` |
| `vue/valid-attribute-name`, `vue/valid-template-root` | `.vue` | Vize 0.715.0 maps them but reports nothing. They are not turned on, so that the config does not claim coverage it lacks. | `frontend/vue-template-rules`, and one entry for each rule |
| `vue/multi-word-component-names`, `vue/no-mutating-props`, `vue/no-v-text-v-html-on-component` | `defineComponent` in `.ts` | Vize does not lint component objects in `.ts`. ESLint had them at `warn` or `off` for `.vue`. | one entry for each rule |
| `vue/no-deprecated-dollar-listeners-api`, `vue/no-deprecated-dollar-scopedslots-api`, `vue/no-ref-as-operand`, `vue/no-use-computed-property-like-method`, `vue/require-valid-default-prop`, `.ts` half | `.ts` | No Oxlint rule. Vize runs them on SFC scripts, as `script/*`. The lint scripts pass only `.vue` files to `vize lint`, although Vize 0.715.0 also reports these rules in `.ts` files. | one entry for each rule |
| `@typescript-eslint/naming-convention` | `design-system` `validators.ts` only | No Oxlint rule. | `@typescript-eslint/naming-convention` |
| `@typescript-eslint/prefer-optional-chain` | all | The Oxlint rule is nursery and its fix is wrong. | `typescript/prefer-optional-chain` |
| `no-octal`, `no-dupe-args` | all, or `.vue` | No Oxlint rule. Near zero impact: strict mode rejects both. | one entry for each rule |
| `no-undef` | `.vue` | Nursery in Oxlint 1.78, with 5 false positives. TypeScript reports undefined names. | `no-undef` |
| `import-x/export` | all | Nursery in Oxlint 1.78. | `import/export` |
| 21 typed `@typescript-eslint/*` rules | SFC `<script>` in `chat`, `design-system` and promotions | Oxlint's type-aware rules skip `.vue`. They still run on `.ts`. editor-ui and the Oxlint-first modules already lacked them on `.vue`. | `frontend/sfc-type-aware-rules` |
| `@n8n/design-system/require-teleported-tooltip-in-dropdown` | the SFCs with no `<script>` only | It runs on every SFC that has a `<script>` block. Oxlint runs no JS plugin on a `.vue` file with no script. | `frontend/scriptless-sfc-js-plugin-rules` |
| `unused-imports/no-unused-imports` | `.vue` | Oxlint sees only the script block, so an import that only the template uses reads as unused: 531 false positives in 7 modules. | `frontend/vue-unused-imports` |

`n8n-local-rules/require-macro-variable-name` is the Oxlint port of `vue/require-macro-variable-name`. It checks the `<script setup>` block, as the original does.

The parity check compares a union of rules across a package's sample files, so it cannot see a rule that still runs on some files but not on others. The `frontend/*` entries with a `rules` list record these partial gaps. The parity check does not read them.

## Node package migration

The `n8n-nodes-base` plugin contributes 94 enforced rules:

- 12 credential rules in `packages/@n8n/eslint-config/src/configs/nodes.ts`.
- 82 node rules in the same config.

The plugin runs through Oxlint's JavaScript plugin bridge. Its file-scoped rule tables are in `@n8n/oxlint-config/nodes`. The filename rule stays in a residual ESLint pass because the bridge supplies different filename context.

Use the rule tables in `packages/@n8n/eslint-config/src/configs/nodes.ts` as the canonical list. They change more often than this document and must not be duplicated here.

Validation covered:

1. Loading `eslint-plugin-n8n-nodes-base` through `jsPlugins`.
2. Running all 12 credential rules and 82 node rules on `n8n-nodes-base`, then isolating the filename-rule divergence.
3. Comparing the enabled rule set with the ESLint snapshot.
4. Keeping a focused ESLint pass for divergent native rules, the filename rule, and package-specific AST selectors.

## Rules that are not blockers

Oxlint has native implementations for almost all configured type-aware `@typescript-eslint` rules. This includes promise analysis, unsafe-operation checks, type constituent checks, and template-expression checks.

Do not keep ESLint only because a rule is type-aware. Check whether Oxlint already provides the rule in the `typescript` namespace.

The main exceptions are:

- `@typescript-eslint/naming-convention`, which has no native equivalent.
- `@typescript-eslint/consistent-type-imports`, which diverges for decorated files.
- `@typescript-eslint/prefer-optional-chain`, which has a known semantic divergence.

## Work order

1. Replace active `no-restricted-syntax` selectors with focused rules.
2. Resolve decorator-safe `consistent-type-imports` behavior.
3. Audit and reduce `naming-convention` package overrides.
4. Re-test the two nursery rules.
5. Migrate the remaining package-specific AST selector restrictions.
6. Move the remaining frontend packages to Oxlint and Vize.

## Validation commands

Create an ESLint snapshot and run the shared parity check for each converted package:

```sh
node scripts/lint-parity/snapshot.mjs --out /tmp/eslint-snapshot.json --only packages/<package>
node scripts/lint-parity/oxlint-parity.mjs --pkg packages/<package> --eslint /tmp/eslint-snapshot.json
```

Inspect package rule downgrades and overrides:

```sh
node scripts/lint-parity/majority.mjs
```

Before changing the config, create the baseline snapshot. After the change, create the second snapshot and compare them:

```sh
pnpm turbo run build --filter=@n8n/eslint-config
node scripts/lint-parity/snapshot.mjs --out /tmp/lint-before.json
# Change the config.
node scripts/lint-parity/snapshot.mjs --out /tmp/lint-after.json
node scripts/lint-parity/diff.mjs /tmp/lint-before.json /tmp/lint-after.json
```

Run lint from each changed package. Use both linters when the package still has a compatibility pass.

## Source references

- Machine-readable gaps: `scripts/lint-parity/oxlint-gap.json`
- Parity checker: `scripts/lint-parity/oxlint-parity.mjs`
- ESLint base: `packages/@n8n/eslint-config/src/configs/base.ts`
- Oxlint base: `packages/@n8n/oxlint-config/src/configs/base.ts`
- ESLint frontend: `packages/@n8n/eslint-config/src/configs/frontend.ts`
- Oxlint frontend: `packages/@n8n/oxlint-config/src/configs/frontend.ts`
- ESLint nodes: `packages/@n8n/eslint-config/src/configs/nodes.ts`
- Oxlint nodes: `packages/@n8n/oxlint-config/src/configs/nodes.ts`
- Functional guardrails: `packages/@n8n/eslint-config/src/configs/functional-guardrails.ts`
