# Test rig instructions

Read the [testing instructions](../AGENTS.md) first. See the [README](README.md) for how the rig works.

- The rig is a library and runner that controls whole n8n stacks from outside and inside their processes. It is not the Playwright E2E harness: it uses no Playwright fixtures or page objects, so it lives in its own workspace. Its scenario specs stay in the Playwright package, next to their runner.
- Keep `src/hooks/preload.js` free of imports. It loads as a data URL and can use Node built-ins only. Keep its validator in step with `hookSpecSchema` in `src/hooks/spec.ts`; `src/hooks/spec-fixtures.ts` tests both.
- Add a method to `src/hooks/catalogue.ts` when a spec hooks a new one.
- Never put a licence key or cert in a file. Multi-main runs read them from the shell.
- Run `pnpm test`, `pnpm lint` and `pnpm typecheck`. Run `pnpm test:docker` when you change stack, hook, process, network or probe code.
