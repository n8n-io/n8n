#!/usr/bin/env node
// Runs repro scenarios on their before and after images and prints a pass table.
// Usage: node run.mjs [scenario ...] [--runs N] [--variant before|after] [--out DIR]
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const playwrightDir = join(here, '..', '..', '..');
const manifest = JSON.parse(readFileSync(join(here, 'scenarios.json'), 'utf8'));

const args = process.argv.slice(2);
const option = (name, fallback) => {
	const index = args.indexOf(`--${name}`);
	if (index === -1) return fallback;
	const [value] = args.splice(index, 2).slice(1);
	return value;
};
const runs = Number(option('runs', '5'));
const onlyVariant = option('variant', undefined);
const out = option(
	'out',
	join(
		process.env.TMPDIR ?? '/tmp',
		'repro-results',
		new Date().toISOString().replace(/[:.]/g, '-'),
	),
);
const selected = args.length ? args : Object.keys(manifest);

for (const name of selected) {
	if (!manifest[name]) {
		console.error(`unknown scenario ${name}; known: ${Object.keys(manifest).join(', ')}`);
		process.exit(2);
	}
}

const runnersImage = (image) => image.replace(/\/n8n:/, '/runners:');

function ensureImage(image) {
	if (spawnSync('docker', ['image', 'inspect', image], { stdio: 'ignore' }).status === 0)
		return true;
	if (image.includes(':repro-')) {
		console.error(`missing local build ${image}; build it as the README describes`);
		return false;
	}
	console.log(`pulling ${image}`);
	return spawnSync('docker', ['pull', '-q', image], { stdio: 'inherit' }).status === 0;
}

mkdirSync(out, { recursive: true });
const rows = [];

for (const name of selected) {
	const scenario = manifest[name];
	for (const variant of ['before', 'after']) {
		if (onlyVariant && variant !== onlyVariant) continue;
		const image = scenario[variant];
		if (!image) {
			rows.push({ name, variant, image: '-', note: 'no image' });
			continue;
		}
		if (!ensureImage(image) || !ensureImage(runnersImage(image))) {
			rows.push({ name, variant, image, note: 'image missing' });
			continue;
		}
		const results = join(out, `${name}.${variant}.jsonl`);
		console.log(`\n== ${name} ${variant} (${image}) x${runs}`);
		spawnSync(
			'npx',
			[
				'playwright',
				'test',
				'--project=repro:infrastructure',
				'--reporter=line',
				`--repeat-each=${runs}`,
				join('tests', 'infrastructure', 'repro', scenario.spec),
			],
			{
				cwd: playwrightDir,
				stdio: 'inherit',
				env: {
					...process.env,
					TEST_IMAGE_N8N: image,
					REPRO_VARIANT: variant,
					REPRO_RESULTS_FILE: results,
				},
			},
		);
		const lines = existsSync(results)
			? readFileSync(results, 'utf8')
					.split('\n')
					.filter(Boolean)
					.map((l) => JSON.parse(l))
			: [];
		rows.push({
			name,
			variant,
			image,
			passed: lines.filter((l) => l.passed).length,
			total: lines.length,
		});
	}
}

console.log(`\nResults in ${out}\n`);
console.log('scenario | variant | image | passed');
for (const row of rows) {
	console.log(
		`${row.name} | ${row.variant} | ${row.image} | ${row.note ?? `${row.passed}/${row.total}`}`,
	);
}
const failed = rows.some((r) => (r.note && r.note !== 'no image') || (!r.note && r.passed !== runs));
process.exit(failed ? 1 : 0);
