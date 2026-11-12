import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { z } from 'zod';

import { loadManifest, MANIFEST_PATH, PLAYWRIGHT_DIR, runnersImage, SPEC_DIR } from './manifest';
import type { Variant } from '../scenario';

const USAGE = `Usage: pnpm scenarios [scenario ...] [--runs N] [--variant before|after]
       [--out DIR] [--manifest FILE] [--playwright-dir DIR]`;

export interface RunOptions {
	scenarios: string[];
	runs: number;
	variants: Variant[];
	out: string;
	manifest: string;
	playwrightDir: string;
}

export function parseRunArgs(argv: string[], now = new Date()): RunOptions {
	const { values, positionals } = parseArgs({
		args: argv,
		allowPositionals: true,
		options: {
			runs: { type: 'string', default: '5' },
			variant: { type: 'string' },
			out: { type: 'string' },
			manifest: { type: 'string', default: MANIFEST_PATH },
			'playwright-dir': { type: 'string', default: PLAYWRIGHT_DIR },
		},
	});
	const runs = Number(values.runs);
	if (!Number.isInteger(runs) || runs < 1)
		throw new Error(`--runs must be a positive integer\n${USAGE}`);
	if (values.variant !== undefined && values.variant !== 'before' && values.variant !== 'after') {
		throw new Error(`--variant must be before or after\n${USAGE}`);
	}
	return {
		scenarios: positionals,
		runs,
		variants: values.variant ? [values.variant] : ['before', 'after'],
		out: resolve(
			values.out ?? join(tmpdir(), 'test-rig-results', now.toISOString().replace(/[:.]/g, '-')),
		),
		manifest: values.manifest,
		playwrightDir: values['playwright-dir'],
	};
}

export interface Row {
	name: string;
	variant: Variant;
	image: string;
	passed: number;
	total: number;
	note?: 'image missing';
}

export function runFailed(rows: Row[]): boolean {
	return rows.some((row) => row.note !== undefined || row.passed !== row.total);
}

export function formatTable(rows: Row[]): string {
	return [
		'scenario | variant | image | passed',
		...rows.map(
			(r) => `${r.name} | ${r.variant} | ${r.image} | ${r.note ?? `${r.passed}/${r.total}`}`,
		),
	].join('\n');
}

function ensureImage(image: string): boolean {
	if (spawnSync('docker', ['image', 'inspect', image], { stdio: 'ignore' }).status === 0)
		return true;
	console.log(`pulling ${image}`);
	return spawnSync('docker', ['pull', '-q', image], { stdio: 'inherit' }).status === 0;
}

const reportSchema = z.object({ stats: z.object({ expected: z.number() }) });

function passedInReport(file: string): number {
	if (!existsSync(file)) return 0;
	try {
		const report = reportSchema.safeParse(JSON.parse(readFileSync(file, 'utf8')));
		return report.success ? report.data.stats.expected : 0;
	} catch {
		return 0;
	}
}

function main() {
	const options = parseRunArgs(process.argv.slice(2));
	const manifest = loadManifest(options.manifest, join(options.playwrightDir, SPEC_DIR));
	const selected = options.scenarios.length ? options.scenarios : Object.keys(manifest);
	const unknown = selected.filter((name) => !manifest[name]);
	if (unknown.length) {
		console.error(
			`unknown scenario ${unknown.join(', ')}; known: ${Object.keys(manifest).join(', ')}`,
		);
		process.exit(2);
	}

	mkdirSync(options.out, { recursive: true });
	const rows: Row[] = [];
	for (const name of selected) {
		const scenario = manifest[name];
		for (const variant of options.variants) {
			const image = scenario[variant];
			const total = options.runs;
			if (!ensureImage(image) || !ensureImage(runnersImage(image))) {
				rows.push({ name, variant, image, passed: 0, total, note: 'image missing' });
				continue;
			}
			const report = join(options.out, `${name}.${variant}.json`);
			rmSync(report, { force: true });
			console.log(`\n== ${name} ${variant} (${image}) x${total}`);
			spawnSync(
				'npx',
				[
					'playwright',
					'test',
					'--project=test-rig',
					'--reporter=line,json',
					`--repeat-each=${total}`,
					`--output=${join(options.out, `${name}.${variant}`)}`,
					join(SPEC_DIR, scenario.spec),
				],
				{
					cwd: options.playwrightDir,
					stdio: 'inherit',
					env: {
						...process.env,
						...scenario.env,
						TEST_IMAGE_N8N: image,
						TEST_RIG_VARIANT: variant,
						PLAYWRIGHT_JSON_OUTPUT_NAME: report,
					},
				},
			);
			rows.push({ name, variant, image, passed: passedInReport(report), total });
		}
	}

	console.log(`\nResults in ${options.out}\n\n${formatTable(rows)}`);
	process.exit(runFailed(rows) ? 1 : 0);
}

if (require.main === module) main();
