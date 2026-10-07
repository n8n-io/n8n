#!/usr/bin/env node
// Shim that exists in the source tree so pnpm can create the bin symlink at
// install time, before `pnpm build` produces dist/cli.js. Re-imports the
// built entry at invocation time, by which point the build has run via
// turbo's `^build` dependency on consuming tasks.
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
await import(resolve(here, '..', 'dist', 'cli.js'));
