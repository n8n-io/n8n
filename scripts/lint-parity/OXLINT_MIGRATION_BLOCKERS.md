# Oxlint migration blockers

Last reviewed: 2026-09-18  
Oxlint version: 1.78.0

This file is the working backlog for the ESLint to Oxlint migration. It focuses on rules that block an Oxlint-only lint command for many packages. `oxlint-gap.json` is the machine-readable source of truth for shared-layer parity.

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
| P0 | `import-x/no-extraneous-dependencies` | Oxlint reserves the `import-x` plugin name. The JS plugin bridge has not been validated with an alias. | Test `eslint-plugin-import-x` under an alias. If that is unstable, implement a native package-manifest check. |
| P1 | `no-restricted-syntax` | Oxlint has no AST-selector rule. The base layer uses it for the raw-enum restriction. | Add a purpose-built syntax rule for each active selector. Start with the raw-enum rule. |
| P1 | `typescript/consistent-type-imports` | Oxlint does not honor the `emitDecoratorMetadata` exception. Its fixer can remove imports that DI needs at runtime. | Wait for upstream support or add a tested shim that skips decorated files. Do not enable the current fixer. |
| P1 | `typescript/prefer-optional-chain` | The native nursery rule changes guarded undeclared globals incorrectly. | Re-test after the rule leaves nursery or after the upstream fixer issue is resolved. |
| P2 | `import/export` | A native rule exists, but it is still in the nursery category. | Run parity samples and enable it after it becomes stable. |
| P3 | `no-octal` | Oxlint has no rule. The parser already rejects relevant octal syntax in module and strict-mode code. | Confirm parser coverage and retire the explicit rule if no supported source form remains. |

## Package-level typed blocker

### `@typescript-eslint/naming-convention`

Oxlint has no native equivalent. The shared base disables this rule, but multiple package configs enable it at `error`. This blocks those packages from reaching full parity even after the shared blockers are complete.

Possible approaches:

1. Retire rules that only enforce style preferences.
2. Replace important selectors with small syntax-only custom rules.
3. Use existing Oxlint rules for specific conventions, such as filename or identifier restrictions.
4. Keep a narrow ESLint pass only in packages whose convention protects an API contract.

Audit every package configuration before conversion. Do not copy the full generic naming rule into a new custom implementation.

## Frontend package blockers

Oxlint can lint the script section of a Vue SFC, but it does not expose the Vue template AST. An Oxlint-only frontend package would lose the following 59 rules:

```text
vue/block-order
vue/comment-directive
vue/component-name-in-template-casing
vue/jsx-uses-vars
vue/no-child-content
vue/no-deprecated-dollar-listeners-api
vue/no-deprecated-dollar-scopedslots-api
vue/no-deprecated-filter
vue/no-deprecated-functional-template
vue/no-deprecated-html-element-is
vue/no-deprecated-inline-template
vue/no-deprecated-router-link-tag-prop
vue/no-deprecated-scope-attribute
vue/no-deprecated-slot-attribute
vue/no-deprecated-slot-scope-attribute
vue/no-deprecated-v-bind-sync
vue/no-deprecated-v-is
vue/no-deprecated-v-on-native-modifier
vue/no-deprecated-v-on-number-modifiers
vue/no-dupe-v-else-if
vue/no-duplicate-attributes
vue/no-multiple-template-root
vue/no-parsing-error
vue/no-ref-as-operand
vue/no-template-key
vue/no-textarea-mustache
vue/no-undef-components
vue/no-unused-components
vue/no-unused-vars
vue/no-use-computed-property-like-method
vue/no-use-v-if-with-v-for
vue/no-useless-template-attributes
vue/no-v-for-template-key-on-child
vue/no-v-html
vue/require-component-is
vue/require-macro-variable-name
vue/require-toggle-inside-transition
vue/require-v-for-key
vue/require-valid-default-prop
vue/use-v-on-exact
vue/v-slot-style
vue/valid-attribute-name
vue/valid-template-root
vue/valid-v-bind
vue/valid-v-cloak
vue/valid-v-else
vue/valid-v-else-if
vue/valid-v-for
vue/valid-v-html
vue/valid-v-if
vue/valid-v-is
vue/valid-v-memo
vue/valid-v-model
vue/valid-v-on
vue/valid-v-once
vue/valid-v-pre
vue/valid-v-show
vue/valid-v-slot
vue/valid-v-text
```

The design-system rule `@n8n/design-system/require-teleported-tooltip-in-dropdown` has the same blocker. It uses `vue-eslint-parser` template services, not TypeScript type information.

Suggested direction:

1. Keep ESLint for `.vue` files until Oxlint exposes a template AST or another template-aware linter replaces it.
2. Run Oxlint for `.ts`, `.tsx`, and the SFC script section.
3. Do not rewrite 60 template rules as source-text checks.

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

1. Resolve or isolate `import-x/no-extraneous-dependencies`.
2. Replace active `no-restricted-syntax` selectors with focused rules.
3. Resolve decorator-safe `consistent-type-imports` behavior.
4. Audit and reduce `naming-convention` package overrides.
5. Re-test the two nursery rules.
6. Run a JS-plugin bridge spike for `n8n-nodes-base`.
7. Keep a template-only ESLint pass for Vue until native template support exists.

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
