import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import type { ChaosOptions, EngineMode } from '../chaos/run';
import type { FaultKind } from '../chaos/schedule';

export const USAGE = `Usage: TEST_IMAGE_N8N=n8nio/n8n:<tag> pnpm chaos [--seed N] [--faults N] [--duration S]
       [--rate N] [--workers N | --engine in-process|remote] [--kinds kill,stop,freeze,delay,cut,hook]
       [--settle S] [--shrink] [--repeats N] [--min-failures N] [--budget S] [--out DIR]`;

const KINDS: FaultKind[] = ['kill', 'stop', 'freeze', 'delay', 'cut', 'hook'];

const ENGINES: Record<string, EngineMode> = { 'in-process': 'in-process', remote: 'container' };

export interface ChaosArgs extends ChaosOptions {
	shrink: boolean;
	repeats: number;
	minFailures: number;
	budgetMs: number;
	outDir: string;
	help: boolean;
}

const positive = (name: string, value: string) => {
	const n = Number(value);
	if (!Number.isFinite(n) || n <= 0)
		throw new Error(`--${name} must be a positive number\n${USAGE}`);
	return n;
};

const count = (name: string, value: string, min = 1) => {
	const n = Number(value);
	if (!Number.isInteger(n) || n < min)
		throw new Error(`--${name} must be an integer of ${min} or more\n${USAGE}`);
	return n;
};

const MAX_TIMER_MS = 2_147_483_647;

const timer = (name: string, ms: number) => {
	if (ms > MAX_TIMER_MS)
		throw new Error(
			`--${name} gives a delay over ${MAX_TIMER_MS} ms, which Node cannot wait\n${USAGE}`,
		);
	return ms;
};

export function parseChaosArgs(argv: string[], random = Math.random): ChaosArgs {
	const { values } = parseArgs({
		args: argv,
		options: {
			seed: { type: 'string' },
			faults: { type: 'string', default: '4' },
			duration: { type: 'string', default: '40' },
			rate: { type: 'string', default: '4' },
			workers: { type: 'string' },
			engine: { type: 'string' },
			kinds: { type: 'string', default: KINDS.join(',') },
			settle: { type: 'string' },
			shrink: { type: 'boolean', default: false },
			repeats: { type: 'string', default: '3' },
			'min-failures': { type: 'string', default: '2' },
			budget: { type: 'string', default: '3600' },
			out: { type: 'string', default: join(tmpdir(), 'test-rig-chaos') },
			help: { type: 'boolean', default: false },
		},
	});
	const kinds = values.kinds.split(',').filter(Boolean) as FaultKind[];
	const unknown = kinds.filter((kind) => !KINDS.includes(kind));
	if (unknown.length || kinds.length === 0)
		throw new Error(`unknown fault kind ${unknown.join(', ')}\n${USAGE}`);
	const repeats = count('repeats', values.repeats);
	const minFailures = count('min-failures', values['min-failures']);
	if (minFailures > repeats) throw new Error(`--min-failures cannot exceed --repeats\n${USAGE}`);
	const engine =
		values.engine !== undefined && Object.hasOwn(ENGINES, values.engine)
			? ENGINES[values.engine]
			: undefined;
	if (values.engine !== undefined && !engine)
		throw new Error(`--engine must be in-process or remote\n${USAGE}`);
	if (engine && values.workers !== undefined)
		throw new Error(`--engine runs a single main with no workers\n${USAGE}`);
	const perSecond = positive('rate', values.rate);
	timer('rate', 1000 / perSecond);
	return {
		seed:
			values.seed === undefined ? Math.floor(random() * 2 ** 31) : count('seed', values.seed, 0),
		faults: count('faults', values.faults),
		durationMs: timer('duration', positive('duration', values.duration) * 1000),
		perSecond,
		workers: engine ? 0 : count('workers', values.workers ?? '2'),
		engine,
		kinds,
		// The engine profile shortens the engine timers: a crashed running step is repaired after about 22 s.
		settleMs: positive('settle', values.settle ?? (engine ? '60' : '120')) * 1000,
		shrink: values.shrink,
		repeats,
		minFailures,
		budgetMs: positive('budget', values.budget) * 1000,
		outDir: values.out,
		help: values.help,
	};
}
