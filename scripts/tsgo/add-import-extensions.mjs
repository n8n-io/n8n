#!/usr/bin/env node
// @ts-check
/**
 * Codemod: add explicit file extensions to relative and path-aliased imports
 * so they satisfy `moduleResolution: NodeNext` (TS2307 / TS2834 / TS2835).
 *
 * What it does NOT do: it never rewrites an alias into a relative path. The
 * `@/foo` prefix is preserved verbatim — only the extension is appended. The
 * filesystem is consulted purely to decide between `.js`, `/index.js`, `.json`.
 *
 * Usage:
 *   node scripts/tsgo/add-import-extensions.mjs <package-dir> [<package-dir> ...]
 *   node scripts/tsgo/add-import-extensions.mjs --write <package-dir> ...
 *
 * Without --write it is a dry run: prints every change it would make plus any
 * specifiers it could not resolve (left untouched for manual review).
 *
 * Defaults to packages/cli and packages/@n8n/ai-workflow-builder.ee when no
 * package dir is given.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Project, SyntaxKind } from 'ts-morph';
import ts from 'typescript';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const rawArgs = process.argv.slice(2);
const write = rawArgs.includes('--write');
const pkgArgs = rawArgs.filter((a) => a !== '--write');
const pkgDirs = (
	pkgArgs.length > 0 ? pkgArgs : ['packages/cli', 'packages/@n8n/ai-workflow-builder.ee']
).map((p) => (isAbsolute(p) ? p : resolve(repoRoot, p)));

// Source-file extensions we map to their emitted .js form.
const SOURCE_EXTS = ['.ts', '.tsx', '.mts', '.cts'];
// Extensions that already make a specifier valid under NodeNext — skip those.
const HAS_EXT = /\.(m?js|c?js|mjs|cjs|json|node|css|scss|svg|png|jpe?g|gif|xsd|html|wasm)$/i;

/**
 * Read a package's tsconfig `paths` + baseUrl so we can map aliases like
 * `@/*` -> `<pkg>/src/*` to a filesystem base directory.
 * @param {string} pkgDir
 */
function loadAliases(pkgDir) {
	const tsconfigPath = join(pkgDir, 'tsconfig.json');
	const { config, error } = ts.readConfigFile(tsconfigPath, (p) => readFileSync(p, 'utf8'));
	if (error) throw new Error(`Failed to read ${tsconfigPath}: ${error.messageText}`);
	const opts = config.compilerOptions ?? {};
	const baseUrl = resolve(pkgDir, opts.baseUrl ?? '.');
	/** @type {Array<{ prefix: string, base: string }>} */
	const aliases = [];
	for (const [pattern, targets] of Object.entries(opts.paths ?? {})) {
		// Only handle the common `prefix/*` -> `target/*` shape.
		if (!pattern.endsWith('/*') || !Array.isArray(targets) || targets.length === 0) continue;
		const target = targets[0];
		if (!target.endsWith('/*')) continue;
		aliases.push({
			prefix: pattern.slice(0, -1), // "@/*" -> "@/"
			base: resolve(baseUrl, target.slice(0, -2)), // "./src/*" -> "<pkg>/src"
		});
	}
	// Longest prefix first so "@test-integration/" beats "@test/" etc.
	aliases.sort((a, b) => b.prefix.length - a.prefix.length);
	return aliases;
}

/**
 * Given the filesystem base path a specifier resolves to, return the suffix to
 * append (".js", "/index.js", ".json"), or null if it can't be resolved.
 * @param {string} basePath
 */
function extensionFor(basePath) {
	for (const ext of SOURCE_EXTS) if (existsSync(basePath + ext)) return '.js';
	if (existsSync(basePath + '.json')) return '.json';
	for (const ext of SOURCE_EXTS) if (existsSync(join(basePath, `index${ext}`))) return '/index.js';
	if (existsSync(join(basePath, 'index.json'))) return '/index.json';
	return null;
}

/**
 * Resolve a module specifier to a filesystem base path, or null if it is a bare
 * package import we should leave alone.
 * @param {string} spec
 * @param {string} fileDir
 * @param {Array<{ prefix: string, base: string }>} aliases
 */
function resolveBase(spec, fileDir, aliases) {
	if (spec.startsWith('./') || spec.startsWith('../')) return resolve(fileDir, spec);
	for (const { prefix, base } of aliases) {
		if (spec.startsWith(prefix)) return join(base, spec.slice(prefix.length));
	}
	return null; // bare import — not ours to touch
}

/** @type {{changed: number, files: Set<string>, unresolved: string[]}} */
const stats = { changed: 0, files: new Set(), unresolved: [] };

for (const pkgDir of pkgDirs) {
	const aliases = loadAliases(pkgDir);
	const project = new Project({
		skipAddingFilesFromTsConfig: true,
		skipFileDependencyResolution: true,
		compilerOptions: { allowJs: false },
	});
	project.addSourceFilesAtPaths([
		join(pkgDir, '**/*.{ts,tsx,mts,cts}'),
		`!${join(pkgDir, '**/node_modules/**')}`,
		`!${join(pkgDir, '**/dist/**')}`,
		`!${join(pkgDir, '**/*.d.ts')}`,
	]);

	for (const sourceFile of project.getSourceFiles()) {
		const filePath = sourceFile.getFilePath();
		const fileDir = dirname(filePath);
		let fileChanged = false;

		/** @param {string} spec @param {(v: string) => void} setter */
		const fixSpecifier = (spec, setter) => {
			if (!spec || HAS_EXT.test(spec)) return;
			const basePath = resolveBase(spec, fileDir, aliases);
			if (basePath === null) return; // bare import
			const suffix = extensionFor(basePath);
			if (suffix === null) {
				stats.unresolved.push(`${filePath}: ${spec}`);
				return;
			}
			setter(spec + suffix);
			fileChanged = true;
			stats.changed++;
			if (!write) console.log(`  ${spec}  ->  ${spec + suffix}`);
		};

		// import ... from 'x'  and  import 'x'
		for (const decl of sourceFile.getImportDeclarations()) {
			fixSpecifier(decl.getModuleSpecifierValue() ?? '', (v) => decl.setModuleSpecifier(v));
		}
		// export ... from 'x'
		for (const decl of sourceFile.getExportDeclarations()) {
			const spec = decl.getModuleSpecifierValue();
			if (spec) fixSpecifier(spec, (v) => decl.setModuleSpecifier(v));
		}
		// dynamic import('x') and require('x') (incl. import x = require('x'))
		for (const call of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
			const expr = call.getExpression();
			const kind = expr.getKind();
			const isImport = kind === SyntaxKind.ImportKeyword;
			const isRequire = kind === SyntaxKind.Identifier && expr.getText() === 'require';
			if (!isImport && !isRequire) continue;
			const [arg] = call.getArguments();
			if (!arg || arg.getKind() !== SyntaxKind.StringLiteral) continue;
			const lit = arg.asKindOrThrow(SyntaxKind.StringLiteral);
			fixSpecifier(lit.getLiteralValue(), (v) => lit.setLiteralValue(v));
		}

		if (fileChanged) {
			stats.files.add(filePath);
			if (!write) console.log(`(dry-run) ${filePath}`);
			if (write) sourceFile.saveSync();
		}
	}
}

console.log(
	`\n${write ? 'Wrote' : 'Would change'} ${stats.changed} imports across ${stats.files.size} files.`,
);
if (stats.unresolved.length > 0) {
	console.log(`\n${stats.unresolved.length} specifiers could not be resolved (left untouched):`);
	for (const u of stats.unresolved) console.log(`  ${u}`);
}
if (!write) console.log('\nDry run. Re-run with --write to apply.');
