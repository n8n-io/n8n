#!/usr/bin/env node
/**
 * Runs the expression matrix on one or more builds of `@n8n/expression-runtime`.
 *
 * Usage: node run.mjs <outFile.jsonl> <vm|quickjs> <general|transfer> <label>=<buildDir>...
 *
 * Environment:
 *   ROUNDS    rounds for each case (default 5)
 *   PARALLEL  cases that run at the same time (default 2)
 *   ONLY      regular expression, keep the cases whose "<shape> <expr>" matches
 *
 * Each case runs in its own process. In each round, every build runs in turn,
 * so the builds of one case see the same machine load. The lowest median of
 * all rounds is kept. A case that fails in one round is written as failed.
 */

import { execFile } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CASE_SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), 'run-case.mjs');
const CASE_TIMEOUT_MS = 900_000;

const [outFile, engine, matrix, ...buildArgs] = process.argv.slice(2);
const rounds = Number(process.env.ROUNDS ?? 5);
const parallel = Number(process.env.PARALLEL ?? 2);
const isCount = (value) => Number.isInteger(value) && value >= 1;

if (
	!outFile ||
	!['vm', 'quickjs'].includes(engine) ||
	!['general', 'transfer'].includes(matrix) ||
	buildArgs.length === 0 ||
	!isCount(rounds) ||
	!isCount(parallel)
) {
	console.error(
		'Usage: node run.mjs <outFile.jsonl> <vm|quickjs> <general|transfer> <label>=<buildDir>...',
	);
	process.exit(1);
}

/** Two builds with one label would be written as one build. */
function hasRepeatedLabel(labelledBuilds) {
	return new Set(labelledBuilds.map((build) => build.label)).size !== labelledBuilds.length;
}

const only = process.env.ONLY ? new RegExp(process.env.ONLY) : undefined;

const builds = buildArgs.map((arg) => {
	const [label, ...dir] = arg.split('=');
	return { label, dir: resolve(dir.join('=')) };
});
if (hasRepeatedLabel(builds)) {
	console.error('Each build must have its own label.');
	process.exit(1);
}

/** Every valid "<shape> <expr>" pair of the matrix that passes the ONLY filter. */
async function listCases() {
	const { shapes, exprs, valid } = await import(`./cases-${matrix}.mjs`);
	const cases = [];
	for (const shape of Object.keys(shapes)) {
		for (const expr of Object.keys(exprs)) {
			const isValid = valid === undefined || valid(shape, expr);
			if (isValid && (only === undefined || only.test(`${shape} ${expr}`))) {
				cases.push({ shape, expr });
			}
		}
	}
	return cases;
}

/** Resolves to the measure of one case on one build. A dead process is a failed measure. */
function runCase(build, { shape, expr }) {
	const args = ['--expose-gc', '--max-semi-space-size=256', CASE_SCRIPT];
	args.push(build.label, build.dir, engine, matrix, shape, expr);
	return new Promise((done) => {
		execFile(
			'node',
			args,
			{ encoding: 'utf8', timeout: CASE_TIMEOUT_MS },
			(error, stdout, stderr) => {
				const line = (stdout ?? '').trim().split('\n').pop();
				if (line?.startsWith('{')) {
					done(JSON.parse(line));
				} else {
					const message = `process: ${String(stderr || error)
						.replace(/\s+/g, ' ')
						.slice(0, 160)}`;
					done({ variant: build.label, engine, shape, expr, ok: false, error: message });
				}
			},
		);
	});
}

/**
 * Keeps the lowest median, and the highest one as `medMax` to show the spread.
 * A case that fails in one round stays failed, so an unstable build is visible.
 */
function keepBest(best, measure) {
	if (best === undefined || !measure.ok) {
		return measure;
	}
	if (!best.ok) {
		return best;
	}
	const medMax = Math.max(best.medMax ?? best.med, measure.med);
	return measure.med < best.med ? { ...measure, medMax } : { ...best, medMax };
}

const cases = await listCases();
if (cases.length === 0) {
	console.error('No case matches ONLY.');
	process.exit(1);
}
const out = createWriteStream(outFile, { flags: 'a' });
let next = 0;
let finished = 0;

async function work() {
	while (next < cases.length) {
		const oneCase = cases[next++];
		const best = new Map();
		for (let round = 0; round < rounds; round++) {
			for (const build of builds) {
				best.set(build.label, keepBest(best.get(build.label), await runCase(build, oneCase)));
			}
		}
		for (const build of builds) {
			out.write(`${JSON.stringify(best.get(build.label))}\n`);
		}
		finished++;
		if (finished % 50 === 0 || finished === cases.length) {
			console.error(`${finished}/${cases.length}`);
		}
	}
}

await Promise.all(Array.from({ length: parallel }, work));
out.end();
