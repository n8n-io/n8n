![n8n.io - Workflow Automation](https://user-images.githubusercontent.com/65276001/173571060-9f2f6d7b-bac0-43b6-bdb2-001da9694058.png)

# n8n-workflow

Workflow base code for n8n

```
npm install n8n-workflow
```

## Codex (`.node.json`) schema

This package owns the canonical zod schema for `.node.json` (codex) files
(`src/codex-file-schema.ts`). At build time it is compiled to JSON Schema
artifacts under `schemas/`, which are shipped with the published package
and can be consumed via jsDelivr for IDE intellisense.

The recommended `$schema` URL for community node authors is the unpinned
`@latest` form — matching how Renovate, Turborepo and most other projects
publish their schemas:

```
https://cdn.jsdelivr.net/npm/n8n-workflow@latest/schemas/community-node-codex-file.schema.json
```

Authors who want reproducible pinning (so editor behaviour can't shift
underneath them) can pin to an exact `n8n-workflow` release instead:

```
https://cdn.jsdelivr.net/npm/n8n-workflow@<exact-version>/schemas/community-node-codex-file.schema.json
```

The base profile (`schemas/node-codex-file.schema.json`) is intended for
internal n8n usage; community authors should use the community profile.

To regenerate the artifacts after changing the zod source, run
`pnpm --filter n8n-workflow generate-schemas` (also runs as part of
`pnpm --filter n8n-workflow build`). The generator detects drift between
the committed files and the zod source: it writes the updated content (so
`git status` shows the change) and exits non-zero, so any build with stale
schemas fails — both locally and in CI, with no separate verification
step.

### Semver discipline

Changes to the codex schema are **public API** because community node
authors reference a `$schema` URL that is served from the published
`n8n-workflow` package. Treat them as semver events:

- **Patch / minor** — adding a new optional field, broadening an existing
  constraint, fixing a bug in the regex.
- **Major (breaking)** — adding a required field, tightening an existing
  constraint (e.g. narrowing a regex, marking an optional field required,
  removing a previously accepted field). A breaking change requires a
  major bump of `n8n-workflow`.

Authors using the recommended `@latest` URL will track schema changes
automatically and may see new editor warnings after a major bump if their
files use removed or tightened fields. Authors who pinned to `@<exact>`
keep their previous validation behaviour until they choose to upgrade.

## License

You can find the license information [here](https://github.com/n8n-io/n8n/blob/master/README.md#license)
