#!/usr/bin/env node
/**
 * Records what ESLint actually resolves for every file in `samples.json`, so a
 * config refactor can be proved behaviour-neutral instead of eyeballed.
 *
 * Run it once before the change and once after, then compare with `diff.mjs`.
 * `@n8n/eslint-config` is consumed from its built dist, so build it first:
 *   pnpm turbo run build --filter=@n8n/eslint-config
 *
 * Severities are normalised so `warn` reads as `off`: every lint script runs
 * with `--quiet`, so a warning is not enforced and a promote/demote between the
 * two is not a behaviour change. Options are compared only where the rule is on.
 *
 * `CI`/`NODE_ENV` are pinned because some configs branch on them; without that
 * the snapshot would describe a developer laptop rather than the CI gate.
 *
 * ponytail: `--print-config` is one process per file (~300), which takes a few
 * minutes even pooled. It is the only output ESLint offers that reflects the
 * whole cascade, including plugin-injected blocks.
 */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

const outIndex = process.argv.indexOf('--out');
if (outIndex === -1) {
	console.error('usage: snapshot.mjs --out <file.json> [--only <pkgDir>]');
	process.exit(2);
}
const outFile = process.argv[outIndex + 1];
const onlyIndex = process.argv.indexOf('--only');
const only = onlyIndex === -1 ? undefined : process.argv[onlyIndex + 1];

const samples = JSON.parse(readFileSync(join(here, 'samples.json'), 'utf8'));
const env = { ...process.env, CI: 'true', NODE_ENV: 'production', FORCE_COLOR: '0' };

/** `warn` collapses into `off`; options are irrelevant once a rule is off. */
function normalise(entry) {
	const value = Array.isArray(entry) ? entry : [entry];
	const raw = value[0];
	const severity = raw === 'error' || raw === 2 ? 2 : raw === 'warn' || raw === 1 ? 0 : 0;
	return severity === 0 ? [0] : [2, ...value.slice(1)];
}

function printConfig(pkgDir, file) {
	return new Promise((resolve) => {
		const child = spawn('pnpm', ['exec', 'eslint', '--print-config', file], {
			cwd: join(root, pkgDir),
			env,
		});
		let stdout = '';
		let stderr = '';
		child.stdout.on('data', (c) => (stdout += c));
		child.stderr.on('data', (c) => (stderr += c));
		child.on('close', (code) => {
			const start = stdout.indexOf('{');
			// ESLint prints `undefined` for a file its config ignores. Anything
			// else without a config is a failure, and must not be recorded as an
			// ignore: a broken install would otherwise read as "nothing to lint"
			// and a whole tree could silently drop out of the comparison.
			if (start === -1) {
				const ignored = code === 0 && stdout.trim() === 'undefined';
				if (ignored) return resolve({ ignored: true });
				return resolve({
					error: (stderr || stdout).trim().split('\n').slice(0, 3).join(' ').slice(0, 300),
				});
			}
			let parsed;
			try {
				parsed = JSON.parse(stdout.slice(start));
			} catch (e) {
				return resolve({ error: `unparseable --print-config output: ${String(e).slice(0, 120)}` });
			}
			const rules = {};
			for (const [id, entry] of Object.entries(parsed.rules ?? {})) {
				const n = normalise(entry);
				if (n[0] !== 0) rules[id] = n;
			}
			const lang = parsed.languageOptions ?? {};
			resolve({
				rules,
				plugins: Object.keys(parsed.plugins ?? {}).sort(),
				settings: parsed.settings ?? {},
				languageOptions: {
					ecmaVersion: lang.ecmaVersion,
					sourceType: lang.sourceType,
					globals: Object.keys(lang.globals ?? {}).sort(),
					parserOptions: lang.parserOptions ?? {},
				},
			});
		});
	});
}

const jobs = [];
for (const [pkgDir, files] of Object.entries(samples)) {
	if (only && pkgDir !== only) continue;
	for (const file of files) jobs.push([pkgDir, file]);
}

const result = {};
let done = 0;
const POOL = 6;

await Promise.all(
	Array.from({ length: POOL }, async () => {
		for (;;) {
			const job = jobs.shift();
			if (!job) return;
			const [pkgDir, file] = job;
			result[`${pkgDir}|${file}`] = await printConfig(pkgDir, file);
			done++;
			if (done % 25 === 0) process.stderr.write(`  ${done} files\n`);
		}
	}),
);

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(result, null, '\t') + '\n');
const ignored = Object.values(result).filter((r) => r.ignored).length;
const failed = Object.entries(result).filter(([, r]) => r.error);
console.log(`${outFile}: ${Object.keys(result).length} entries, ${ignored} ignored`);
if (failed.length) {
	console.error(`\n${failed.length} file(s) could not be resolved — the snapshot is not usable:`);
	for (const [key, r] of failed.slice(0, 10)) console.error(`  ${key}\n    ${r.error}`);
	if (failed.length > 10) console.error(`  ... and ${failed.length - 10} more`);
	console.error('\nUsually a stale install. Run `pnpm install` on this branch and retry.');
	process.exit(1);
}
