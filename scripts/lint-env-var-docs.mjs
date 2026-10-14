#!/usr/bin/env node
// Lints the JSDoc on `@Env` config properties with the n8n-docs Vale rules.
// The docs site publishes these comments as the env var reference, so they
// must pass the same checks a docs PR gets. Declarations are extracted with
// the TypeScript compiler API, shared with the env vars manifest.
//
//   node scripts/lint-env-var-docs.mjs            # @Env declarations changed vs origin/master
//   node scripts/lint-env-var-docs.mjs --all      # every @Env in packages/
//   node scripts/lint-env-var-docs.mjs --refresh  # re-fetch the n8n-docs rules

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractEnvVars } from './env-vars-manifest.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, 'node_modules', '.cache', 'lint-env-var-docs');
const DOCS_REPO = 'https://github.com/n8n-io/n8n-docs.git';
// Pinned like other npx tools in scripts/; bump deliberately.
const VALE_NPM_VERSION = '3.24.0';
// Words the docs spell checker rejects but that are normal in operator-facing text.
const ACCEPT_WORDS = [
	'env',
	'config',
	'configs',
	'rollout',
	'eval',
	'dirs',
	'keepalive',
	'sqlite',
	'redis',
	'runtime',
	'uncached',
	'misconfigured',
	'lookups',
	'prepended',
	'errored',
	'sandboxing',
];

const args = new Set(process.argv.slice(2));
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();

// --- pick files -------------------------------------------------------------
const isSource = (f) =>
	f.endsWith('.ts') && !/\.(test|spec|d)\.ts$/.test(f) && !/\/(test|__tests__)\//.test(f);
const all = args.has('--all');
const base = all ? undefined : git('merge-base', 'origin/master', 'HEAD');
let files = all
	? git('grep', '-l', '@Env(', '--', 'packages').split('\n')
	: git('diff', '--name-only', base, '--', 'packages')
			.split('\n')
			.filter((f) => f && existsSync(join(ROOT, f)));
files = files.filter(isSource);

// New-side line ranges of the diff hunks, so only touched declarations get linted.
function changedRanges(file) {
	const diff = git('diff', '-U0', base, '--', file);
	return [...diff.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)].map(([, start, count]) => [
		Number(start),
		Number(start) + Math.max(Number(count ?? 1), 1) - 1,
	]);
}
const touches = (ranges, from, to) => ranges.some(([a, b]) => from <= b && to >= a);

// --- extract jsdoc ------------------------------------------------------------
const rows = [];
for (const file of files) {
	const source = readFileSync(join(ROOT, file), 'utf8');
	if (!source.includes('@Env(')) continue;
	const ranges = all ? undefined : changedRanges(file);
	for (const v of extractEnvVars(source, file, dirname(join(ROOT, file)))) {
		// A hunk touching any JSDoc line or the declaration itself lints the whole comment.
		if (ranges && !touches(ranges, v.docStart ?? v.line, v.line)) continue;
		rows.push({
			file,
			line: v.line,
			name: v.name,
			doc: (v.description ?? '').replace(/\s+/g, ' ').trim(),
		});
	}
}
if (rows.length === 0) {
	console.log('No @Env declarations to lint.');
	process.exit(0);
}

// --- fetch n8n-docs rules ----------------------------------------------------
// Re-cloned once a week so the local check tracks the rules the docs CI runs.
const styles = join(CACHE, 'n8n-docs');
const stamp = join(CACHE, 'fetched-at');
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const fetchedAt = existsSync(stamp) ? Number(readFileSync(stamp, 'utf8')) : 0;
const haveRules = existsSync(join(styles, 'styles'));
if (args.has('--refresh') || !haveRules || Date.now() - fetchedAt > TTL_MS) {
	const fresh = `${styles}.tmp`;
	const previous = `${styles}.old`;
	mkdirSync(CACHE, { recursive: true });
	rmSync(fresh, { recursive: true, force: true });
	rmSync(previous, { recursive: true, force: true });
	try {
		execFileSync(
			'git',
			['clone', '-q', '--depth', '1', '--filter=blob:none', '--sparse', DOCS_REPO, fresh],
			{ stdio: ['ignore', 'ignore', 'pipe'] },
		);
		execFileSync('git', ['sparse-checkout', 'set', 'styles'], { cwd: fresh, stdio: 'ignore' });
		// Promote only once the clone is complete, keeping the old copy until then.
		if (haveRules) renameSync(styles, previous);
		renameSync(fresh, styles);
		rmSync(previous, { recursive: true, force: true });
		writeFileSync(stamp, String(Date.now()));
	} catch (error) {
		rmSync(fresh, { recursive: true, force: true });
		if (!existsSync(styles) && existsSync(previous)) renameSync(previous, styles);
		else rmSync(previous, { recursive: true, force: true });
		if (!haveRules) throw error;
		console.warn(`Could not refresh the n8n-docs rules, using the cached copy: ${error.message}`);
	}
}
// Own config: same rule set as n8n-docs, plus an accept list for operator vocabulary.
const vocab = join(styles, 'styles', 'config', 'vocabularies', 'env-var-docs');
mkdirSync(vocab, { recursive: true });
writeFileSync(join(vocab, 'accept.txt'), ACCEPT_WORDS.join('\n') + '\n');
const docsIni = readFileSync(join(styles, '.vale.ini'), 'utf8');
const basedOn =
	/BasedOnStyles = (.*)/.exec(docsIni)?.[1] ?? 'from-write-good, n8n-styles, from-microsoft, Vale';
writeFileSync(
	join(CACHE, '.vale.ini'),
	`StylesPath = n8n-docs/styles\nMinAlertLevel = warning\nVocab = default, env-var-docs\n[*.md]\nBasedOnStyles = ${basedOn}\nVale.Terms = NO\n`,
);

// --- run vale -----------------------------------------------------------------
const mdPath = join(CACHE, 'env-vars.md');
writeFileSync(mdPath, rows.map((r) => (r.doc || 'MISSING JSDOC') + '\n').join('\n'));
const vale = spawnSync(
	'npx',
	[
		'-y',
		`@vvago/vale@${VALE_NPM_VERSION}`,
		'--config',
		join(CACHE, '.vale.ini'),
		'--output=line',
		mdPath,
	],
	{ encoding: 'utf8' },
);
if (vale.error) throw vale.error;
// Vale exits 1 when it found alerts and 2 on its own errors; anything else is npx failing.
const valeFailed = (vale.status === 1 && !vale.stdout.trim()) || ![0, 1].includes(vale.status);
if (valeFailed) {
	console.error(`Vale did not run (exit ${vale.status}):\n${vale.stderr}${vale.stdout}`);
	process.exit(2);
}

// Each row is one paragraph: markdown line 2n+1 -> row n.
const alerts = [];
for (const r of rows) if (!r.doc) alerts.push(`${r.file}:${r.line} ${r.name}: missing JSDoc`);
for (const out of vale.stdout.split('\n').filter(Boolean)) {
	const [, mdLine, , rule, ...rest] = out.split(':');
	const row = rows[Math.floor((Number(mdLine) - 1) / 2)];
	if (!row) {
		console.error(`Unexpected Vale output: ${out}`);
		process.exit(2);
	}
	alerts.push(`${row.file}:${row.line} ${row.name}: ${rule.trim()} ${rest.join(':').trim()}`);
}
for (const a of alerts.sort()) console.log(a);
console.log(`\n${rows.length} env vars checked, ${alerts.length} alerts.`);
process.exit(alerts.length ? 1 : 0);
