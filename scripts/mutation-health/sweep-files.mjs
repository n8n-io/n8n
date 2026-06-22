#!/usr/bin/env node
/**
 * Baseline-sweep helper. Two modes, both pure enumeration over the working tree:
 *
 *   --matrix                Emit a GitHub Actions matrix (one entry per shard)
 *                           covering every mutation-reachable vitest package.
 *                           Prints `matrix=<json>` for $GITHUB_OUTPUT.
 *
 *   --slice --package-dir D --shard i/n
 *                           Print the comma-joined, package-relative file list
 *                           for shard i-of-n of package D. Fed straight to
 *                           `mutate.mjs --glob`.
 *
 * The matrix carries only small identifiers (package, dir, shard i/n); each job
 * re-derives its own file slice with --slice at run time. That keeps the matrix
 * well under GitHub's 256-entry / size limits even at ~8.5k files.
 *
 * Reachability == the package's `test` script runs vitest (Stryker here uses the
 * vitest-runner). Jest packages (packages/cli, …) are excluded by construction —
 * they need a jest mutation runner first. A small DENY list drops known-bad
 * dry-run packages (e.g. @n8n/expression-runtime: isolated-vm).
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Files per shard. One Stryker dry-run is amortised across a shard, so bigger =
// fewer dry-runs but coarser parallelism. ~50 keeps each leg to a few minutes.
const SHARD_SIZE = Number(process.env.SWEEP_SHARD_SIZE ?? 50);
// GitHub Actions hard-caps a matrix at 256 entries. If the file universe would
// exceed that at SHARD_SIZE, we grow the shard size (and log it — never a silent
// cap) so the whole tree is still covered in one run.
const MAX_MATRIX = 256;

// Packages whose code does not live under src/ — give their real code roots.
const CODE_ROOTS = {
	'n8n-nodes-base': ['nodes', 'credentials'],
	'@n8n/n8n-nodes-langchain': ['nodes', 'credentials', 'utils'],
};
// vitest packages Stryker can't dry-run yet (documented blockers).
const DENY = new Set(['@n8n/expression-runtime']);
// Optional rehearsal filter: SWEEP_ONLY=n8n-core,@n8n/agents restricts the sweep
// to a subset (substring match on package name). Empty = the whole reachable set.
const ONLY = (process.env.SWEEP_ONLY ?? '')
	.split(',')
	.map((s) => s.trim())
	.filter(Boolean);

const SRC_RE = /\.(ts|tsx|vue)$/;
const SKIP_RE = /(\.test\.|\.spec\.|\.d\.ts$|\/__tests__\/|\/test\/|\/tests\/|\/dist\/)/;

function walk(dir, acc) {
	let entries;
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return acc;
	}
	for (const e of entries) {
		const full = path.join(dir, e.name);
		if (e.isDirectory()) {
			if (e.name === 'node_modules' || e.name === 'dist') continue;
			walk(full, acc);
		} else if (SRC_RE.test(e.name) && !SKIP_RE.test(full)) {
			acc.push(full);
		}
	}
	return acc;
}

// repo-relative dir → sorted package-relative source files (deterministic order
// so shard slicing is stable across the matrix job and the slice job).
function filesFor(pkgRelDir, name) {
	const abs = path.join(repoRoot, pkgRelDir);
	const roots = (CODE_ROOTS[name] ?? ['src']).map((r) => path.join(abs, r));
	const files = [];
	for (const root of roots) if (existsSync(root)) walk(root, files);
	return files.map((f) => path.relative(abs, f)).sort();
}

// All vitest packages in the workspace (by their `test` script), minus DENY.
function reachablePackages() {
	const pjs = execSync(
		`find packages -name package.json -not -path '*/node_modules/*' -not -path '*/dist/*'`,
		{ cwd: repoRoot, encoding: 'utf8', maxBuffer: 1 << 28 },
	)
		.trim()
		.split('\n');
	const out = [];
	for (const pj of pjs) {
		let j;
		try {
			j = JSON.parse(readFileSync(path.join(repoRoot, pj), 'utf8'));
		} catch {
			continue;
		}
		if (!j.name || DENY.has(j.name)) continue;
		if (ONLY.length && !ONLY.some((o) => j.name.includes(o))) continue;
		if (!/vitest/.test(j.scripts?.test ?? '')) continue;
		const dir = path.dirname(pj);
		const fileCount = filesFor(dir, j.name).length;
		if (fileCount === 0) continue;
		const slug = j.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
		out.push({ name: j.name, dir, slug, fileCount });
	}
	return out.sort((a, b) => b.fileCount - a.fileCount);
}

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f) => {
	const i = args.indexOf(f);
	return i >= 0 ? args[i + 1] : undefined;
};

if (has('--matrix')) {
	const pkgs = reachablePackages();
	const total = pkgs.reduce((s, p) => s + p.fileCount, 0);
	let shardSize = SHARD_SIZE;
	// Grow shard size if needed to stay within the matrix cap. Loud, not silent.
	let shardCount = () => pkgs.reduce((s, p) => s + Math.ceil(p.fileCount / shardSize), 0);
	while (shardCount() > MAX_MATRIX) shardSize += 10;
	if (shardSize !== SHARD_SIZE) {
		process.stderr.write(
			`::notice::Grew shard size ${SHARD_SIZE}→${shardSize} to keep matrix ≤${MAX_MATRIX} (${total} files).\n`,
		);
	}
	const include = [];
	for (const p of pkgs) {
		const n = Math.ceil(p.fileCount / shardSize);
		for (let i = 1; i <= n; i++) {
			include.push({ name: p.name, dir: p.dir, slug: p.slug, shard: `${i}/${n}` });
		}
	}
	process.stderr.write(
		`Sweep: ${pkgs.length} vitest pkgs, ${total} files, ${include.length} shards @ ${shardSize}/shard.\n`,
	);
	process.stdout.write(`matrix=${JSON.stringify({ include })}\n`);
	process.exit(0);
}

if (has('--slice')) {
	const dir = val('--package-dir');
	const shard = val('--shard');
	if (!dir || !shard) {
		process.stderr.write('Usage: sweep-files.mjs --slice --package-dir <dir> --shard <i/n>\n');
		process.exit(2);
	}
	const [i, n] = shard.split('/').map(Number);
	// Re-derive the package name from its package.json so CODE_ROOTS applies.
	const name = JSON.parse(readFileSync(path.join(repoRoot, dir, 'package.json'), 'utf8')).name;
	const files = filesFor(dir, name);
	const per = Math.ceil(files.length / n);
	const slice = files.slice((i - 1) * per, i * per);
	if (slice.length === 0) {
		process.stderr.write(`Shard ${shard} of ${dir} is empty (${files.length} files).\n`);
		process.exit(0);
	}
	process.stdout.write(slice.join(',') + '\n');
	process.exit(0);
}

process.stderr.write(
	'Usage: sweep-files.mjs (--matrix | --slice --package-dir <dir> --shard <i/n>)\n',
);
process.exit(2);
