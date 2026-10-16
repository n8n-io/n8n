import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

function ignoreRule(path) {
	const result = spawnSync('git', ['check-ignore', '-v', '--no-index', '--', path], {
		cwd: repoRoot,
		encoding: 'utf8',
	});
	assert.ifError(result.error);
	assert.equal(result.status, 0, `${path} must be ignored by Git`);
	const [rule, ignoredPath] = result.stdout.trim().split('\t');
	assert.equal(ignoredPath, path);
	return rule;
}

test('ignores existing Vitest profile output', () => {
	assert.match(
		ignoreRule('packages/cli/.vitest-profile/json/output.json'),
		/^\.gitignore:\d+:\.vitest-profile\/$/,
	);
});

// DEVP-1240: Vitest 5 writes JSON reports into a package-local .vitest directory.
test('ignores Vitest JSON reports in workspace packages', () => {
	for (const path of [
		'packages/cli/.vitest/json/output.json',
		'packages/frontend/editor-ui/.vitest/json/output.json',
	]) {
		assert.match(ignoreRule(path), /^\.gitignore:\d+:\.vitest\/$/);
	}
});
