#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { exit, argv, stdout } from 'node:process';

const file = argv[2];
const n = Number(argv[3] ?? 10);
if (!file) {
	console.error('usage: grind.mjs <test-file> [n]');
	exit(2);
}

let passed = 0;
for (let i = 0; i < n; i++) {
	const res = spawnSync('pnpm', ['vitest', 'run', file, '--reporter=dot'], {
		stdio: ['ignore', 'inherit', 'inherit'],
	});
	if (res.status === 0) passed++;
	stdout.write(res.status === 0 ? '.' : 'F');
}
console.log(`\n${passed}/${n} passed`);
exit(passed === n ? 0 : 1);
