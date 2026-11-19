#!/usr/bin/env node
/**
 * Generates missing node output schemas (`__schema__`) from n8n Cloud
 * telemetry: the `Workflow executed manually with output schema` event in
 * BigQuery. Needs `gcloud auth login` with read access to `n8n-telemetry`.
 *
 *   node scripts/schema-telemetry/schema-telemetry.mjs            # report only
 *   node scripts/schema-telemetry/schema-telemetry.mjs --write    # write files
 *   node scripts/schema-telemetry/schema-telemetry.mjs --from <export.json> --write
 *
 * Options: --days 90  --min-workflows 5  --agree-below 20  --samples 20  --min-share 0.5  --max-gb 120
 *
 * A group seen in fewer than --agree-below workflows is written only when its
 * samples agree on their top-level keys.
 *
 * --build-root <dir> reads `dist/known/nodes.json` from another checkout with a
 * build, to map node types whose file has another name. It defaults to this
 * checkout, and without a build the script matches node types by file name.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { buildFiles } from './build-files.mjs';
import { stringifySchema } from './merge.mjs';
import { buildNodeIndex, noOperationTypesOf } from './node-index.mjs';
import { findParamDefault } from './param-defaults.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');
const PROJECT = 'n8n-telemetry';
const PACKAGES = [
	{ name: 'n8n-nodes-base', dir: 'packages/nodes-base' },
	{ name: '@n8n/n8n-nodes-langchain', dir: 'packages/@n8n/nodes-langchain' },
];

const { values: args } = parseArgs({
	options: {
		days: { type: 'string', default: '90' },
		'min-workflows': { type: 'string', default: '5' },
		'agree-below': { type: 'string', default: '20' },
		samples: { type: 'string', default: '20' },
		'min-share': { type: 'string', default: '0.5' },
		'max-gb': { type: 'string', default: '120' },
		from: { type: 'string' },
		'build-root': { type: 'string', default: repoRoot },
		write: { type: 'boolean', default: false },
	},
});

function bq(extraArgs) {
	const params = [
		`--parameter=days:INT64:${args.days}`,
		`--parameter=samples:INT64:${args.samples}`,
		`--parameter=min_workflows:INT64:${args['min-workflows']}`,
	];
	return execFileSync(
		'bq',
		['query', '--use_legacy_sql=false', `--project_id=${PROJECT}`, ...params, ...extraArgs],
		{
			input: readFileSync(join(here, 'query.sql')),
			maxBuffer: 2 ** 31 - 1,
			stdio: ['pipe', 'pipe', 'inherit'],
		},
	).toString();
}

function fetchRows() {
	if (args.from) return JSON.parse(readFileSync(args.from, 'utf8'));

	const maxBytes = Number(args['max-gb']) * 1e9;
	const dryRun = bq(['--dry_run']);
	const bytes = Number(dryRun.match(/process (\d+) bytes/)?.[1] ?? NaN);
	console.log(`Dry run: ${(bytes / 1e9).toFixed(1)} GB (cap ${args['max-gb']} GB)`);
	if (!(bytes <= maxBytes)) throw new Error('Query would scan more than --max-gb. Lower --days.');

	const output = bq(['--format=json', '--max_rows=1000000', `--maximum_bytes_billed=${maxBytes}`]);
	const exportFile = join(
		tmpdir(),
		`schema-telemetry-${new Date().toISOString().slice(0, 10)}.json`,
	);
	writeFileSync(exportFile, output);
	console.log(`Saved the raw export to ${exportFile} (rerun with --from to skip BigQuery)`);
	return JSON.parse(output);
}

/** The package's built node list, without entries whose source is not in this checkout. */
function loadKnownNodes(pkgDir) {
	const file = join(resolve(args['build-root']), pkgDir, 'dist/known/nodes.json');
	if (!existsSync(file)) return {};
	const known = Object.entries(JSON.parse(readFileSync(file, 'utf8')));
	return Object.fromEntries(
		known.filter(([, { sourcePath }]) =>
			existsSync(join(repoRoot, pkgDir, sourcePath.replace(/^dist\//, '').replace(/\.js$/, '.ts'))),
		),
	);
}

function loadPackages() {
	return PACKAGES.map((pkg) => {
		const json = JSON.parse(readFileSync(join(repoRoot, pkg.dir, 'package.json'), 'utf8'));
		return { ...pkg, nodes: json.n8n?.nodes ?? [], known: loadKnownNodes(pkg.dir) };
	});
}

/** Node types with new files whose description has no `schemaPath`, so the SDK would miss them. */
function missingSchemaPaths(files, schemaPaths, index) {
	const types = [...new Set(files.map((f) => f.nodeType))].filter((type) => schemaPaths[type]);
	return types
		.filter(
			(type) =>
				!readFileSync(join(repoRoot, index.get(type).sourceFile), 'utf8').includes('schemaPath'),
		)
		.map((type) => [type, schemaPaths[type]]);
}

/** The `schemaPath` each node declares in its description, by node type. */
function declaredSchemaPaths(index) {
	const paths = new Map();
	for (const [type, { sourceFile }] of index) {
		const declared = readFileSync(join(repoRoot, sourceFile), 'utf8').match(
			/schemaPath: '([^']+)'/,
		)?.[1];
		if (declared) paths.set(type, declared);
	}
	return paths;
}

/**
 * Whether another version folder of the same major already holds this file.
 * The resolver falls back within a major, so a new file there would shadow it.
 */
function coveredBySameMajor(file) {
	const match = file.match(/^(.*\/__schema__)\/v(\d+)\.\d+\.\d+\/(.+)$/);
	if (!match) return false;
	const [, schemaDir, major, rest] = match;
	const absolute = join(repoRoot, schemaDir);
	if (!existsSync(absolute)) return false;
	return readdirSync(absolute)
		.filter((dir) => dir.startsWith(`v${major}.`) && `${schemaDir}/${dir}/${rest}` !== file)
		.some((dir) => existsSync(join(absolute, dir, rest)));
}

/**
 * Marks each indexed node that declares a `resource` parameter. In a folder
 * that several nodes share, only the node's own file counts, unless that file
 * is a versioned wrapper whose descriptions live elsewhere in the folder.
 */
function withResourceFlags(index, sourceIndex) {
	const dirCounts = new Map();
	for (const { dir } of sourceIndex.values()) dirCounts.set(dir, (dirCounts.get(dir) ?? 0) + 1);
	const flagged = new Map();
	for (const [type, entry] of index) {
		const source = sourceIndex.get(type) ?? entry;
		const ownText = readFileSync(join(repoRoot, source.sourceFile), 'utf8');
		const scanFolder =
			(dirCounts.get(source.dir) ?? 1) === 1 || ownText.includes('VersionedNodeType');
		const texts = scanFolder ? readSources(source.dir).map((s) => s.text) : [ownText];
		flagged.set(type, {
			...entry,
			hasResource: texts.some((t) => t.includes("name: 'resource',")),
		});
	}
	return flagged;
}

/** A node folder's TypeScript sources, without tests. */
function readSources(dir) {
	return readdirSync(join(repoRoot, dir), { recursive: true })
		.map(String)
		.filter(
			(file) =>
				file.endsWith('.ts') &&
				!/(^|\/)(test|__tests__)\//.test(file) &&
				!file.endsWith('.test.ts'),
		)
		.map((file) => ({ path: file, text: readFileSync(join(repoRoot, dir, file), 'utf8') }));
}

/** Looks up the default of a group's simplify flag in its node's sources. */
function createDefaultLookup(index) {
	const sourcesByDir = new Map();
	return (group) => {
		const { dir } = index.get(group.node_type);
		if (!sourcesByDir.has(dir)) sourcesByDir.set(dir, readSources(dir));
		const param = group.simplify_param.split('.').pop();
		return findParamDefault(sourcesByDir.get(dir), { param, operation: group.operation ?? '' });
	};
}

function report({ files, existing, skipped, schemaPaths }, index) {
	console.log(
		`\n${files.length} new files, ${existing.length} already exist, ${skipped.length} groups skipped`,
	);
	for (const { file, workflows } of files) console.log(`  + ${file} (${workflows} workflows)`);

	const reasons = new Map();
	for (const { reason } of skipped) reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
	console.log('\nSkipped groups by reason:');
	for (const [reason, count] of [...reasons].sort((a, b) => b[1] - a[1]).slice(0, 25)) {
		console.log(`  ${count}× ${reason}`);
	}

	const hints = missingSchemaPaths(files, schemaPaths, index);
	if (hints.length) {
		console.log(
			'\nAdd `schemaPath` to these node descriptions so the SDK type generator finds the files:',
		);
		for (const [type, schemaPath] of hints) console.log(`  ${type}: schemaPath: '${schemaPath}'`);
	}
}

function main() {
	const rows = fetchRows();
	const packages = loadPackages();
	const telemetry = {
		types: [...new Set(rows.map((r) => r.node_type))],
		noOperationTypes: noOperationTypesOf(rows),
	};
	const sourceIndex = buildNodeIndex(packages, telemetry);
	const index = withResourceFlags(
		buildNodeIndex(packages, { ...telemetry, schemaPaths: declaredSchemaPaths(sourceIndex) }),
		sourceIndex,
	);
	const result = buildFiles(rows, index, {
		exists: (file) => existsSync(join(repoRoot, file)),
		coveredBySameMajor,
		defaultOf: createDefaultLookup(index),
		minShare: Number(args['min-share']),
		minWorkflows: Number(args['agree-below']),
		minSamples: Number(args['min-workflows']),
	});
	report(result, index);

	if (!args.write) return console.log('\nReport only. Pass --write to create the files.');
	for (const { file, schema } of result.files) {
		mkdirSync(dirname(join(repoRoot, file)), { recursive: true });
		writeFileSync(join(repoRoot, file), stringifySchema(schema));
	}
	console.log(`\nWrote ${result.files.length} files.`);
}

main();
