# Test rig instructions

Read the [testing instructions](../AGENTS.md) first. See the [README](README.md) for how the rig works.

- Keep `src/hooks/preload.js` free of imports. It loads as a data URL and can use Node built-ins only.
- When a spec hooks a method for the first time, add the method to `src/hooks/catalogue.ts`.
- Run `pnpm test`, `pnpm lint` and `pnpm typecheck`. Run `pnpm test:docker` when you change stack, hook, process or probe code. Run `pnpm scenarios <name> --runs 1` for each scenario whose spec you change.
