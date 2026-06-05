#!/usr/bin/env node
/**
 * Adds an opt-in `typecheck:tsgo` script to every workspace package that
 * type-checks with `tsc --noEmit`, mirroring the existing `typecheck` script
 * but routed through the native compiler (tsgo / @typescript/native-preview).
 *
 * - Packages whose `typecheck` uses `vue-tsc` are skipped: tsgo cannot parse
 *   `.vue` single-file components, so those stay on vue-tsc.
 * - The insertion is a minimal, format-preserving text edit (one line, matching
 *   the existing indentation) so the diff stays to a single added line per file
 *   rather than a full re-serialization.
 * - Idempotent: re-running skips packages that already have `typecheck:tsgo`.
 *
 * Usage: node scripts/tsgo/add-tsgo-scripts.mjs [--check]
 *   --check  exit non-zero if any package would change (for CI drift checks)
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const checkOnly = process.argv.includes('--check');

const files = execSync('find packages -name package.json -not -path "*/node_modules/*" -maxdepth 4')
	.toString()
	.trim()
	.split('\n')
	.filter(Boolean);

const added = [];
const skippedVue = [];

for (const file of files) {
	const raw = readFileSync(file, 'utf8');
	const lines = raw.split('\n');

	const idx = lines.findIndex((l) => /^\s*"typecheck"\s*:/.test(l));
	if (idx === -1) continue;

	if (lines.some((l) => /^\s*"typecheck:tsgo"\s*:/.test(l))) continue; // idempotent

	const m = lines[idx].match(/^(\s*)"typecheck":\s*"([^"]*)"(,?)\s*$/);
	if (!m) continue;
	const [, indent, command, comma] = m;

	// tsgo has no .vue support — leave vue-tsc packages alone.
	if (/vue-tsc/.test(command)) {
		skippedVue.push(file);
		continue;
	}

	const tsgoCommand = command.replace(/\btsc\b/g, 'tsgo');
	// The `typecheck` line must end with a comma now that a line follows it; the
	// new `typecheck:tsgo` line carries whatever trailing comma the original had.
	lines[idx] = `${indent}"typecheck": "${command}",`;
	lines.splice(idx + 1, 0, `${indent}"typecheck:tsgo": "${tsgoCommand}"${comma}`);

	added.push(file);
	if (!checkOnly) writeFileSync(file, lines.join('\n'));
}

console.log(`tsgo scripts — added: ${added.length}, vue (skipped): ${skippedVue.length}`);

if (checkOnly && added.length) {
	console.error('\nDrift detected: run `node scripts/tsgo/add-tsgo-scripts.mjs` and commit.');
	process.exit(1);
}
