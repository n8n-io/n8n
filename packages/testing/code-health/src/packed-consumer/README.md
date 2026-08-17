# Packed-consumer check

Builds, typechecks and loads a generated consumer project against the **packed tarball** of
`@n8n/design-system`, outside the workspace resolution graph.

```bash
# Everything: pack, install from the registry, typecheck, build, load under Node (~35s).
pnpm --dir packages/testing/code-health exec tsx src/cli.ts verify-packed-consumer

# Static half only: does the exports map cover every specifier the monorepo imports? (~6s)
pnpm --dir packages/testing/code-health exec tsx src/cli.ts verify-packed-consumer --static-only

# Keep the scratch project to poke at it.
pnpm --dir packages/testing/code-health exec tsx src/cli.ts verify-packed-consumer --keep
```

`dist` must be built first — `pnpm pack` packs what is on disk:

```bash
pnpm turbo run build --filter=@n8n/design-system...
```

## Why this exists

`@n8n/design-system` published a broken artifact for months with a green pipeline. Nothing in the
monorepo consumed `dist`: every internal package aliases `@n8n/design-system(.*)` to `src$1`, so
the published output was never exercised by anything. The artifact was fixed; this is the check
that stops it rotting again.

## What it checks

Each phase fails the command.

1. **Export targets present.** Every non-wildcard `exports` target resolves to a file in the
   tarball.
2. **Specifier coverage.** Every `@n8n/design-system…` specifier written anywhere in the monorepo
   resolves through the published `exports` map to a file that ships. This is the half that
   catches a deep import added elsewhere — the kind that resolves fine inside the workspace
   through the alias and resolves nowhere for anybody else.
3. **Peer ranges.** Every peer the packed manifest declares matches the range the consumer
   installs. Both come from the same catalog entry, so equality is the invariant.
4. **Typecheck.** `vue-tsc --noEmit` over a consumer that uses a generically typed slot
   (`N8nDataTableServer`'s `#item`, whose payload reaches a `@tanstack/vue-table` type through the
   emitted declarations) plus explicit assertions that the published types have not degraded to
   `any`.
5. **Build.** `vite build` with the stock Vue plugin and nothing else. Needing the icon plugin here
   would mean the pre-built icon chunks stopped shipping.
6. **Load under plain Node.** Each module subpath imported one at a time as native ESM, then an
   icon body fetched through the public loader for every chunk the icon entry references.

## Design decisions worth knowing

**Nothing is enumerated by hand.** The probe surface comes from the target's `exports` map, the
specifier set from a scan of the repo, the toolchain versions from the target's own manifest via
the pnpm catalog, and the expected icon chunks from the icon entry's own dynamic imports. A
subpath, a consumer or a chunk added tomorrow is covered with no edit here. The one exception is
the component named in the fixture: the acceptance criteria call for a typed slot, and that is
inherently a named example. If it leaves the barrel the fixture stops compiling, which is a loud
failure rather than silent rot.

**The file set comes from `git ls-files`, not from a glob.** A glob needs a hand-written list of
directories to skip, and every entry missing from that list is a silent hole. Two were found in
review: `fast-glob`'s default `dot: false` hid `.storybook/`, where a build-time config imports
this package (two real violations passed under it), and `storybook-static/` — build output nobody
had thought to exclude — contributed four specifiers out of bundled asset chunks. Tracked-or-not
answers both permanently and without a list: generated output is never tracked, and a
dot-directory is tracked like anything else. The command throws rather than falling back to a
filesystem walk, because a fallback would scan a different set than it reports.

**Test files and this package are still excluded** — but as semantic exclusions, each stated with
its reason in `isSemanticallyExcluded`. A test never ships, and a test is exactly where a made-up
specifier appears as a fixture string; this checker generates consumer code, so it holds
specifiers as data. Both were observed producing phantom findings.

**Two specifiers are grandfathered, loudly.** `.storybook/preview.ts` imports
`@n8n/design-system/plugin` and `…/composables/useIconBodyLoader` deeply on purpose — `preview.ts`
is a TurboSnap global, and a barrel import would make every component a global dep and force a
full Chromatic snapshot on any component change. Those imports predate the stage-5 exports flip by
three weeks, so the subpath migration missed them under the same dot-directory blind spot. Both
symbols are on the root barrel, so a root import compiles, but it costs that property — which is
not this job's call to spend. They sit in `grandfathered.ts` with their reason, are printed on
every run, and the check **fails if one becomes resolvable**, so the exception cannot outlive its
cause. Anything new is enforced normally.

Subpaths with no monorepo consumer are still covered: `style.css` and `theme.css` exist for
external consumers only, and the fixture imports them because its CSS import list comes from the
`exports` map rather than from the scan.

**`@n8n/design-system/src/…` specifiers are skipped.** They are deliberately outside `exports`;
`files` ships `dist`, not `src`. Storybook and the browser extension use them through a
build-time alias.

**`skipLibCheck` stays on.** Turning it off checks every third-party `.d.ts` in the install too,
so an upstream dependency shipping bad types would redden this job for a defect nobody here can
fix. The declarations that matter are held to account at their use site instead, by the
assertions in the generated `src/type-probe.ts`.

**No `--legacy-peer-deps`.** npm satisfies a conflicting peer by nesting a second copy, which is
what makes the package loadable. The flag flattens instead, and a flattened tree fails at link
time — it reported a broken `@tiptap/extension-list` against an older `@tiptap/core` as a defect
in the tarball, which it was not. One stale peer range (`@vitejs/plugin-vue@5` still declares a
Vite 5–6 peer, and the catalog is on Vite 8) is narrowed in the fixture's `overrides` instead.

**The negative controls have been run.** Each was injected and each failed the job:

| Injected defect | Caught by |
| --- | --- |
| `./icons/lucide` removed from the `exports` map | phase 2, naming the importing file |
| One pre-built icon bucket chunk deleted from `dist` | phase 6, naming the chunk; also phase 5 |
| `TableHeader<T>` widened to `any` in the shipped `.d.ts` | phase 4 (`TS2344`, and `TS2578` on the now-unused `@ts-expect-error`) |
| A new unexported deep import added to `editor-ui` | phase 2 — the grandfathered list does not excuse it |
| `./plugin` added to `exports`, making a grandfathered entry stale | phase 2, telling you to delete the entry |

## Known confusion this does not fix

`@n8n/chat` resolves the bare `@n8n/design-system` specifier through `exports` to `dist` rather
than to source. CI is safe because turbo orders `test` after `^build`, but `vitest run` invoked
directly inside `chat` on a **fresh clone** fails with
`Failed to resolve import "@n8n/design-system"`, because `dist` is gitignored and has not been
built yet. Build first:

```bash
pnpm turbo run build --filter=@n8n/design-system...
pnpm --filter @n8n/chat test
```

This is confusing rather than broken, and "run the tests in this package" is the first thing a new
contributor tries.
