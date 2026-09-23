import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { test } from 'node:test';

import {
	aggregateInventory,
	collectTarget,
	countDynamicTests,
	integrationTarget,
	unitTarget,
} from './test-inventory-core.mjs';

const repoRoot = '/repo';
const target = { dir: 'packages/example', package: 'example', lane: 'backend-unit', scope: 'full' };

test('routes frontend PR and nightly suites separately', () => {
	assert.deepEqual(
		unitTarget(
			{ scripts: { test: 'vitest run', 'test:changed': 'janitor test-scoped' } },
			'packages/frontend/a',
		),
		{ lane: 'frontend-unit', scope: 'changed', script: 'test' },
	);
	const nightly = unitTarget({ scripts: { test: 'vitest run' } }, 'packages/frontend/b');
	assert.deepEqual(nightly, { lane: 'frontend-nightly', scope: 'nightly only', script: 'test' });
	const integration = integrationTarget({
		name: 'n8n',
		scripts: { 'test:integration': 'vitest run' },
	});
	assert.deepEqual(integration, {
		lane: 'cli-integration',
		scope: 'changed',
		script: 'test:integration',
	});
});

test('counts expanded cases from leaf records and nested suites', () => {
	const leafRecords = [
		{ file: '/repo/packages/example/src/a.test.ts', name: 'case A' },
		{ file: '/repo/packages/example/src/a.test.ts', name: 'case B' },
		{ file: '/repo/packages/example/src/b.test.ts', name: 'case C' },
	];
	assert.deepEqual(countDynamicTests(JSON.stringify(leafRecords), target, repoRoot), {
		files: 2,
		fileCounts: [
			{ path: 'packages/example/src/a.test.ts', tests: 2 },
			{ path: 'packages/example/src/b.test.ts', tests: 1 },
		],
		tests: 3,
	});
	const nested = [
		{
			file: '/repo/packages/example/src/a.test.ts',
			tasks: [{ type: 'suite', tasks: [{ type: 'test' }, { type: 'test' }] }],
		},
	];
	assert.equal(countDynamicTests(JSON.stringify(nested), target, repoRoot).tests, 2);
});

function processStub(output) {
	const child = new EventEmitter();
	child.pid = 42;
	child.stdout = new EventEmitter();
	child.stderr = new EventEmitter();
	if (output !== null) {
		queueMicrotask(() => {
			child.stdout.emit('data', output);
			child.emit('close', 0);
		});
	}
	return child;
}

test('falls back to file listing when dynamic output has no JSON', async () => {
	const commands = [];
	const result = await collectTarget(target, 0, {
		outputDir: '/missing',
		dynamic: true,
		timeoutSeconds: 1,
		repoRoot,
		spawnProcess: (_command, args) => {
			commands.push(args);
			return processStub(commands.length === 1 ? 'not JSON' : 'src/a.test.ts\nsrc/b.test.ts\n');
		},
	});
	assert.equal(commands.length, 2);
	assert.ok(commands[1].includes('--filesOnly'));
	assert.equal(result.files, 2);
	assert.equal(result.tests, null);
	assert.match(result.warning, /could not count/);
});

test('kills the active process group when a collection times out', async () => {
	let killed;
	const result = await collectTarget(target, 0, {
		outputDir: '/missing',
		dynamic: false,
		timeoutSeconds: 0.01,
		repoRoot,
		spawnProcess: () => processStub(null),
		killProcess: (pid, signal) => {
			killed = [pid, signal];
		},
	});
	assert.deepEqual(killed, [-42, 'SIGKILL']);
	assert.match(result.error, /timed out/);
});

test('excludes nightly and non-PR suites from the PR CI aggregate', () => {
	const results = [
		{ ...target, files: 2, tests: 4 },
		{
			...target,
			lane: 'frontend-unit',
			scope: 'changed',
			package: 'frontend-pr',
			files: 3,
			tests: 6,
		},
		{
			...target,
			lane: 'frontend-nightly',
			scope: 'nightly only',
			package: 'frontend-nightly',
			files: 5,
			tests: 10,
		},
		{
			...target,
			lane: 'not-in-unit-ci',
			scope: 'not run',
			package: 'other',
			files: 7,
			tests: 14,
		},
	];
	const output = aggregateInventory(results, true);
	assert.deepEqual(output.ci, {
		packages: 2,
		targets: 2,
		files: 5,
		tests: 10,
		missingCaseCounts: 0,
		errors: 0,
	});
	assert.equal(output.lanes.find((lane) => lane.lane === 'frontend-nightly').tests, 10);
});
