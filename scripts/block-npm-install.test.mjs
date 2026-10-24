import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const script = fileURLToPath(new URL('./block-npm-install.js', import.meta.url));

test('rejects a package manager other than pnpm', () => {
	const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
	assert.equal(result.status, 1);
	assert.match(result.stderr, /pnpm/);
});

test('compares the running Node major with engines.node', () => {
	const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
	const floor = Number(String(pkg.engines.node).match(/^>=(\d+)/)?.[1]);
	const major = Number(process.versions.node.split('.')[0]);
	const result = spawnSync(process.execPath, [script], {
		cwd: root,
		encoding: 'utf8',
		env: { ...process.env, npm_config_user_agent: 'pnpm/12.4.2' },
	});
	if (major < floor) {
		assert.equal(result.status, 1);
		assert.match(result.stderr, /Node\.js/);
		return;
	}
	assert.equal(result.status, 0, result.stderr);
});
