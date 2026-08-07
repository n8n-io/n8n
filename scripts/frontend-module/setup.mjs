#!/usr/bin/env node

/**
 * Scaffolds a frontend feature module package and registers it with the editor-ui shell.
 *
 *   pnpm setup-frontend-module <kebab-case-name>
 *
 * Unlike `scripts/backend-module/setup.mjs` (which copies seven files under a hardcoded
 * `my-feature` name), a frontend module is not usable until the shell can see it. That takes
 * four edits outside the new package, all of which this script makes:
 *
 *   1. `@n8n/vitest-config/frontend-source-packages.ts` — the Vite alias, so the shell resolves
 *      the module to its `src`. The mapping is hand-maintained, so it does not appear on its own.
 *   2. `editor-ui/package.json`  — the dependency, so pnpm links the package and a bare import
 *      resolves outside Vite too (vue-tsc, node).
 *   3. `editor-ui/tsconfig.json` — the `paths` entries, so vue-tsc resolves the same source Vite
 *      does. `editor-ui/vite/aliases.test.ts` fails when 1 and 3 disagree.
 *   4. `editor-ui/src/app/modules.manifest.ts` — the descriptor registration.
 *
 * Every edit is idempotent, so re-running after a partial failure is safe.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const templateDir = join(scriptDir, 'templates');
const repoRoot = resolve(scriptDir, '..', '..');

const EDITOR_UI = join(repoRoot, 'packages', 'frontend', 'editor-ui');
const MANIFEST = join(EDITOR_UI, 'src', 'app', 'modules.manifest.ts');
const MODULES_ROOT = join(repoRoot, 'packages', 'frontend', 'modules');
const SOURCE_PACKAGES = join(
	repoRoot,
	'packages',
	'@n8n',
	'vitest-config',
	'frontend-source-packages.ts',
);

const fail = (message) => {
	console.error(`\n${message}\n`);
	process.exit(1);
};

const name = process.argv[2];

if (!name) {
	fail('Usage: pnpm setup-frontend-module <kebab-case-name>   (e.g. instance-registry)');
}

// The id doubles as the package suffix, the directory name, the file infix and the backend
// module id it must match, so the one spelling has to be canonical.
if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) {
	fail(`"${name}" is not kebab-case. Use lowercase words separated by single hyphens.`);
}

const capitalize = (word) => word[0].toUpperCase() + word.slice(1);
const words = name.split('-');

const substitutions = {
	name,
	PascalName: words.map(capitalize).join(''),
	camelName: words.map((word, index) => (index === 0 ? word : capitalize(word))).join(''),
	TitleName: words.map(capitalize).join(' '),
};

const packageName = `@n8n/frontend-module-${name}`;
const descriptorName = `${substitutions.PascalName}Module`;
const packageDir = join(MODULES_ROOT, name);

if (existsSync(packageDir)) {
	fail(`${packageName} already exists at packages/frontend/modules/${name}.`);
}

const render = (template) =>
	readFileSync(join(templateDir, template), 'utf8').replace(/\{\{(\w+)\}\}/g, (_match, key) => {
		if (!(key in substitutions)) fail(`Template ${template} uses unknown {{${key}}}`);
		return substitutions[key];
	});

/** template → path inside the new package. */
const FILES = [
	['package.json.template', 'package.json'],
	['tsconfig.json.template', 'tsconfig.json'],
	['vite.config.ts.template', 'vite.config.ts'],
	['eslint.config.mjs.template', 'eslint.config.mjs'],
	['biome.jsonc.template', 'biome.jsonc'],
	['README.md.template', 'README.md'],
	['index.ts.template', 'src/index.ts'],
	['module.ts.template', `src/${name}.module.ts`],
	['store.ts.template', `src/${name}.store.ts`],
	['store.test.ts.template', `src/${name}.store.test.ts`],
	['setup.ts.template', 'src/__tests__/setup.ts'],
];

for (const [template, target] of FILES) {
	const absolute = join(packageDir, target);
	mkdirSync(dirname(absolute), { recursive: true });
	writeFileSync(absolute, render(template));
}

/**
 * Line-level edits rather than parse-and-reserialize: `tsconfig.json` carries comments a JSON
 * round-trip would drop, `modules.manifest.ts` is TypeScript, and rewriting `package.json`
 * wholesale would bury the one added line in a reformat.
 *
 * `editor` returns the modified lines, or `undefined` to leave the file alone.
 */
const editLines = (file, editor) => {
	const lines = readFileSync(file, 'utf8').split('\n');
	const edited = editor(lines);
	if (!edited) return false;
	writeFileSync(file, edited.join('\n'));
	return true;
};

/** Index of the line matching `pattern`, or a hard failure — a silent skip would ship broken. */
const lineIndex = (lines, pattern, file) => {
	const at = lines.findIndex((line) => pattern.test(line));
	if (at === -1) fail(`Could not find ${pattern} in ${file}. Register the module by hand.`);
	return at;
};

const edits = [];

// 1. The Vite alias. The mapping is a hand-maintained table, so nothing adds the module for us.
if (
	editLines(SOURCE_PACKAGES, (lines) => {
		if (lines.some((line) => line.includes(`'${packageName}'`))) return undefined;

		const at = lineIndex(lines, /^export const modulePackages/, 'frontend-source-packages.ts');
		lines.splice(
			at + 1,
			0,
			`\t{ name: '${packageName}', dir: 'frontend/modules/${name}' },`,
		);
		return lines;
	})
) {
	edits.push('@n8n/vitest-config/frontend-source-packages.ts (Vite alias)');
}

// 2. The dependency, so the package resolves outside Vite too. Inserted in sort order because the
//    manifests are alphabetical and `pnpm install` will otherwise reorder it out from under the diff.
if (
	editLines(join(EDITOR_UI, 'package.json'), (lines) => {
		if (lines.some((line) => line.includes(`"${packageName}"`))) return undefined;

		const entry = `    "${packageName}": "workspace:*",`;
		const start = lineIndex(lines, /^\s*"dependencies": \{/, 'editor-ui/package.json') + 1;
		let at = start;
		while (at < lines.length && !/^\s*\},?\s*$/.test(lines[at])) {
			const [, dependency] = /^\s*"([^"]+)":/.exec(lines[at]) ?? [];
			if (dependency && dependency > packageName) break;
			at++;
		}

		lines.splice(at, 0, entry);
		return lines;
	})
) {
	edits.push('editor-ui/package.json (dependency)');
}

// 3. The tsconfig paths — vue-tsc has to resolve what Vite resolves, or `aliases.test.ts` fails.
//    Grouped next to the SDK, which every manifest consumer already depends on.
if (
	editLines(join(EDITOR_UI, 'tsconfig.json'), (lines) => {
		if (lines.some((line) => line.includes(`"${packageName}"`))) return undefined;

		const at = lineIndex(
			lines,
			/^\s*"@n8n\/frontend-module-sdk":/,
			'editor-ui/tsconfig.json',
		);
		lines.splice(
			at + 1,
			0,
			`\t\t\t"${packageName}": ["../modules/${name}/src/index.ts"],`,
			`\t\t\t"${packageName}/*": ["../modules/${name}/src/*"],`,
		);
		return lines;
	})
) {
	edits.push('editor-ui/tsconfig.json (paths)');
}

// 4. The manifest — the descriptor registration itself.
if (
	editLines(MANIFEST, (lines) => {
		if (lines.some((line) => line.includes(`'${packageName}'`))) return undefined;

		const closing = lineIndex(lines, /^\];/, 'modules.manifest.ts');
		lines.splice(closing, 0, `\t${descriptorName},`);

		let lastImport = 0;
		lines.forEach((line, index) => {
			if (line.startsWith('import ')) lastImport = index;
		});
		lines.splice(lastImport + 1, 0, `import { ${descriptorName} } from '${packageName}';`);

		return lines;
	})
) {
	edits.push('editor-ui/src/app/modules.manifest.ts (registration)');
}

console.log(`\nCreated ${packageName} at packages/frontend/modules/${name}`);
for (const edit of edits) console.log(`  updated ${edit}`);

console.log(`
Next:
  pnpm install
  pnpm --filter ${packageName} typecheck
  pnpm --filter ${packageName} lint
  pnpm --filter ${packageName} test

See scripts/frontend-module/frontend-module-guide.md for the descriptor and import rules.
`);
