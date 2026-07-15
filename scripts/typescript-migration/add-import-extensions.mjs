#!/usr/bin/env node
// Codemod: add explicit .js/.json extensions to relative import specifiers so a
// package can move from `moduleResolution: node` to NodeNext.
//
// NodeNext (and ESM) require relative specifiers to carry their runtime
// extension. TypeScript's convention is to import a `.ts` source as `.js`, and
// a directory as `<dir>/index.js`. This rewrites:
//   import x from './foo'          ->  './foo.js'
//   export * from './bar'          ->  './bar.js'
//   import('./baz')                ->  './baz.js'
//   import cfg from './data'       ->  './data.json'   (when data.json exists)
//   import x from './widgets'      ->  './widgets/index.js'
//
// It also rewrites alias specifiers that match a `paths` mapping in the package
// tsconfig (`@/foo` -> `@/foo.js`, `@/widgets` -> `@/widgets/index.js`), resolving
// the extension against the mapped target directory. `tsc --noEmit` (typecheck)
// does NOT run tsc-alias, so under NodeNext these aliases fail to resolve without
// an extension; tsc-alias's `resolveFullPaths` handles the already-suffixed alias
// at build time, so this is safe for both typecheck and build.
//
// It SKIPS bare specifiers (package names — they never match a `@/*`-style
// `paths` prefix) and anything that already has a known extension.
//
// Dry-run by default; pass --write to apply.
//
// Usage:
//   node scripts/typescript-migration/add-import-extensions.mjs <package> [--write]

import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..', '..');
const KNOWN_EXTENSIONS = ['.js', '.mjs', '.cjs', '.json', '.node'];

function fail(message) {
	console.error(`\n✖ ${message}\n`);
	process.exit(1);
}

// ts-morph is a catalog dep of several packages, not hoisted to the root, so
// resolve it from a package that depends on it.
async function loadTsMorph() {
	const candidates = [
		'packages/testing/janitor',
		'packages/testing/code-health',
		'packages/@n8n/node-cli',
	];
	for (const rel of candidates) {
		const anchor = join(REPO_ROOT, rel, 'package.json');
		if (!existsSync(anchor)) continue;
		try {
			const require = createRequire(anchor);
			const entry = require.resolve('ts-morph');
			return await import(pathToFileURL(entry).href);
		} catch {
			// try next anchor
		}
	}
	fail('Could not resolve "ts-morph". Run `pnpm install` first.');
}

function parseArgs(argv) {
	let write = false;
	const positionals = [];
	for (const arg of argv) {
		if (arg === '--write') write = true;
		else if (arg.startsWith('--')) fail(`Unknown option: ${arg}`);
		else positionals.push(arg);
	}
	if (positionals.length !== 1) fail('Expected exactly one <package> argument.');
	return { package: positionals[0], write };
}

function findTsConfig(pkgArg) {
	const dir = resolve(REPO_ROOT, pkgArg);
	if (existsSync(join(dir, 'tsconfig.json'))) return join(dir, 'tsconfig.json');
	fail(`No tsconfig.json found at "${dir}". Pass a package directory (e.g. packages/workflow).`);
}

function isRelative(spec) {
	return spec.startsWith('./') || spec.startsWith('../');
}

function hasKnownExtension(spec) {
	return KNOWN_EXTENSIONS.some((ext) => spec.endsWith(ext));
}

// Resolve a relative specifier to the extension it should carry, or null if it
// can't be resolved on disk (caller reports it for manual review).
function resolveExtension(fromFile, spec) {
	const base = resolve(dirname(fromFile), spec);
	for (const ext of ['.ts', '.tsx', '.mts', '.cts']) {
		if (existsSync(base + ext)) return '.js';
	}
	if (existsSync(base + '.json')) return '.json';
	if (existsSync(base + '.js')) return '.js';
	for (const idx of ['index.ts', 'index.tsx', 'index.mts', 'index.cts', 'index.js']) {
		if (existsSync(join(base, idx))) return '/index.js';
	}
	return null;
}

// Build matchers from the package tsconfig `paths` (e.g. `@/*` -> `./src/*`).
// `paths` are relative to the config dir when no `baseUrl` is set. Only simple
// single-`*` wildcard patterns are supported (that covers n8n's aliases).
function buildAliasMatchers(compilerOptions, configDir) {
	const paths = compilerOptions.paths ?? {};
	const baseDir = compilerOptions.baseUrl ? resolve(configDir, compilerOptions.baseUrl) : configDir;
	const matchers = [];
	for (const [pattern, targets] of Object.entries(paths)) {
		const starIdx = pattern.indexOf('*');
		if (starIdx === -1) continue; // exact (non-wildcard) aliases are rare; skip
		const prefix = pattern.slice(0, starIdx);
		const suffix = pattern.slice(starIdx + 1);
		const targetTemplates = targets
			.filter((t) => t.includes('*'))
			.map((t) => resolve(baseDir, t));
		if (targetTemplates.length) matchers.push({ prefix, suffix, targetTemplates });
	}
	return matchers;
}

// Resolve an alias specifier to the extension it should carry (matching the
// first `paths` target that exists on disk), or null if unmatched/unresolvable.
function resolveAliasExtension(spec, matchers) {
	for (const { prefix, suffix, targetTemplates } of matchers) {
		if (!spec.startsWith(prefix) || !spec.endsWith(suffix)) continue;
		if (spec.length < prefix.length + suffix.length) continue;
		const captured = spec.slice(prefix.length, spec.length - suffix.length);
		for (const template of targetTemplates) {
			const base = template.replace('*', captured);
			for (const ext of ['.ts', '.tsx', '.mts', '.cts']) {
				if (existsSync(base + ext)) return '.js';
			}
			if (existsSync(base + '.json')) return '.json';
			if (existsSync(base + '.js')) return '.js';
			for (const idx of ['index.ts', 'index.tsx', 'index.mts', 'index.cts', 'index.js']) {
				if (existsSync(join(base, idx))) return '/index.js';
			}
		}
	}
	return null;
}

async function main() {
	const opts = parseArgs(process.argv.slice(2));
	const tsConfigFilePath = findTsConfig(opts.package);
	const { Project, SyntaxKind } = await loadTsMorph();

	console.log(`\nCodemod: add import extensions`);
	console.log(`  tsconfig: ${tsConfigFilePath}`);
	console.log(`  mode:     ${opts.write ? 'WRITE' : 'dry-run (pass --write to apply)'}\n`);

	// Only rewrite the target package's own hand-written sources. The project
	// (via references) also loads dist output and other packages' declaration
	// files — those aren't ours to touch.
	const pkgDir = dirname(tsConfigFilePath);
	const project = new Project({ tsConfigFilePath });
	const aliasMatchers = buildAliasMatchers(project.getCompilerOptions(), pkgDir);
	if (aliasMatchers.length) {
		console.log(`  aliases:  ${aliasMatchers.map((m) => `${m.prefix}*${m.suffix}`).join(', ')}\n`);
	}
	const sourceFiles = project.getSourceFiles().filter((sf) => {
		const p = sf.getFilePath();
		return (
			p.startsWith(`${pkgDir}/`) &&
			!p.includes('/node_modules/') &&
			!p.includes('/dist/') &&
			!sf.isDeclarationFile()
		);
	});

	let scanned = 0;
	let rewritten = 0;
	const unresolved = [];

	for (const sf of sourceFiles) {
		scanned++;
		const filePath = sf.getFilePath();
		const relFile = filePath.replace(`${REPO_ROOT}/`, '');
		let changedInFile = false;

		// Collect (node, currentSpec, setter) for static import/export + dynamic import.
		const targets = [];
		for (const decl of [...sf.getImportDeclarations(), ...sf.getExportDeclarations()]) {
			const spec = decl.getModuleSpecifierValue();
			if (spec) targets.push({ spec, set: (v) => decl.setModuleSpecifier(v) });
		}
		for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
			if (call.getExpression().getKind() !== SyntaxKind.ImportKeyword) continue;
			const [arg] = call.getArguments();
			if (arg && arg.getKind() === SyntaxKind.StringLiteral) {
				targets.push({ spec: arg.getLiteralText(), set: (v) => arg.setLiteralValue(v) });
			}
		}

		for (const { spec, set } of targets) {
			if (hasKnownExtension(spec)) continue;
			let ext;
			if (isRelative(spec)) {
				ext = resolveExtension(filePath, spec);
			} else if (aliasMatchers.length) {
				ext = resolveAliasExtension(spec, aliasMatchers);
				if (!ext) continue; // bare package spec (or unmapped) — leave it alone
			} else {
				continue;
			}
			if (!ext) {
				unresolved.push(`${relFile}: '${spec}'`);
				continue;
			}
			set(ext.startsWith('/') ? spec + ext : spec + ext);
			rewritten++;
			changedInFile = true;
			if (!opts.write) console.log(`  ${relFile}: '${spec}' -> '${spec + ext}'`);
		}

		if (changedInFile && opts.write) sf.saveSync();
	}

	console.log(`\n${'='.repeat(48)}`);
	console.log(`  files scanned:      ${scanned}`);
	console.log(`  specifiers ${opts.write ? 'rewritten' : 'to rewrite'}: ${rewritten}`);
	console.log(`  unresolved:         ${unresolved.length}`);
	if (unresolved.length) {
		console.log(`\n⚠ Unresolved relative specifiers (review manually):`);
		for (const u of unresolved) console.log(`    ${u}`);
	}
	if (!opts.write && rewritten > 0) console.log(`\nRe-run with --write to apply.`);
	console.log('');
}

main();
