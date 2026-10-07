// Runs scenarios on their before and after images and prints a pass table.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

import type { Manifest } from './manifest';
import { loadManifest, MANIFEST_PATH, PLAYWRIGHT_DIR, runnersImage, SPEC_DIR } from './manifest';
import type { Variant } from '../scenario';

const USAGE = `Usage: pnpm scenarios [scenario ...] [--runs N] [--variant before|after]
       [--after-image IMAGE] [--out DIR] [--manifest FILE] [--playwright-dir DIR]`;

export interface RunOptions {
	scenarios: string[];
	runs: number;
	variants: Variant[];
	afterImage?: string;
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
			'after-image': { type: 'string' },
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
		afterImage: values['after-image'],
		out: values.out ?? join(tmpdir(), 'test-rig-results', now.toISOString().replace(/[:.]/g, '-')),
		manifest: values.manifest,
		playwrightDir: values['playwright-dir'],
	};
}

export interface Row {
	name: string;
	variant: Variant;
	image: string;
	passed?: number;
	total?: number;
	note?: 'no image' | 'image missing';
}

/** Image for one variant: `--after-image` replaces every after image that exists. */
export function imageFor(
	scenario: Manifest[string],
	variant: Variant,
	afterImage?: string,
): string | null {
	if (variant === 'after' && afterImage && scenario.after) return afterImage;
	return scenario[variant];
}

/** A run fails when an image is missing or a variant did not pass every time; a scenario with no image is skipped. */
export function runFailed(rows: Row[], runs: number): boolean {
	return rows.some((row) => row.note === 'image missing' || (!row.note && row.passed !== runs));
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
	if (image.includes(':repro-') || image.includes(':rig-') || image.endsWith(':local')) {
		console.error(`missing local build ${image}; build it as the README describes`);
		return false;
	}
	console.log(`pulling ${image}`);
	return spawnSync('docker', ['pull', '-q', image], { stdio: 'inherit' }).status === 0;
}

function readResults(file: string): Array<{ passed: boolean }> {
	if (!existsSync(file)) return [];
	return readFileSync(file, 'utf8')
		.split('\n')
		.filter(Boolean)
		.map((line) => JSON.parse(line) as { passed: boolean });
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
			const image = imageFor(scenario, variant, options.afterImage);
			if (!image) {
				rows.push({ name, variant, image: '-', note: 'no image' });
				continue;
			}
			if (!ensureImage(image) || !ensureImage(runnersImage(image))) {
				rows.push({ name, variant, image, note: 'image missing' });
				continue;
			}
			const results = join(options.out, `${name}.${variant}.jsonl`);
			console.log(`\n== ${name} ${variant} (${image}) x${options.runs}`);
			spawnSync(
				'npx',
				[
					'playwright',
					'test',
					'--project=test-rig',
					'--reporter=line',
					`--repeat-each=${options.runs}`,
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
						TEST_RIG_RESULTS_FILE: results,
					},
				},
			);
			const lines = readResults(results);
			rows.push({
				name,
				variant,
				image,
				passed: lines.filter((l) => l.passed).length,
				total: lines.length,
			});
		}
	}

	console.log(`\nResults in ${options.out}\n\n${formatTable(rows)}`);
	process.exit(runFailed(rows, options.runs) ? 1 : 0);
}

if (require.main === module) main();
