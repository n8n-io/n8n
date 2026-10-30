import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import type { FaultKind } from '../chaos/schedule';

export const USAGE = `Usage: TEST_IMAGE_N8N=n8nio/n8n:<tag> pnpm chaos [--seed N] [--faults N] [--duration S]
       [--rate N] [--workers N] [--kinds kill,stop,freeze,delay,cut,hook] [--settle S]
       [--shrink] [--repeats N] [--min-failures N] [--budget S] [--out DIR]`;

const KINDS: FaultKind[] = ['kill', 'stop', 'freeze', 'delay', 'cut', 'hook'];

export interface ChaosArgs {
	seed: number;
	faults: number;
	durationMs: number;
	perSecond: number;
	workers: number;
	kinds: FaultKind[];
	settleMs: number;
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

export function parseChaosArgs(argv: string[], random = Math.random): ChaosArgs {
	const { values } = parseArgs({
		args: argv,
		options: {
			seed: { type: 'string' },
			faults: { type: 'string', default: '4' },
			duration: { type: 'string', default: '40' },
			rate: { type: 'string', default: '4' },
			workers: { type: 'string', default: '2' },
			kinds: { type: 'string', default: KINDS.join(',') },
			settle: { type: 'string', default: '120' },
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
	const repeats = positive('repeats', values.repeats);
	const minFailures = positive('min-failures', values['min-failures']);
	if (minFailures > repeats) throw new Error(`--min-failures cannot exceed --repeats\n${USAGE}`);
	return {
		seed:
			values.seed === undefined
				? Math.floor(random() * 2 ** 31)
				: Math.trunc(positive('seed', values.seed)),
		faults: positive('faults', values.faults),
		durationMs: positive('duration', values.duration) * 1000,
		perSecond: positive('rate', values.rate),
		workers: positive('workers', values.workers),
		kinds,
		settleMs: positive('settle', values.settle) * 1000,
		shrink: values.shrink,
		repeats,
		minFailures,
		budgetMs: positive('budget', values.budget) * 1000,
		outDir: values.out,
		help: values.help,
	};
}
