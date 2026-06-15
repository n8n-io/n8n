#!/usr/bin/env node
// prepare-docker via bake: host build (compiled/ + task-runner) then the
// parallel `ci` group (n8n + runner-alpine), with build metrics captured.
// A wrapper so trailing args from setup-nodejs (e.g. --summarize) are ignored.

import { execFileSync } from 'node:child_process';
import { openSync } from 'node:fs';

execFileSync('node', ['scripts/build-n8n.mjs'], { stdio: 'inherit' });

const meta = '/tmp/bake-ci-meta.json';
const rawlog = '/tmp/bake-ci.jsonl';
const log = openSync(rawlog, 'w');
try {
	execFileSync(
		'docker',
		['buildx', 'bake', 'ci', '--load', '--provenance=false', '--metadata-file', meta, '--progress=rawjson'],
		{ stdio: ['inherit', log, log] },
	);
} catch {
	execFileSync('tail', ['-40', rawlog], { stdio: 'inherit' });
	process.exit(1);
}
execFileSync('node', ['scripts/build-metrics.mjs', rawlog, meta], { stdio: 'inherit' });
