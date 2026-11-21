import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { parseHookLine, preloadNodeOptions } from './control';

const SERVICE = `
class Service {
	async work(input) { return { doubled: input.value * 2 }; }
}
module.exports = { Service };
`;

const FILE = 'fake-pkg/dist/service.js';
const service = { file: FILE, target: 'Service.prototype' };

interface Run {
	lines: string[];
	results: Array<Record<string, unknown>>;
}

let root: string;
let controlDir: string;
let servicePath: string;
const children: ChildProcessWithoutNullStreams[] = [];

beforeEach(() => {
	root = mkdtempSync(join(tmpdir(), 'test-rig-preload-'));
	controlDir = join(root, 'control');
	servicePath = join(root, 'node_modules', FILE);
	mkdirSync(join(servicePath, '..'), { recursive: true });
	writeFileSync(servicePath, SERVICE);
});

afterEach(() => {
	for (const child of children.splice(0)) child.kill('SIGKILL');
	rmSync(root, { recursive: true, force: true });
});

function start(hooks: unknown[], body: string) {
	const script = join(root, 'script.js');
	writeFileSync(
		script,
		`const { Service } = require(${JSON.stringify(servicePath)});
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
			TEST_RIG_HOOK_MAX_PAUSE_MS: '5000',
		},
	});
	children.push(child);
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
	await new Promise((resolve) => child.on('close', resolve));
	const results = lines
		.filter((line) => line.startsWith('RESULT '))
		.map((line) => JSON.parse(line.slice(7)) as Record<string, unknown>);
	return { lines, results };
}

const run = async (hooks: unknown[], body: string) => await finish(start(hooks, body));

const releaseOnHit = (point: string) => (line: string) => {
	if (parseHookLine(line)?.event === 'hit')
		writeFileSync(join(controlDir, `${point}.release`), '1');
};

const events = (lines: string[], event: string) =>
	lines.map(parseHookLine).filter((line) => line?.event === event);

const result = (r: Run, name: string) => r.results.find((entry) => entry.name === name)?.value;

const arm = (point: string) => {
	mkdirSync(controlDir, { recursive: true });
	writeFileSync(join(controlDir, `${point}.arm`), '1');
};

const twoCalls = `await settle('first', () => s.work({ value: 1 }));
	await settle('second', () => s.work({ value: 2 }));`;

describe('preload', () => {
	it('pauses an armed call until release and consumes the arm once', async () => {
		arm('work');
		const r = await finish(
			start(
				[
					{
						...service,
						point: 'work',
						method: 'work',
						detail: { value: 'args.0.value' },
					},
				],
				twoCalls,
			),
			releaseOnHit('work'),
		);
		expect(events(r.lines, 'hit').map((e) => e?.detail)).toEqual([{ value: 1 }]);
		expect(events(r.lines, 'release')).toHaveLength(1);
		expect(result(r, 'first')).toEqual({ doubled: 2 });
		expect(result(r, 'second')).toEqual({ doubled: 4 });
		expect(existsSync(join(controlDir, 'work.arm'))).toBe(false);
	});

	it('keeps the arm when once is false', async () => {
		arm('work');
		const r = await finish(
			start([{ ...service, point: 'work', method: 'work', once: false }], twoCalls),
			releaseOnHit('work'),
		);
		expect(events(r.lines, 'hit')).toHaveLength(2);
		expect(existsSync(join(controlDir, 'work.arm'))).toBe(true);
	});

	it('fires only where a truthy condition holds', async () => {
		arm('work');
		const r = await finish(
			start(
				[
					{
						...service,
						point: 'work',
						method: 'work',
						where: [{ path: 'args.0.big', truthy: true }],
						detail: { value: 'args.0.value' },
					},
				],
				`await settle('small', () => s.work({ value: 1 }));
				await settle('big', () => s.work({ value: 2, big: true }));`,
			),
			releaseOnHit('work'),
		);
		expect(events(r.lines, 'hit').map((e) => e?.detail)).toEqual([{ value: 2 }]);
	});

	it('observes every matching call before it runs without pausing', async () => {
		const r = await run(
			[
				{
					...service,
					point: 'seen',
					method: 'work',
					kind: 'observe',
					where: [{ path: 'args.0.value', equals: 2 }],
					detail: { value: 'args.0.value' },
				},
			],
			`${twoCalls}
			await settle('third', () => s.work({ value: 2 }));`,
		);
		expect(events(r.lines, 'hit').map((e) => e?.detail)).toEqual([{ value: 2 }, { value: 2 }]);
		expect(events(r.lines, 'release')).toEqual([]);
		expect(result(r, 'third')).toEqual({ doubled: 4 });
	});

	it('observes a call after it resolves and exposes its result', async () => {
		const r = await run(
			[
				{
					...service,
					point: 'done',
					method: 'work',
					kind: 'observe',
					phase: 'after',
					where: [{ path: 'result.doubled', equals: 2 }],
					detail: { out: 'result.doubled' },
				},
			],
			twoCalls,
		);
		expect(events(r.lines, 'hit').map((e) => e?.detail)).toEqual([{ out: 2 }]);
	});
});
