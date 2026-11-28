# Fault harness instructions

Read the [testing instructions](../AGENTS.md) first. See the [README](README.md) for how the harness works.

- Keep `src/hooks/preload.js` free of imports. It loads as a data URL and can use Node built-ins only.
- Run `pnpm test`, `pnpm lint` and `pnpm typecheck`.
