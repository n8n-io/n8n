#!/usr/bin/env node

/**
 * Guards against style blocks that nothing lints.
 *
 * Both stylelint entry points — `lint:ci` and the lefthook `styles_check` hook
 * — reach stylelint through turbo, so a package's styles are linted only if
 * that package declares the script itself. `n8n-editor-ui`'s `lint:styles`
 * globs `editor-ui/src` alone, so when insights moved its SFCs into a package
 * that declared no `lint:styles`, both paths stopped covering them and nothing
 * failed (#37030) — a reviewer caught it, not CI. Every frontend extraction
 * repeats that shape.
 *
 * So: a package that owns `.vue`, `.scss` or `.sass` files must declare
 * `lint:styles` (what `lint:ci` runs) and `lint:styles:fix` (what the
 * pre-commit hook runs). A generator template is a default, not an assertion;
 * this is the assertion.
 */

import { globSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const REQUIRED_SCRIPTS = ['lint:styles', 'lint:styles:fix'];

/** Generated and vendored trees hold styles nobody authored in this repo. */
const IGNORED_DIR =
	/(^|\/)(node_modules|dist|coverage|storybook-static|\.turbo|\.nuxt|\.output)(\/|$)/;

/**
 * A nested package owns its own files, so a style file belongs to the deepest
 * package directory containing it — otherwise `@n8n/node-cli` would answer for
 * the SFCs of the node templates it ships.
 * @param {string[]} packageDirs posix-style, repo-relative
 * @param {string[]} styleFiles posix-style, repo-relative
 * @returns {Map<string, string[]>} package dir → style files it owns
 */
export function assignOwners(packageDirs, styleFiles) {
	const owned = new Map(packageDirs.map((dir) => [dir, []]));
	for (const file of styleFiles) {
		let owner;
		for (const dir of packageDirs) {
			if (!file.startsWith(`${dir}/`)) continue;
			if (owner === undefined || dir.length > owner.length) owner = dir;
		}
		if (owner !== undefined) owned.get(owner).push(file);
	}
	for (const files of owned.values()) files.sort();
	return owned;
}

/**
 * Pure, testable core. Returns one violation string per package that owns
 * style files but is missing a required script.
 * @param {Array<{dir: string, name: string, scripts?: Record<string,string>, styleFiles: string[]}>} packages
 */
export function findViolations(packages) {
	const violations = [];
	for (const pkg of packages) {
		if (pkg.styleFiles.length === 0) continue;
		const missing = REQUIRED_SCRIPTS.filter((script) => !pkg.scripts?.[script]);
		if (missing.length === 0) continue;
		const scripts = missing.map((script) => `"${script}"`).join(' and ');
		violations.push(
			`${pkg.name} (${pkg.dir}) — ${pkg.styleFiles.length} style file(s), no ${scripts}; e.g. ${pkg.styleFiles[0]}`,
		);
	}
	return violations.sort();
}

function posix(path) {
	return path.replaceAll('\\', '/');
}

function loadPackages() {
	const manifests = globSync('packages/**/package.json', {
		cwd: root,
		exclude: (path) => IGNORED_DIR.test(posix(path)),
	}).map(posix);
	const styleFiles = globSync('packages/**/*.{vue,scss,sass}', {
		cwd: root,
		exclude: (path) => IGNORED_DIR.test(posix(path)),
	}).map(posix);

	const owned = assignOwners(
		manifests.map((path) => dirname(path)),
		styleFiles,
	);

	return manifests
		.map((path) => {
			const dir = dirname(path);
			const manifest = JSON.parse(readFileSync(resolve(root, path), 'utf8'));
			return {
				dir,
				name: manifest.name ?? dir,
				scripts: manifest.scripts,
				styleFiles: owned.get(dir),
			};
		})
		.filter((pkg) => pkg.name);
}

function main() {
	const packages = loadPackages();
	const violations = findViolations(packages);
	if (violations.length > 0) {
		console.error('');
		console.error('ERROR: a package that owns .vue/.scss/.sass files must lint its own styles.');
		console.error('');
		console.error('`lint:ci` and the pre-commit `styles_check` hook run stylelint through turbo,');
		console.error('so a package with no `lint:styles` script is never checked and CI stays green');
		console.error('while its style blocks go unlinted.');
		console.error('');
		for (const violation of violations) console.error(`  - ${violation}`);
		console.error('');
		console.error('Add to the package.json of each package listed above:');
		console.error('');
		console.error('  "lint:styles": "stylelint \\"src/**/*.{scss,sass,vue}\\" --cache",');
		console.error('  "lint:styles:fix": "stylelint \\"src/**/*.{scss,sass,vue}\\" --fix --cache"');
		console.error('');
		console.error('plus a `stylelint.config.mjs` extending `@n8n/stylelint-config/base`, and');
		console.error('`@n8n/stylelint-config` + `stylelint` in devDependencies. See');
		console.error('packages/modules/otel/frontend for the frontend-module shape.');
		console.error('');
		process.exit(1);
	}
	const covered = packages.filter((pkg) => pkg.styleFiles.length > 0).length;
	console.log(`OK: all ${covered} packages that own style files declare lint:styles.`);
}

// `--self-test` exercises the core logic without touching the workspace.
if (process.argv.includes('--self-test')) {
	const owned = assignOwners(
		['packages/cli', 'packages/cli/src/template'],
		[
			'packages/cli/src/a.vue',
			'packages/cli/src/template/b.vue',
			'packages/other/c.scss', // outside every package
		],
	);
	const packages = [
		{
			dir: 'packages/ok',
			name: 'ok',
			scripts: { 'lint:styles': 'x', 'lint:styles:fix': 'x' },
			styleFiles: ['a.vue'],
		},
		{ dir: 'packages/none', name: 'none', scripts: { lint: 'x' }, styleFiles: [] },
		{ dir: 'packages/bad', name: 'bad', scripts: { lint: 'x' }, styleFiles: ['b.vue', 'c.scss'] },
		{ dir: 'packages/half', name: 'half', scripts: { 'lint:styles': 'x' }, styleFiles: ['d.sass'] },
		{ dir: 'packages/noscripts', name: 'noscripts', styleFiles: ['e.vue'] },
	];
	const violations = findViolations(packages);
	const checks = [
		[
			'nested package owns its own file',
			owned.get('packages/cli').join() === 'packages/cli/src/a.vue',
		],
		[
			'deepest package wins',
			owned.get('packages/cli/src/template').join() === 'packages/cli/src/template/b.vue',
		],
		['file outside every package is ignored', owned.size === 2],
		['three violations', violations.length === 3],
		[
			'both scripts missing is reported',
			violations.some(
				(v) => v.startsWith('bad ') && v.includes('"lint:styles" and "lint:styles:fix"'),
			),
		],
		[
			'a lone lint:styles is not enough',
			violations.some((v) => v.startsWith('half ') && v.includes('no "lint:styles:fix"')),
		],
		['missing scripts block is reported', violations.some((v) => v.startsWith('noscripts '))],
		['covered package is not reported', !violations.some((v) => v.startsWith('ok '))],
		['package without style files is not reported', !violations.some((v) => v.startsWith('none '))],
	];
	const failed = checks.filter(([, pass]) => !pass).map(([label]) => label);
	if (failed.length > 0) {
		console.error(`self-test FAILED: ${failed.join('; ')}`);
		console.error(JSON.stringify(violations, null, 2));
		process.exit(1);
	}
	console.log(`self-test passed (${checks.length} checks)`);
	process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
