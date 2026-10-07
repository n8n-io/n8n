# Oxlint migration blockers

Last reviewed: 2026-10-07
Oxlint version: 1.78.0

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

## Frontend packages

The frontend packages run Oxlint and the Vize CLI. They no longer run ESLint, and `@n8n/eslint-config` no longer has a frontend layer.

- `@n8n/oxlint-config/frontend` extends `base` and `vue`. It holds the TypeScript rules and the 30 native Oxlint `vue/*` script rules, plus `n8n-local-rules/require-macro-variable-name` (a port of `vue/require-macro-variable-name`) and `@n8n/design-system/require-teleported-tooltip-in-dropdown` (which parses the template with `@vue/compiler-dom`). A package config sets `options: { typeAware: true }` and spreads `frontendConfig.ignorePatterns`, because Oxlint passes neither through `extends`.
- `@n8n/oxlint-config/vize` holds the 51 Vize template and SFC rules. A package `vize.config.ts` imports it. `vue/block-order` becomes `vue/sfc-element-order`, and `vue/no-undef-components` becomes `vue/require-component-registration`.
- `typescript/consistent-type-imports` is on in the frontend layer. The base layer leaves it to ESLint because the Oxlint fixer breaks `emitDecoratorMetadata`, and no frontend package uses decorators.

Retired rules, each with an entry in `oxlint-gap.json`:

- Seven `vue/*` rules without a Vize equivalent, and `vue/no-deprecated-filter`, which Vize misreads on a TypeScript union in a template cast.
- Eighteen `eslint:recommended` JavaScript rules that ESLint applied to SFC scripts only because the typescript-eslint override globs omit `.vue`. TypeScript reports each of them.
- `@typescript-eslint/naming-convention` in design-system, a style-only selector on one file.
- `eslint-plugin-storybook`. Oxlint cannot load it, and the storybook package holds no story file.

Known limits:

- Oxlint's type-aware rules skip `.vue` files. ESLint ran them on the SFC script through `vue-eslint-parser`. Vize has a `type/*` rule set (`typeAware: true`) that covers part of this, for example `type/no-floating-promises`. It is experimental and not enabled yet.
- Vize does not read `extends` from a JSON path, so a package config imports `vizeConfig` and spreads it. To suppress a rule for some files, add an `entries` item with `files` and `linter.rules`.
- Vize cannot run a JavaScript rule. The two n8n Vue rules stay in Oxlint.
- Oxlint has no `no-restricted-syntax`. The editor-ui ESLint config held dormant (`off`) selector ratchets for the workflow-store migration and the modal-key ratchet (CAT-3688, CAT-3973). They are in git history, in `packages/frontend/editor-ui/eslint.config.mjs` before this change. Rewrite each as a focused rule before you turn it back on.
- editor-ui carries package-wide `warn` downgrades, as its ESLint config did. `typescript/no-deprecated` is new to editor-ui, and Oxlint did not lint its test files before. Both groups are TODOs in `oxlint.config.mts` and in the code-health baseline.
- Vize is experimental and releases often. The catalog pins one version, and `minimumReleaseAge` applies.

Speed, editor-ui, 1,127 SFCs: `vize lint` takes 0.3 s and Oxlint about 5 s. ESLint took about 92 s, most of it parsing every SFC for the type-aware rules.

To prove parity for a frontend package, snapshot ESLint from a commit that still has the ESLint configs, then run `oxlint-parity.mjs`. The parity script accepts the rules the Oxlint layers enforce on purpose beyond ESLint (`OXLINT_ONLY`).

## Node package blockers

The `n8n-nodes-base` plugin contributes 94 enforced rules:

- 12 credential rules in `packages/@n8n/eslint-config/src/configs/nodes.ts`.
- 82 node rules in the same config.

The blocker is not known type awareness. The plugin needs a compatibility test through Oxlint's JavaScript plugin bridge. Its file-scoped rule tables also need an Oxlint translation.

Use the rule tables in `packages/@n8n/eslint-config/src/configs/nodes.ts` as the canonical list. They change more often than this document and must not be duplicated here.

Suggested spike:

1. Load `eslint-plugin-n8n-nodes-base` through `jsPlugins` in an isolated node package.
2. Run all 12 credential rules against representative valid and invalid files.
3. Run the 82 node rules against representative valid and invalid files.
4. Compare diagnostics, locations, options, and fixes with ESLint.
5. Add the working file-scoped tables to `@n8n/oxlint-config/nodes`.

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
5. Run a JS-plugin bridge spike for `n8n-nodes-base`.
6. Enable Vize's type-aware rules for SFC scripts when they leave experimental status.

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
