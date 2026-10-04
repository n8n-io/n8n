// @vitest-environment jsdom

// Coverage guard for the native-evaluation parity corpus.
//
// The parity corpus (native-evaluation-parity.test.ts) must exercise every
// shape feature the native grammar accepts, so grammar changes stay
// parity-visible. This test keeps a catalog of grammar-eligible shape
// features (CANDIDATES below), tokenizes both the catalog and every corpus
// expression through the real parse pipeline, and fails naming any catalog
// feature no corpus entry reaches.
//
// A feature is a shape token: an operator, a method with its argument
// count, a member form, a literal form, a grammar-level identifier, a chunk
// structure. Data names are not features. Only missing features fail; there
// is deliberately no snapshot of the complete feature set, so the catalog
// can grow with the grammar (more roots, methods, callback forms) without
// rewriting this test.

import { getParsedExpression } from '@n8n/tournament';
import { isNativelyEvaluable } from '../src/expressions/native-evaluation';
import { ALL_CORPORA } from './native-evaluation-corpus';

// ── Shape tokenization ────────────────────────────────────────────────────
// A generic AST walk over the same parse the native evaluator uses.

const SKIP_KEYS = new Set(['loc', 'range', 'tokens', 'comments', 'start', 'end']);
const GRAMMAR_IDENTIFIERS = new Set([
	'$json',
	'$parameter',
	'$vars',
	'$binary',
	'$itemIndex',
	'$runIndex',
	'$input',
	'$node',
	'$',
	'undefined',
]);

type AstRecord = Record<string, unknown>;

function literalFeatures(o: AstRecord, feats: Set<string>): void {
	const value = o.value;
	feats.add(value === null ? 'lit:null' : `lit:${typeof value}`);
	const raw = typeof o.raw === 'string' ? o.raw : '';
	if (typeof value === 'number') {
		if (/^0[xX]/.test(raw)) feats.add('num:hex');
		if (/^0[oO]/.test(raw)) feats.add('num:octal');
		if (/^0[bB]/.test(raw)) feats.add('num:binary');
		if (/[eE]/.test(raw)) feats.add('num:exp');
		if (raw.includes('_')) feats.add('num:sep');
		if (raw.includes('.')) feats.add('num:float');
	}
	if (typeof value === 'string' && raw.includes('\\')) feats.add('lit:str:escape');
}

function memberFeature(o: AstRecord): string {
	const property = o.property as AstRecord | undefined;
	let kind = 'dot';
	if (o.computed === true) {
		if (property?.type !== 'Literal') kind = 'cdyn';
		else kind = typeof property.value === 'number' ? 'cnum' : 'cstr';
	}
	return `member:${kind}${o.optional === true ? '?' : ''}`;
}

function callFeature(o: AstRecord): string {
	const callee = o.callee as { property?: { type?: string; name?: unknown } } | undefined;
	const method = callee?.property?.type === 'Identifier' ? String(callee.property.name) : '?';
	const arity = Array.isArray(o.arguments) ? o.arguments.length : 0;
	return `call:${method}:${arity}${o.optional === true ? '?' : ''}`;
}

function walk(node: unknown, feats: Set<string>): void {
	if (Array.isArray(node)) {
		for (const child of node) walk(child, feats);
		return;
	}
	if (node === null || typeof node !== 'object') return;

	const o = node as AstRecord;

	switch (o.type) {
		case 'Identifier':
			// Grammar-level identifiers only; member names are data, not shape.
			if (GRAMMAR_IDENTIFIERS.has(String(o.name))) {
				feats.add(`id:${String(o.name)}`);
			}
			break;
		case 'Literal':
			literalFeatures(o, feats);
			break;
		case 'MemberExpression':
			feats.add(memberFeature(o));
			break;
		case 'UnaryExpression':
			feats.add(`unary:${String(o.operator)}`);
			break;
		case 'BinaryExpression':
			feats.add(`bin:${String(o.operator)}`);
			break;
		case 'LogicalExpression':
			feats.add(`log:${String(o.operator)}`);
			break;
		case 'ConditionalExpression':
			feats.add('ternary');
			break;
		case 'CallExpression':
			feats.add(callFeature(o));
			break;
		default:
			break;
	}

	for (const key of Object.keys(o)) {
		if (SKIP_KEYS.has(key)) continue;
		walk(o[key], feats);
	}
}

/** Shape features of an expression (leading `=` stripped), or null if it does not parse. */
function featuresOf(stripped: string): Set<string> | null {
	let chunks;
	try {
		chunks = getParsedExpression(stripped);
	} catch {
		return null;
	}

	const feats = new Set<string>();
	for (const chunk of chunks) {
		if (chunk.type === 'text') {
			feats.add(chunk.text === '' ? 'chunk:text-empty' : 'chunk:text');
			continue;
		}
		walk(chunk.parsed, feats);
	}
	return feats;
}

// ── The shape catalog ──────────────────────────────────────────────────────
// One example per grammar-eligible feature class. When the grammar grows
// (new roots, methods, callback forms), add the new shapes here; the test
// then fails until the corpus exercises them.
const CANDIDATES = [
	// operators
	'={{ $json.item.count == "2" }}',
	'={{ $json.item.count != "2" }}',
	'={{ $json.item.count === 2 }}',
	'={{ $json.item.count !== 2 }}',
	'={{ $json.item.count < 3 }}',
	'={{ $json.item.count <= 2 }}',
	'={{ $json.item.count > 1 }}',
	'={{ $json.item.count >= 2 }}',
	'={{ $json.item.count + 1 }}',
	'={{ $json.item.count - 1 }}',
	'={{ $json.item.count * 2 }}',
	'={{ $json.item.count / 2 }}',
	'={{ $json.item.count % 2 }}',
	'={{ !$json.item.active }}',
	'={{ -$json.item.count }}',
	'={{ +$json.item.count }}',
	'={{ $json.item.active && $json.item.name }}',
	'={{ $json.item.disabled || $json.item.count }}',
	'={{ $json.item.missing ?? $json.item.name }}',
	'={{ $json.item.count > 1 ? "many" : "one" }}',
	// literals
	'={{ "text" }}',
	'={{ 5 }}',
	'={{ 0.5 }}',
	'={{ 1e3 }}',
	'={{ 0x10 }}',
	'={{ 0o17 }}',
	'={{ 0b101 }}',
	'={{ 1_000 }}',
	'={{ true }}',
	'={{ false }}',
	'={{ null }}',
	'={{ undefined }}',
	'={{ $json.item["\\u006eame"] }}',
	// roots and member forms
	'={{ $json.item.name }}',
	'={{ $parameter.value1 }}',
	'={{ $vars.region }}',
	'={{ $binary.file.fileName }}',
	'={{ $itemIndex }}',
	'={{ $runIndex }}',
	// node references
	"={{ $('Source').item.json.item.name }}",
	"={{ $('Source').first().json.item.name }}",
	"={{ $('Source').last().json.item.name }}",
	"={{ $('Source').all().length }}",
	"={{ $('Source').first()?.json.item.name }}",
	'={{ $input.item.json.item.name }}',
	'={{ $input.first().json.item.name }}',
	'={{ $input.last().json.item.name }}',
	'={{ $input.all().length }}',
	'={{ $node["Source"].json.item.name }}',
	'={{ $node.Source.json.item.name }}',
	'={{ $node["Source"].binary.file.mimeType }}',
	'={{ $json.item?.name }}',
	'={{ $json.item.my_object?.addresses }}',
	"={{ $json.item['name'] }}",
	'={{ $json.item.names[0] }}',
	"={{ $json.item?.['name'] }}",
	'={{ $json.item.names?.[0] }}',
	// string methods, by argument count
	'={{ $json.item.name.toUpperCase() }}',
	'={{ $json.item.name.toUpperCase($json.item.count) }}',
	'={{ $json.item.name.toUpperCase?.() }}',
	'={{ $json.item.name.toLowerCase() }}',
	'={{ $json.item.name.trim() }}',
	'={{ $json.item.name.trimStart() }}',
	'={{ $json.item.name.trimEnd() }}',
	'={{ $json.item.name.charAt() }}',
	'={{ $json.item.name.charAt(1) }}',
	"={{ $json.item.name.includes('o') }}",
	"={{ $json.item.name.includes('o', 1) }}",
	"={{ $json.item.name.startsWith('f') }}",
	"={{ $json.item.name.startsWith('o', 1) }}",
	"={{ $json.item.name.endsWith('o') }}",
	"={{ $json.item.name.endsWith('o', 2) }}",
	'={{ $json.item.name.slice(1) }}',
	'={{ $json.item.name.slice(1, 2) }}',
	"={{ $json.item.name.indexOf('o') }}",
	"={{ $json.item.name.indexOf('o', 1) }}",
	"={{ $json.item.name.replace('o') }}",
	"={{ $json.item.name.replace('o', '0') }}",
	"={{ $json.item.name.replaceAll('o', '0') }}",
	// number methods, by argument count
	'={{ $json.item.count.toFixed() }}',
	'={{ $json.item.count.toFixed(2) }}',
	'={{ $json.item.count.toPrecision() }}',
	'={{ $json.item.count.toPrecision(3) }}',
	'={{ $json.item.count.toString() }}',
	'={{ $json.item.count.toString(2) }}',
	// array methods, by argument count
	"={{ $json.item.names.includes('bar') }}",
	"={{ $json.item.names.indexOf('baz') }}",
	"={{ $json.item.names.lastIndexOf('baz') }}",
	'={{ $json.item.names.join() }}',
	"={{ $json.item.names.join('-') }}",
	'={{ $json.item.names.slice(0) }}',
	'={{ $json.item.names.slice(0, 1) }}',
	'={{ $json.item.names.at(0) }}',
	'={{ $json.item.names.at(-1) }}',
	'={{ $json.item.names.concat() }}',
	'={{ $json.item.names.concat($json.item.names) }}',
	'={{ $json.item.names.flat() }}',
	'={{ $json.item.names.flat(2) }}',
	'={{ $json.item.names.toSorted() }}',
	'={{ $json.item.names.toReversed() }}',
	// compound shapes
	'={{ $json.item.name.trim().toUpperCase() }}',
	'={{ $json.item.name.toUpperCase().length }}',
	'={{ ($json.item.count + 1) * 2 }}',
	'={{ $json.item.name.slice($json.item.count + 1) }}',
	'={{ $json.item.name.slice($json.item.count > 1 ? 1 : 2) }}',
	'={{ $json.item.name.slice($json.item.name.trim().length) }}',
	// chunk structures
	'={{ $json.item.name }}',
	'={{ $json.item.name }}{{ $json.item.count }}',
	'=text {{ $json.item.name }} tail',
];

describe('native evaluation corpus coverage', () => {
	test('every grammar-eligible shape feature is exercised by the parity corpus', () => {
		const corpus = ALL_CORPORA;

		const covered = new Set<string>();
		for (const entry of corpus) {
			if (!entry.startsWith('=')) continue;
			const stripped = entry.slice(1);
			try {
				if (!isNativelyEvaluable(stripped)) continue;
			} catch {
				continue;
			}
			const feats = featuresOf(stripped);
			if (feats) for (const feat of feats) covered.add(feat);
		}

		// Catalog drift: a candidate that left the grammar means the catalog
		// needs updating, not the corpus.
		const ineligible = CANDIDATES.filter((c) => {
			try {
				return !isNativelyEvaluable(c.slice(1));
			} catch {
				return true;
			}
		});
		expect(ineligible).toEqual([]);

		const gaps = new Map<string, string>();
		for (const candidate of CANDIDATES) {
			const feats = featuresOf(candidate.slice(1));
			if (!feats) continue;
			for (const feat of feats) {
				if (!covered.has(feat) && !gaps.has(feat)) gaps.set(feat, candidate);
			}
		}

		if (gaps.size > 0) {
			throw new Error(
				`The parity corpus does not exercise ${gaps.size} grammar-eligible shape feature(s). ` +
					'Add a corpus entry for each (HANDLED, or RUNTIME_BAILOUT / DECLINED as appropriate):\n' +
					[...gaps.entries()].map(([feat, example]) => `  ${feat}  e.g. ${example}`).join('\n'),
			);
		}
	});
});
