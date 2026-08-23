#!/usr/bin/env node
/**
 * Expression Extraction Tool
 *
 * Reads a directory of n8n workflow JSON exports, extracts all expressions,
 * categorizes them by pattern, and outputs analysis + fixture file.
 *
 * Usage: node scripts/extract-expressions.mjs /path/to/workflow-jsons/
 * Output: Terminal summary + profiles/realistic-expressions.json
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROFILES_DIR = resolve(__dirname, '../profiles');

const inputDir = process.argv[2];
if (!inputDir || !existsSync(inputDir)) {
	console.error('Usage: node scripts/extract-expressions.mjs /path/to/workflow-jsons/');
	console.error('  Directory should contain one .json file per workflow (n8n export format)');
	process.exit(1);
}

// ── Extract expressions from workflow JSON ──

function extractExpressions(obj, acc) {
	if (obj === null || obj === undefined) return;
	if (typeof obj === 'string') {
		if (obj.startsWith('=')) {
			acc.push(obj.substring(1));
		}
		return;
	}
	if (Array.isArray(obj)) {
		for (const item of obj) extractExpressions(item, acc);
		return;
	}
	if (typeof obj === 'object') {
		for (const val of Object.values(obj)) {
			extractExpressions(val, acc);
		}
	}
}

// ── Categorize expression into pattern group ──

function categorize(expr) {
	if (/=>/.test(expr)) return 'arrayIteration';
	if (/\$jmespath/.test(expr)) return 'other';
	if (/\$\(["']/.test(expr)) return 'dollarFunction';
	if (/\$node\[/.test(expr)) return 'nodeRef';
	if (/\?\?/.test(expr)) return 'conditional';
	if (/\?[^.]/.test(expr) && /:/.test(expr)) return 'conditional';

	const extPatterns =
		/\.(extract|to[A-Z]|is[A-Z]|replace|split|trim|format|round|ceil|floor|isEmpty|isNotEmpty|compact|first|last|unique|sort|chunk|pluck|merge|urlEncode|urlDecode|toUpperCase|toLowerCase|includes|startsWith|endsWith)/;
	if (/\.\w+\(/.test(expr) && extPatterns.test(expr)) return 'extensionCall';
	if (/\.\w+\(/.test(expr)) return 'methodCall';

	if (/\[\d+\]/.test(expr)) return 'arrayAccess';

	const dots = (expr.match(/\./g) || []).length;
	if (dots >= 4) return 'deepNested';
	if (dots >= 2) return 'nestedProperty';
	if (/^\s*\{?\{?\s*\$\w+\.\w+\s*\}?\}?\s*$/.test(expr)) return 'simpleProperty';

	return 'other';
}

// ── Main ──

const files = readdirSync(inputDir).filter((f) => f.endsWith('.json'));
console.log(`Scanning ${files.length} workflow files...\n`);

const allExpressions = [];

for (const file of files) {
	try {
		const wf = JSON.parse(readFileSync(join(inputDir, file), 'utf8'));
		const nodes = wf.nodes || [];
		for (const node of nodes) {
			if (node.parameters) {
				extractExpressions(node.parameters, allExpressions);
			}
		}
	} catch {
		// skip malformed
	}
}

// Deduplicate and count
const exprCounts = new Map();
for (const expr of allExpressions) {
	exprCounts.set(expr, (exprCounts.get(expr) || 0) + 1);
}

// Categorize
const groups = {};
for (const [expr, count] of exprCounts) {
	const group = categorize(expr);
	if (!groups[group]) groups[group] = [];
	groups[group].push({ expr, count });
}

// Sort each group by frequency
for (const group of Object.values(groups)) {
	group.sort((a, b) => b.count - a.count);
}

// ── Terminal summary ──

console.log(`Total workflows: ${files.length}`);
console.log(`Total expression occurrences: ${allExpressions.length}`);
console.log(`Unique expressions: ${exprCounts.size}`);

const lengths = allExpressions.map((e) => e.length);
lengths.sort((a, b) => a - b);
const pct = (arr, p) => arr[Math.floor((arr.length * p) / 100)];
console.log(`\nLength distribution:`);
console.log(
	`  p50: ${pct(lengths, 50)}  p90: ${pct(lengths, 90)}  p99: ${pct(lengths, 99)}  max: ${lengths[lengths.length - 1]}`,
);

console.log(`\nPattern distribution:`);
const groupSummary = Object.entries(groups)
	.map(([name, items]) => {
		const total = items.reduce((s, i) => s + i.count, 0);
		return { name, unique: items.length, total };
	})
	.sort((a, b) => b.total - a.total);

for (const { name, unique, total } of groupSummary) {
	const pctVal = ((total / allExpressions.length) * 100).toFixed(1);
	console.log(
		`  ${name.padEnd(20)} ${String(total).padStart(6)} occurrences (${pctVal}%)  ${unique} unique`,
	);
}

console.log(`\nTop 20 most common expressions:`);
const top = [...exprCounts.entries()].sort(([, a], [, b]) => b - a).slice(0, 20);
for (const [expr, count] of top) {
	const truncated = expr.length > 70 ? expr.substring(0, 67) + '...' : expr;
	console.log(`  ${String(count).padStart(5)}x  ${truncated}`);
}

// ── Output fixture file ──

const TOP_N = 10;
const fixture = {
	meta: {
		workflowCount: files.length,
		totalExpressions: allExpressions.length,
		uniqueExpressions: exprCounts.size,
		extractedAt: new Date().toISOString(),
	},
	groups: {},
};

for (const [name, items] of Object.entries(groups)) {
	fixture.groups[name] = items.slice(0, TOP_N).map((i) => i.expr);
}

const outputPath = resolve(PROFILES_DIR, 'realistic-expressions.json');
writeFileSync(outputPath, JSON.stringify(fixture, null, '\t'));
console.log(`\nSaved: ${outputPath}`);
