#!/usr/bin/env node
// Phase-1 docker build via bake: host build (compiled/ + task-runner) then the
// parallel `ci` bake group (n8n + runner-alpine). A Node wrapper rather than a
// shell `&&` chain so trailing args appended by setup-nodejs (e.g. --summarize,
// meant for turbo) are ignored instead of reaching `docker buildx bake`, which
// rejects unknown flags. Mirrors how dockerize-n8n.mjs tolerates them.

import { execFileSync } from 'node:child_process';

const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' });

run('node', ['scripts/build-n8n.mjs']);
run('docker', ['buildx', 'bake', 'ci', '--load', '--provenance=false']);
