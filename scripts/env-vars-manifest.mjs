#!/usr/bin/env node
// Emits a JSON manifest of every env var declared with the `@Env` decorator,
// for consumers outside this repo (the docs site). Static scan over source so
// the jsdoc descriptions come along; no package needs to be built first.
//
//   node scripts/env-vars-manifest.mjs            # JSON on stdout
//   node scripts/env-vars-manifest.mjs --out f.json

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEPRECATIONS_FILE = 'packages/cli/src/deprecation/deprecation.service.ts';
const SKIP_DIRS = new Set(['node_modules', 'dist', '__tests__', 'test', 'tests']);

function* sourceFiles(dir) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (!SKIP_DIRS.has(entry.name)) yield* sourceFiles(path);
		} else if (/\.ts$/.test(entry.name) && !/\.(test|spec|d)\.ts$/.test(entry.name)) {
			yield path;
		}
	}
}

const text = (node, sf) => (node ? node.getText(sf) : undefined);

function jsDocOf(node) {
	const docs = node.jsDoc ?? [];
	const description = docs
		.map((d) => (typeof d.comment === 'string' ? d.comment : ts.getTextOfJSDocComment(d.comment)))
		.filter(Boolean)
		.join('\n');
	const deprecatedTag = ts.getJSDocDeprecatedTag(node);
	return {
		description: description || undefined,
		deprecated: deprecatedTag ? ts.getTextOfJSDocComment(deprecatedTag.comment) || true : undefined,
	};
}

/**
 * Resolves `@Env(SOME_CONSTS.key)` by finding `key: 'NAME'` in a `const SOME_CONSTS = {` block
 * in the same directory. ponytail: covers the one existing case (otel); widen if a new shape appears.
 */
function resolveConstantName(expr, dir) {
	if (!dir || !ts.isPropertyAccessExpression(expr)) return undefined;
	const object = expr.expression.getText();
	const key = expr.name.text;
	for (const f of readdirSync(dir)) {
		if (!f.endsWith('.ts')) continue;
		const block = readFileSync(join(dir, f), 'utf8').split(`const ${object} = {`)[1];
		const match = block && new RegExp(`\\b${key}:\\s*'([A-Z0-9_]+)'`).exec(block.split('}')[0]);
		if (match) return match[1];
	}
	return undefined;
}

/** Every `@Env('NAME', schema?)` property in one TypeScript source string. */
export function extractEnvVars(source, file, dir) {
	const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
	const vars = [];
	const visit = (node) => {
		if (ts.isClassDeclaration(node) && node.name) {
			const className = node.name.text;
			const classDoc = jsDocOf(node).description;
			for (const member of node.members) {
				if (!ts.isPropertyDeclaration(member)) continue;
				const env = ts
					.getDecorators(member)
					?.map((d) => d.expression)
					.find((e) => ts.isCallExpression(e) && e.expression.getText(sf) === 'Env');
				if (!env) continue;
				const [nameArg, schemaArg] = env.arguments;
				const name = ts.isStringLiteralLike(nameArg)
					? nameArg.text
					: resolveConstantName(nameArg, dir);
				if (!name) {
					console.warn(`[env-vars-manifest] cannot resolve env name in ${file}: ${nameArg.getText(sf)}`);
					continue;
				}
				vars.push({
					name,
					...jsDocOf(member),
					type: text(member.type, sf),
					default: text(member.initializer, sf),
					schema: text(schemaArg, sf),
					class: className,
					classDescription: classDoc,
					property: member.name.getText(sf),
					file,
				});
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(sf);
	return vars;
}

/** `{ envVar, message }` entries from the DeprecationService registry. */
export function extractDeprecations(source) {
	const sf = ts.createSourceFile('deprecations.ts', source, ts.ScriptTarget.Latest, true);
	const out = new Map();
	const propText = (obj, name) => {
		const prop = obj.properties.find(
			(p) => ts.isPropertyAssignment(p) && p.name.getText(sf) === name,
		);
		if (!prop) return undefined;
		const init = prop.initializer;
		if (ts.isStringLiteralLike(init)) return init.text;
		// ponytail: template strings and identifiers (SAFE_TO_REMOVE) are kept as source text
		return init.getText(sf);
	};
	const visit = (node) => {
		if (ts.isObjectLiteralExpression(node)) {
			const envVar = propText(node, 'envVar');
			if (envVar) out.set(envVar, propText(node, 'message'));
		}
		ts.forEachChild(node, visit);
	};
	visit(sf);
	return out;
}

export function buildManifest(root = ROOT) {
	const vars = [];
	for (const file of sourceFiles(join(root, 'packages'))) {
		const source = readFileSync(file, 'utf8');
		if (!source.includes('@Env(')) continue;
		vars.push(...extractEnvVars(source, relative(root, file), dirname(file)));
	}
	const deprecations = extractDeprecations(readFileSync(join(root, DEPRECATIONS_FILE), 'utf8'));
	for (const v of vars) {
		const message = deprecations.get(v.name);
		if (message !== undefined && v.deprecated === undefined) v.deprecated = message;
	}
	vars.sort((a, b) => a.name.localeCompare(b.name) || a.file.localeCompare(b.file));
	const { version } = JSON.parse(readFileSync(join(root, 'packages/cli/package.json'), 'utf8'));
	return { n8nVersion: version, count: vars.length, vars };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const outIndex = process.argv.indexOf('--out');
	const json = JSON.stringify(buildManifest(), null, '\t') + '\n';
	if (outIndex === -1) process.stdout.write(json);
	else writeFileSync(process.argv[outIndex + 1], json);
}
