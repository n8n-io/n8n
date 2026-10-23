import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { parseHookLine, preloadNodeOptions } from './control';
import { INVALID_SPECS, VALID_SPECS } from './spec-fixtures';

const SERVICE = `
class Service {
	async work(input) { return { doubled: input.value * 2 }; }
	syncWork(input) { return input.value + 1; }
	async outer(input) { return await this.work(input); }
	cancellable() {
		const promise = Promise.resolve('done');
		promise.cancel = () => 'cancelled';
		return promise;
	}
}
let calls = 0;
const counted = { async count() { calls += 1; return calls; } };
module.exports = { Service, counted };
`;

const FILE = 'fake-pkg/dist/service.js';
const service = { file: FILE, target: 'Service.prototype' };

interface Run {
	lines: string[];
	results: Array<Record<string, unknown>>;
	code: number | null;
}

let root: string;
let controlDir: string;
let servicePath: string;

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'test-rig-preload-'));
	controlDir = join(root, 'control');
	servicePath = join(root, 'node_modules', FILE);
	mkdirSync(join(servicePath, '..'), { recursive: true });
	writeFileSync(servicePath, SERVICE);
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

function start(hooks: unknown[], body: string, env: Record<string, string> = {}) {
	const script = join(root, 'script.js');
	writeFileSync(
		script,
		`const { Service, counted } = require(${JSON.stringify(servicePath)});
const s = new Service();
const report = (name, value) => process.stdout.write('RESULT ' + JSON.stringify({ name, value }) + '\\n');
const settle = async (name, fn) => {
	try { report(name, await fn()); } catch (error) { report(name, { error: error.message }); }
};
(async () => { ${body} })();`,
	);
	const child = spawn(process.execPath, [script], {
		env: {
			PATH: process.env.PATH,
			NODE_OPTIONS: preloadNodeOptions(),
			TEST_RIG_HOOKS: JSON.stringify(hooks),
			TEST_RIG_HOOK_DIR: controlDir,
			TEST_RIG_HOOK_POLL_MS: '5',
			...env,
		},
	});
	return child;
}

async function finish(
	child: ChildProcessWithoutNullStreams,
	onLine?: (line: string) => void,
): Promise<Run> {
	const lines: string[] = [];
	let buffer = '';
	child.stdout.on('data', (chunk: Buffer) => {
		buffer += chunk.toString();
		const parts = buffer.split('\n');
		buffer = parts.pop() ?? '';
		for (const line of parts) {
			lines.push(line);
			onLine?.(line);
		}
	});
	const code = await new Promise<number | null>((resolve) => child.on('close', resolve));
	const results = lines
		.filter((line) => line.startsWith('RESULT '))
		.map((line) => JSON.parse(line.slice(7)) as Record<string, unknown>);
	return { lines, results, code };
}

const run = async (hooks: unknown[], body: string, env?: Record<string, string>) =>
	await finish(start(hooks, body, env));

const events = (lines: string[], event: string) =>
	lines.map(parseHookLine).filter((line) => line?.event === event);

const result = (r: Run, name: string) => r.results.find((entry) => entry.name === name)?.value;

const arm = (point: string) => {
	mkdirSync(controlDir, { recursive: true });
	writeFileSync(join(controlDir, `${point}.arm`), '1');
};

describe('preload', () => {
	it('declares and installs hooks, and reports a missing method', async () => {
		const r = await run(
			[
				{ ...service, point: 'present', method: 'work', kind: 'observe' },
				{ ...service, point: 'absent', method: 'nope', kind: 'observe' },
			],
			'',
		);
		expect(events(r.lines, 'declared')[0]?.point).toBe('present,absent');
		expect(events(r.lines, 'installed').map((e) => e?.point)).toEqual(['present']);
		expect(events(r.lines, 'missing').map((e) => e?.point)).toEqual(['absent']);
	});

	it('accepts every valid fixture spec', async () => {
		const r = await run(VALID_SPECS, '');
		expect(events(r.lines, 'invalid')).toEqual([]);
	});

	it('rejects every invalid fixture spec with the field name', async () => {
		const r = await run(
			INVALID_SPECS.map((entry) => entry.spec),
			'',
		);
		const fields = events(r.lines, 'invalid').map((e) => String(e?.detail.reason).split(':')[0]);
		expect(fields).toEqual(INVALID_SPECS.map((entry) => entry.field));
	});

	it('rejects a duplicate point and malformed JSON', async () => {
		const duplicate = await run([VALID_SPECS[0], VALID_SPECS[0]], '');
		expect(events(duplicate.lines, 'invalid')[0]?.detail).toEqual({ reason: 'point: duplicate' });
		const malformed = await finish(
			spawn(process.execPath, ['-e', ''], {
				env: {
					PATH: process.env.PATH,
					NODE_OPTIONS: preloadNodeOptions(),
					TEST_RIG_HOOKS: '{',
					TEST_RIG_HOOK_DIR: controlDir,
				},
			}),
		);
		expect(events(malformed.lines, 'invalid')[0]?.point).toBe('TEST_RIG_HOOKS');
	});

	it('observes a call before it runs, with detail and where filters', async () => {
		const r = await run(
			[
				{
					...service,
					point: 'seen',
					method: 'work',
					kind: 'observe',
					where: [{ path: 'args.0.name', equals: 'match' }],
					detail: { value: 'args.0.value', name: 'args.0.name' },
				},
			],
			`await settle('a', () => s.work({ name: 'match', value: 2 }));
			await settle('b', () => s.work({ name: 'other', value: 3 }));`,
		);
		expect(events(r.lines, 'hit').map((e) => e?.detail)).toEqual([{ value: 2, name: 'match' }]);
		expect(result(r, 'a')).toEqual({ doubled: 4 });
		expect(result(r, 'b')).toEqual({ doubled: 6 });
	});

	it('observes the result after the call resolves', async () => {
		const r = await run(
			[
				{
					...service,
					point: 'done',
					method: 'work',
					kind: 'observe',
					phase: 'after',
					detail: { out: 'result.doubled' },
				},
			],
			"await settle('a', () => s.work({ value: 5 }));",
		);
		expect(events(r.lines, 'hit')[0]?.detail).toEqual({ out: 10 });
	});

	it('does not pause until armed', async () => {
		const r = await run(
			[{ ...service, point: 'gate', method: 'work' }],
			"await settle('a', () => s.work({ value: 1 }));",
		);
		expect(events(r.lines, 'hit')).toEqual([]);
		expect(result(r, 'a')).toEqual({ doubled: 2 });
	});

	it('pauses an armed call until released, once per arm', async () => {
		arm('gate');
		const child = start(
			[{ ...service, point: 'gate', method: 'work', detail: { value: 'args.0.value' } }],
			`await settle('first', () => s.work({ value: 1 }));
			await settle('second', () => s.work({ value: 2 }));`,
		);
		const r = await finish(child, (line) => {
			if (parseHookLine(line)?.event === 'hit')
				writeFileSync(join(controlDir, 'gate.release'), '1');
		});
		expect(events(r.lines, 'hit').map((e) => e?.detail)).toEqual([{ value: 1 }]);
		expect(events(r.lines, 'release')).toHaveLength(1);
		expect(r.results.map((entry) => entry.name)).toEqual(['first', 'second']);
		expect(existsSync(join(controlDir, 'gate.arm'))).toBe(false);
		expect(existsSync(join(controlDir, 'gate.hit'))).toBe(true);
	});

	it('pauses after the call and exposes its result to where', async () => {
		arm('after');
		const child = start(
			[
				{
					...service,
					point: 'after',
					method: 'work',
					phase: 'after',
					where: [{ path: 'result.doubled', equals: 4 }],
					detail: { out: 'result.doubled' },
				},
			],
			`await settle('skip', () => s.work({ value: 1 }));
			await settle('held', () => s.work({ value: 2 }));`,
		);
		const r = await finish(child, (line) => {
			if (parseHookLine(line)?.event === 'hit')
				writeFileSync(join(controlDir, 'after.release'), '1');
		});
		expect(events(r.lines, 'hit').map((e) => e?.detail)).toEqual([{ out: 4 }]);
		expect(result(r, 'held')).toEqual({ doubled: 4 });
	});

	it('gives up a pause after the maximum and lets the call through', async () => {
		arm('stuck');
		const r = await run(
			[{ ...service, point: 'stuck', method: 'work' }],
			"await settle('a', () => s.work({ value: 1 }));",
			{
				TEST_RIG_HOOK_MAX_PAUSE_MS: '50',
			},
		);
		expect(events(r.lines, 'timeout')[0]?.detail).toEqual({ afterMs: 50 });
		expect(result(r, 'a')).toEqual({ doubled: 2 });
	});

	it('fails an async call before it runs, or a sync call by throwing', async () => {
		const r = await run(
			[
				{
					...service,
					point: 'reject',
					method: 'work',
					kind: 'fault',
					phase: 'before',
					arm: 'always',
					message: 'no',
				},
				{
					...service,
					point: 'throw',
					method: 'syncWork',
					kind: 'fault',
					phase: 'before',
					async: false,
					arm: 'always',
				},
			],
			`await settle('async', () => s.work({ value: 1 }));
			try { s.syncWork({ value: 1 }); report('sync', 'returned'); } catch (e) { report('sync', { thrown: e.message }); }`,
		);
		expect(result(r, 'async')).toEqual({ error: 'no' });
		expect(result(r, 'sync')).toEqual({ thrown: 'test-rig fault at throw' });
	});

	it('fails a call after it runs and keeps preserved methods', async () => {
		const r = await run(
			[
				{
					...service,
					point: 'late',
					method: 'cancellable',
					kind: 'fault',
					arm: 'always',
					preserve: ['cancel'],
				},
			],
			`const p = s.cancellable();
			report('cancel', p.cancel());
			await settle('outcome', () => p);`,
		);
		expect(result(r, 'cancel')).toBe('cancelled');
		expect(result(r, 'outcome')).toEqual({ error: 'test-rig fault at late' });
	});

	it('drops every call while armed and returns the given value', async () => {
		const r = await run(
			[
				{
					file: FILE,
					target: 'counted',
					method: 'count',
					point: 'skip',
					kind: 'drop',
					arm: 'always',
					returns: -1,
				},
			],
			`await settle('a', () => counted.count());
			await settle('b', () => counted.count());`,
		);
		expect([result(r, 'a'), result(r, 'b')]).toEqual([-1, -1]);
		expect(events(r.lines, 'hit')).toHaveLength(2);
	});

	it('fires a scoped hook only inside the scope, once per scope call', async () => {
		const r = await run(
			[
				{
					...service,
					point: 'inside',
					method: 'work',
					kind: 'fault',
					phase: 'before',
					arm: 'always',
					once: false,
					scope: { ...service, method: 'outer' },
				},
			],
			`await settle('direct', () => s.work({ value: 1 }));
			await settle('scoped', () => s.outer({ value: 1 }));`,
		);
		expect(result(r, 'direct')).toEqual({ doubled: 2 });
		expect(result(r, 'scoped')).toEqual({ error: 'test-rig fault at inside' });
		expect(events(r.lines, 'scope-installed')[0]?.point).toBe('Service.prototype.outer');
	});
});
