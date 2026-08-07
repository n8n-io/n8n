# Frontend module

A frontend module is a self-contained unit of editor-ui functionality, shipped as its own
workspace package under `packages/frontend/modules/`, and registered with the editor-ui shell
through a descriptor.

Benefits of modularity:

- **Organization:** Feature code has one home, and a public entry that says what the rest of the
  app may use
- **Independence:** Typecheck, lint and test one feature in seconds instead of running all of
  editor-ui (~570K LOC)
- **Decoupling:** A module cannot reach into the shell or into another module, so features stop
  entangling
- **Ownership:** One package, one CODEOWNERS line
- **Parity:** The frontend module id matches its backend twin, and both gate off
  `/rest/module-settings`

Frontend modules are **source-only**: `"main": "src/index.ts"`, no `build` script, no `dist`.
Two reasons. `tsdown` — what `@n8n/stores` and friends build with — cannot compile `.vue` SFCs.
And a `dist` would have no consumer: every frontend package is already aliased to its `src`, so
the shell's Vite graph compiles module sources directly. "Built separately" here means
**typechecked, linted and tested separately**, which is where the CI win actually comes from.

This guide is written against the shipped scaffolder. Where it disagrees with the original
modularization design proposal (CAT-3680), the code wins; those disagreements are called out
inline.

## Quickstart

From the monorepo root:

```sh
pnpm setup-frontend-module my-feature
```

The name is the canonical spelling of your module — it becomes the package suffix, the directory
name, the file infix, the descriptor `id`, and the backend module id it must match. It must be
kebab-case; the script rejects anything else.

Real output:

```
Created @n8n/frontend-module-my-feature at packages/frontend/modules/my-feature
  updated @n8n/vitest-config/frontend-source-packages.ts (Vite alias)
  updated editor-ui/package.json (dependency)
  updated editor-ui/tsconfig.json (paths)
  updated editor-ui/src/app/modules.manifest.ts (registration)

Next:
  pnpm install
  pnpm --filter @n8n/frontend-module-my-feature typecheck
  pnpm --filter @n8n/frontend-module-my-feature lint
  pnpm --filter @n8n/frontend-module-my-feature test
```

Then:

```sh
pnpm install                                              # link the new workspace package
pnpm turbo typecheck lint test --filter=@n8n/frontend-module-my-feature
```

⚠️ **Use `pnpm turbo typecheck`, not `pnpm --filter … typecheck`, on a fresh tree.** The
scaffolder's printed next-steps are right for a warm tree only. `n8n-workflow` and
`@n8n/permissions` are consumed from their built `dist` (they are not in the module tsconfig
base's `paths`), so a direct `--filter` run before those are built fails with a wall of

```
../../../@n8n/api-types/src/scaling.ts(1,59): error TS2307: Cannot find module 'n8n-workflow' or its corresponding type declarations.
```

Nothing is wrong with your module. `turbo typecheck` declares `dependsOn: ["^build"]`, builds
the dependencies first, and passes. `lint` and `test` are green either way.

Every edit the scaffolder makes is idempotent, so re-running after a partial failure is safe.

## File structure

```sh
packages/frontend/modules/my-feature/
├── package.json               # source-only; deps are L0-L2 only
├── tsconfig.json              # extends the shared module base
├── vite.config.ts             # vitest config + the shared source aliases
├── eslint.config.mjs
├── biome.jsonc
├── README.md
└── src/
    ├── index.ts               # the ONLY public entry
    ├── my-feature.module.ts   # the descriptor (entrypoint)
    ├── my-feature.store.ts    # Pinia store(s)
    ├── my-feature.store.test.ts
    └── __tests__/
        └── setup.ts           # per-package test bootstrap
```

Add what you need — `views/`, `components/`, `composables/`, `my-feature.api.ts`,
`my-feature.constants.ts`. As on the backend, infixes are not enforced (except on `.module.ts`)
but are strongly recommended: they make files searchable once a module has several dozen.

The worked example in-repo is **`packages/frontend/modules/instance-registry`** — the first real
extraction, small enough to read in one sitting.

## Entrypoint

Two files make up the entrypoint: `src/index.ts` (what the shell may import) and
`src/<name>.module.ts` (the descriptor).

```ts
// src/index.ts — the module's only public entry.
export { MyFeatureModule } from './my-feature.module';
export { useMyFeatureStore } from './my-feature.store';
```

Deep paths into `src/` are not part of the contract. If the shell or another package needs
something, export it here.

```ts
// src/my-feature.module.ts
import type { FrontendModuleDescription } from '@n8n/frontend-module-sdk';

export const MyFeatureModule: FrontendModuleDescription = {
	// Must match the backend module id: both gate off `/rest/module-settings`.
	id: 'my-feature',
	name: 'My Feature',
	description: 'What this module does',
	icon: 'box',
};
```

`id` is load-bearing. `settingsStore.isModuleActive(id)` reads the backend's `activeModules`
list, so an id with no backend twin is never active — and any route that opts into the module
availability guard (below) will refuse to resolve.

## The descriptor contract

`FrontendModuleDescription` (`@n8n/frontend-module-sdk/src/types/descriptor.ts`) types eleven
extension surfaces. **Five are wired in the shell. Six are types-only.**

### Live — the shell reads these today

| Field           | Registered by                                        | Rendered by            |
| --------------- | ---------------------------------------------------- | ---------------------- |
| `routes`        | `registerModuleRoutes(router)` — `main.ts:50`         | vue-router             |
| `projectTabs`   | `registerModuleProjectTabs()` — `init/index.ts:237`   | `ProjectHeader`        |
| `resources`     | `registerModuleResources()` — `init/index.ts:236`     | `ResourcesListLayout`  |
| `modals`        | `registerModuleModals()` — `init/index.ts:238`        | `DynamicModalLoader`   |
| `settingsPages` | `registerModuleSettingsPages()` — `init/index.ts:239` | `SettingsSidebar`      |

### Types-only — setting these does nothing at runtime

`locales` · `pushHandlers` · `commands` · `shortcuts` · `banners` · `setup`

The SDK exports the types, and for `pushHandlers` and `commands` it also exports a registry —
but **no shell host reads any of them yet**. A value you set here is silently ignored: no error,
no warning, no behaviour. Verified by grep: zero read sites in `editor-ui/src` for all six.

Do not use them yet. The wiring is tracked in **CAT-3685**. The scaffolded descriptor carries
this same warning as a comment so it is in front of you while you write.

This is the one place a module author is most likely to lose an afternoon — the type accepts
your `commands` array happily, and nothing ever calls it.

### Route gating

`registerModuleRoutes` stamps `meta.moduleName = <module id>` onto every route a module
contributes, but the availability check is **opt-in per route**. It only runs if the route asks
for it:

```ts
routes: [
	{
		path: 'my-feature',
		name: VIEWS.MY_FEATURE,
		component: MyFeatureView,
		meta: {
			middleware: ['authenticated', 'rbac', 'custom'], // 'custom' → checkModuleAvailability
			middlewareOptions: { rbac: { scope: 'myFeature:manage' } },
		},
	},
],
```

Without `'custom'` in `meta.middleware`, the route resolves whether or not the module is active.

## Import-light descriptors

The descriptor file may import **types and the SDK only**. Views load lazily; stores are
referenced inside guards, handlers or `setup`, never at module scope.

```ts
const MyFeatureView = async () => await import('./views/MyFeatureView.vue');
```

Two reasons, one of them load-bearing today:

1. **Boot order.** `modules.manifest.ts` is reached through `main.ts`'s own imports, so every
   descriptor body is evaluated *before* `app.use(pinia)` runs (`main.ts:56`). A top-level
   `useXStore()` call therefore executes with no active Pinia.
2. **Future chunking.** Import-light descriptors are the precondition for per-module `import()`
   chunks. A descriptor that eagerly pulls its own views drags the whole module into
   the entry bundle even when the module is disabled.

**This is a burn-down, not a clean slate.** All eight in-shell descriptors already lazy-load
their view components — that part is settled convention, codified here. But seven of the eight
still eagerly import a store, a composable, `i18n`, or `hasPermission` at module scope, and
`dataTable/module.descriptor.ts:9` reaches across features for `useInsightsStore`. Fix the
descriptor you are extracting; don't take the existing ones as the pattern.

## Imports and boundaries

A module may depend on **L0–L2 packages only**:

`@n8n/api-types` · `@n8n/composables` · `@n8n/design-system` · `@n8n/frontend-module-sdk` ·
`@n8n/i18n` · `@n8n/permissions` · `@n8n/rest-api-client` · `@n8n/stores` · `n8n-workflow` ·
`vue` · `vue-router` · `pinia`

Never import another `@n8n/frontend-module-*`. Never import `@/…` — that is the shell.

### ⚠️ `@n8n/stores` and `@n8n/composables` are subpath-only

This one bites everybody, and it fails in two different ways:

```ts
import { useSettingsStore } from '@n8n/stores';       // ❌ TS2305: no exported member
import { useToast } from '@n8n/composables';          // ❌ TS2307: cannot find module

import { useSettingsStore } from '@n8n/stores/settings.store';   // ✅
import { useToast } from '@n8n/composables/useToast';            // ✅
```

`@n8n/stores/src/index.ts` is a single line — `export * from './constants'` — so a root import
resolves but exposes nothing you want. `@n8n/composables` has no `src/index.ts` at all and
declares only `"./*"` in its `exports`, so a root import does not resolve. The source-packages
table encodes this: `entry: false` marks a package with no root entry, and it gets no
bare-specifier alias, deliberately
(`@n8n/vitest-config/frontend-source-packages.ts`).

Always import the subpath. The design proposal's dependency list implies root imports; it is
wrong.

### The no-cross-module rule: what is enforced, and what is not

Be precise about this one, because two different things get called "the boundary".

**Accidental cross-module imports are blocked, in two places.** A module's `vite.config.ts`
spreads `frontendSourceAliases` only — the platform table. Sibling modules live in a second
array, `modulePackages`, which only the shell expands. So a stray import of a sibling fails to
resolve at test time:

```
Error: Failed to resolve import "@n8n/frontend-module-instance-registry" from "src/cross.test.ts". Does the file exist?
```

And it fails at typecheck too, because the shared tsconfig base omits module `paths`.

**A deliberate cross-module import is still not blocked by either.** Add the sibling to your
`dependencies`, and pnpm symlinks it; because modules are source-only (`"main": "src/index.ts"`),
node resolution finds it with no alias involved. Verified both ways on this branch: with the
dependency declared, the same import runs green under vitest **and** typechecks clean under
`vue-tsc`. The tsconfig base says so itself:

> `paths` lists the L0-L2 packages a module consumes from source. Module packages are absent
> from it on purpose, which stops an *accidental* cross-module import — but it is not a
> boundary: `paths` is additive, so once a module declares another module as a dependency,
> pnpm symlinks it and the import typechecks clean. Boundary enforcement is the ESLint rule.
>
> — `packages/@n8n/typescript-config/tsconfig.frontend-module.json`, lines 7–10

So: the alias split raises the cost of an accident from "silently works" to "fails in two
places". It does not stop anyone who means it. The enforcement that would is an ESLint
`no-restricted-imports` rule, and **it does not exist in the repo yet** — tracked as
**CAT-3692**. Until it lands, treat the boundary as a review responsibility. Reviewers: a new
`@n8n/frontend-module-*` entry in a module's `dependencies` is the tell, and it is the *only*
tell — once it is there, every check goes green.

## Stores

Pinia stores self-register on the first `use…Store()` call, so there is nothing to declare in
the descriptor and no lifecycle to wire.

```ts
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useMyFeatureStore = defineStore('myFeature', () => {
	const isReady = ref(false);
	const markReady = () => { isReady.value = true; };
	return { isReady, markReady };
});
```

Export the store from `src/index.ts` if anything outside the module reads it —
`instance-registry` does exactly this, because the About modal and the debug-info report consume
its cluster-info store.

## Module settings and the timing trap

There are two levels of gating, and they come from **different endpoints at different times**:

```ts
// Level 1 — is the module enabled on this instance at all?
settingsStore.isModuleActive('my-feature')          // from `settings.activeModules`

// Level 2 — module-specific configuration
settingsStore.moduleSettings['my-feature']?.enabled // from `/rest/module-settings`
```

⚠️ **`moduleSettings` is `{}` until after login.** `getModuleSettings()` runs exactly once,
inside the login hook at `editor-ui/src/app/init/index.ts:296`. During bootstrap and route
registration the bag is empty, so an eager read returns `undefined` and silently behaves like
"disabled".

Never read it at module scope, in a store's setup body, or anywhere on the pre-login path. Read
it inside a route guard, a computed, or an event handler. The two-level pattern in full:

```ts
const isEnabled = computed(
	() => settingsStore.isModuleActive('my-feature') &&
	      settingsStore.moduleSettings['my-feature']?.enabled === true,
);
```

`isModuleActive` alone is safe earlier — it reads the main settings payload, not
`/rest/module-settings` — but it is still not populated before `getSettings()`.

## Registering with the shell

A module is inert until the shell can see it. That takes **four file edits plus a CODEOWNERS
line** — the scaffolder makes the four edits for you, and this section exists for when you are
hand-registering or debugging a red CI.

| # | Where                                                  | What                                        | Scaffolded? |
| - | ------------------------------------------------------ | ------------------------------------------- | ----------- |
| 1 | `@n8n/vitest-config/frontend-source-packages.ts`       | an entry in the `modulePackages` array       | ✅          |
| 2 | `editor-ui/package.json`                               | `"@n8n/frontend-module-x": "workspace:*"`    | ✅          |
| 3 | `editor-ui/tsconfig.json`                              | two `paths` entries (bare + `/*`)            | ✅          |
| 4 | `editor-ui/src/app/modules.manifest.ts`                | import + array entry                         | ✅          |
| 5 | `.github/CODEOWNERS`                                   | one line for the new package                 | ❌ do this  |

The frontend has no CODEOWNERS entries at all today, so #5 is a new habit rather than a line to
copy. Add yours at creation time — a package with no owner is how half-migrations rot.

**#1, #2 and #3 must land in the same PR.** They are not alternatives, and each covers a
different resolver:

- **#1** is the Vite alias — what makes the dev server and the production bundle load your module
  from `src`. The mapping is **hand-maintained**; it does not appear on its own.
- **#2** is what makes a bare import resolve outside Vite at all — vue-tsc, node.
- **#3** is what makes vue-tsc resolve the same `src` Vite does.

⚠️ **The list used to be derived from the filesystem. It is not any more** — `fae4c98` reversed
that deliberately, in favour of a table you read and edit. If you are working from an older
description of this system, that is the part that changed.

### The table is guarded by name

Miss #1 and you do not get a silent bundle/typecheck split — you get a named test failure.
Dropping a module from the table and running `editor-ui/vite/aliases.test.ts`:

```
 FAIL  vite/aliases.test.ts > editor-ui vite aliases > aliases every source package editor-ui typechecks from src
AssertionError: expected [ '@n8n/frontend-module-my-feature' ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "@n8n/frontend-module-my-feature",
+ ]
```

It names the package you forgot. That test is the enforcement for registration — a real gate,
not a convention — and it exists because the failure it catches is not hypothetical: four
packages spent months typechecked from `src` while the bundle was built from their `dist`.

Note what it does and does not cover. It guards that the alias table, editor-ui's `paths` and the
shared module base all agree. It says nothing about whether one module imports another — that is
the separate, still-unenforced boundary above.

The old `pnpm check:frontend-aliases` script is gone; `aliases.test.ts` replaced it, so the guard
now runs in the normal frontend test job rather than in `lint:ci`.

If you add or rename a **platform** package, add it to the `sourcePackages` array in the same
file, and update `editor-ui/tsconfig.json` and `tsconfig.frontend-module.json` to match. The same
test tells you if you missed one.

`packages/@n8n/typescript-config/tsconfig.frontend-module.json` is **hand-maintained** and has to
agree with both the alias table and editor-ui's `paths`. `aliases.test.ts` fails when they
diverge.

## Typecheck

Each module runs its own `vue-tsc --noEmit` against
`@n8n/typescript-config/tsconfig.frontend-module.json`. Three things about that base are worth
knowing before they surprise you.

### `paths` is inherited; `rootDirs`, `types` and `include` are not

Relative entries in `rootDirs`, `types` and `include` resolve against the **consuming** config,
so a copy of them in the base would point at the base's own directory. `paths` is the exception —
it anchors to the file that *declares* it, which is what lets one shared base serve modules at
any depth. That asymmetry is why the module tsconfig template looks lopsided.

### Ambient `.d.ts` shims live per-module, for the same reason

```jsonc
"types": [
	"vite/client",
	"vitest/globals",
	"unplugin-icons/types/vue",
	"../../@n8n/design-system/src/shims-modules.d.ts",  // ~icons/*, markdown-it-task-lists
	"../../@n8n/stores/src/shims.d.ts"                  // window.BASE_PATH
]
```

These are ambient declarations your module never imports — nothing pulls them into the program on
its own. They are here because you consume `@n8n/design-system` and `@n8n/stores` **from source**:
a built `dist` would have carried its own declarations, and consuming source makes them the
consumer's problem. They cannot be hoisted into the shared base, by the resolution rule above.

Keep them. If a module drops the `@n8n/design-system` dependency, drop the matching shim with it.

### `useUnknownInCatchVariables: false`

Every module inherits it (base line 24). A `catch` variable types as **`any`, not `unknown`** —
so this compiles clean inside a module, and would not elsewhere:

```ts
try { … } catch (error) {
	error.anything;  // no TS18046. `error` is `any`.
}
```

This is not a style choice and not a licence to be sloppy. It is the price of consuming
`@n8n/rest-api-client` from source: that package sets the flag in its own tsconfig and its
`catch` blocks rely on it, so the flag has to hold in every consumer. editor-ui carries the same
line. It goes away when that package's source stops needing it. Narrow your errors by hand.

## Lint

```sh
pnpm --filter @n8n/frontend-module-my-feature lint      # eslint src --quiet
pnpm --filter @n8n/frontend-module-my-feature lint:fix
```

⚠️ **Extracted code hits stricter lint than it did in the shell.** `editor-ui/eslint.config.mjs:203`
sets `'import-x/order': 'off'`; the shared frontend config leaves it on. So code that was green
inside editor-ui goes red the moment it moves into a module:

```
  2:1  error  `@n8n/stores/settings.store` import should occur before import of `vue`  import-x/order

✖ 1 problem (1 error, 0 warnings)
  1 error and 0 warnings potentially fixable with the `--fix` option.
```

Autofixable — `pnpm lint:fix` clears it. Expect a non-behavioural import-order churn in every
extraction PR, keep it in its own commit so reviewers can skip it, and say so in the PR body. A
first-time module author who reads that red as their own mistake will go looking for a bug that
isn't there.

## Tests

```sh
pnpm --filter @n8n/frontend-module-my-feature test        # vitest run
pnpm --filter @n8n/frontend-module-my-feature test:dev    # watch
```

Colocate tests next to the code (`my-feature.store.test.ts`), the same convention editor-ui uses.
`vite.config.ts` already wires `@vitejs/plugin-vue` and the shared source aliases, so `.vue` files
compile in tests with no extra setup. `src/__tests__/setup.ts` imports the shared jsdom harness
(`@n8n/vitest-config/setup/frontend` — observers, matchMedia, canvas, timers, teardown guards) and
boots Pinia per test. Framework boot stays per-package on purpose: `@n8n/i18n` devDepends on
`@n8n/vitest-config`, so booting i18n inside the shared harness would close a turbo cycle. Add
`useI18n` boot to your own setup file if you need it.

### Two entries in `package.json` are mandatory, not optional

**`"test:changed": "janitor test-scoped"`.** PR CI runs
`turbo run test:changed --continue --filter='./packages/frontend/**'`. Turbo **silently no-ops a
package that does not define the script** — no error, no skip notice. Your suite simply never
runs in PR CI, and the job is green.

This is not hypothetical: `@n8n/frontend-module-sdk`, `@n8n/frontend-constants` and
`@n8n/frontend-utils` are in exactly that hole today. Do not add a fourth.

**`passWithNoTests: true`.** Inherited from `@n8n/vitest-config/frontend` (`frontend.ts:33`), so
you get it for free — but do not override it. CI shards the frontend two ways
(`--shard=N/2`), and vitest exits non-zero when a shard is handed no test files. A sparse module
would fail on shard 2 for no reason.

The pair is a trade: `passWithNoTests` means an empty module suite is green rather than red. So
`test:changed` and a real test are what actually protect you. The scaffolder emits a passing
example test — replace it, don't delete it.

## Publishing

Frontend modules are **published packages** — no `"private": true`. This reverses the design
proposal deliberately (Alex, 2026-08-05).

`scripts/check-workspace-private-deps.mjs` fails `pnpm lint:ci` when a non-private package has a
private workspace **runtime** dependency. `n8n-editor-ui` is published and depends on every
module at runtime, so marking a module private breaks `npm install n8n` — the install graph would
point at packages that were never published. Keep `"license": "LicenseRef-n8n-sustainable-use"`
and leave `private` off.

## Future work

1. **Six descriptor surfaces are typed but not wired** — `locales`, `pushHandlers`, `commands`,
   `shortcuts`, `banners`, `setup` (**CAT-3685**). Until then, cross-feature glue still goes
   through the shell.
2. **The cross-module boundary has no enforcement against a deliberate import** — the ESLint
   `no-restricted-imports` rule is **CAT-3692**. The alias split blocks accidents at test time and
   the tsconfig base blocks them at typecheck, but declaring the dependency clears both. It
   should land before the second extraction, not after.
3. **Per-module i18n.** Modules currently keep their strings in the central `@n8n/i18n` `en.json`.
   The `locales` descriptor field plus per-module key types is the target; central `en.json` is
   the accepted fallback and must not become permanent.
4. **Per-module build-time chunks.** Once descriptors are genuinely import-light, the manifest can
   become a static map of dynamic imports and Vite emits one chunk per module. Decision point is
   wave-2 exit, with bundle data. Runtime dynamic loading is ruled out.
5. **The scaffolder's printed next-steps** suggest `pnpm --filter … typecheck`, which fails on a
   cold tree. Prefer `pnpm turbo typecheck --filter=…` until that line is fixed.
6. **CODEOWNERS is manual.** Adding it to the scaffolder is a small, obvious follow-up.

## FAQs

- **What is a good example of a frontend module?** `packages/frontend/modules/instance-registry` —
  the first extraction, small enough to read end to end.
- **Why is there no `build` script?** There is nothing to build. Modules are consumed from source
  by whatever Vite context loads them — the dev server, the shell's production build, or the
  module's own vitest. See the intro.
- **Does `pnpm dev` still hot-reload?** Yes, unchanged. One Vite dev server; editing a file inside
  a module HMRs exactly as it did under `editor-ui/src/features/`.
- **My module needs something from another module. What do I do?** Don't import it. Either the
  shared piece belongs in an L2 package (`@n8n/stores`, `@n8n/composables`), or the two features
  are one module. If you genuinely need a contribution point that doesn't exist, raise it against
  the SDK — the registries are the supported inversion, not a direct import.
- **Do I need a backend module too?** Only if your feature needs backend gating. But if a backend
  twin exists, the ids **must** match — `isModuleActive` and `/rest/module-settings` key off the
  same string. See `scripts/backend-module/backend-module-guide.md`.
- **Should every new feature be a module?** New features should be born as packages once the
  pattern is proven on the Wave-1 pilots. The editor core — canvas, NDV, node creator — stays in
  the shell for now; see the modularization roadmap on CAT-3680.
- **Does a module PR use a special PR-title scope?** No. Module PRs keep the `editor` scope.
- **How do I remove a module?** Reverse the four registration points, delete the package, run
  `pnpm install`, and re-run `editor-ui/vite/aliases.test.ts`. Check inbound imports first.
