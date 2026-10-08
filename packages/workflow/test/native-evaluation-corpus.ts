// Parity corpus for fast native expression evaluation.
//
// Every expression in HANDLED_CORPUS must (a) fit the native subset and (b)
// produce exactly the same value natively as through the regular pipeline.
// The file runs once per engine project (legacy, vm, quickjs - see
// vitest.config.ts), so native evaluation is pinned against all three
// engines.
//
// Every expression in DECLINED_CORPUS must be outside the subset so it takes
// the engine untouched. Every expression in RUNTIME_BAILOUT_CORPUS fits the
// subset but meets a runtime value the parse could not see, and must bail to
// the engine with the engine's result coming back unchanged.
//
// The arrays live in this module so native-evaluation-corpus-coverage.test.ts
// can check that every grammar-eligible shape feature appears in one of them.

export const HANDLED_CORPUS: string[] = [
	'={{ $json.item.name }}',
	"={{ $json.item.name !== 'foo' }}",
	"={{ $json.item.my_object.addresses.primary ?? 'no address' }}",
	"={{ $json.item.missing ?? 'fallback' }}",
	'={{ $json.item.missing.deep }}',
	'={{ $json.item.names[0] }}',
	'={{ $json.item.count + 1 }}',
	"={{ $json.item.count > 1 ? 'many' : 'one' }}",
	'={{ $json.item.active && $json.item.name }}',
	'={{ $json.item.disabled || $json.item.count }}',
	'={{ !$json.item.active }}',
	'={{ !$json.item.my_object }}',
	'={{ -$json.item.count }}',
	"={{ 'a' + 'b' }}",
	'={{ 5 }}',
	'={{ null }}',
	'={{ undefined }}',
	'={{ $json.item.nothing }}',
	'={{ $json.item.my_object }}',
	'={{ $json.item.names }}',
	'={{ $json.item.my_object?.addresses?.primary }}',
	'={{ $json.item.missing?.deep }}',
	// A missing optional hop short-circuits the whole chain, so the enclosing
	// fallback still applies. Parentheses end the chain: the outer read throws.
	'={{ $json.item.missing?.deep.deeper ?? true }}',
	"={{ $json.item.missing?.deep.deeper.toUpperCase() || 'fallback' }}",
	'={{ ($json.item.missing?.deep).deeper ?? true }}',
	'={{ $json.item.my_object?.addresses.primary ?? true }}',
	'={{ $json.item.name.length }}',
	'={{ $parameter["value1"] }}',
	"={{ $parameter['missing'] || 'GET' }}",
	// value2 is itself an expression: the $parameter proxy resolves it by
	// re-entering resolveSimpleParameterValue (natively again when enabled).
	'={{ $parameter.value2 }}',
	// value3 is an expression outside the subset: the nested resolution takes
	// the engine while the outer expression stays native.
	'={{ $parameter.value3 }}',
	'=Name: {{ $json.item.name }}!',
	'=({{ $json.item.nothing }})',
	'=count: {{ $json.item.count }} / {{ $json.item.count + 1 }}',
	"=zero: {{ 0 }} false: {{ false }} empty: {{ '' }}",
	'=plain text',
	'=',
	// Allowlisted String.prototype methods on a runtime-verified string
	// receiver. A literal `$` in a replacement is not a context token.
	"={{ $json.item.name.replace('o', '$') }}",
	"={{ $json.item.name.replaceAll('o', '$$') }}",
	"={{ $json.item.name.replace('o', '$1') }}",
	"={{ $json.item.name.replace('o', '$$&') }}",
	"={{ $json.item.name.toUpperCase() === 'FOO' }}",
	'={{ $json.item.name.toLowerCase() }}',
	"={{ $json.item.name.includes('oo') }}",
	"={{ $json.item.name.startsWith('f') && $json.item.name.endsWith('o') }}",
	'={{ $json.item.name.slice(1, 2) }}',
	"={{ $json.item.name.indexOf('o') }}",
	'={{ $json.item.name.trim().toUpperCase() }}',
	'={{ $json.item.missing?.toUpperCase() }}',
	'={{ $json.item.nothing.toUpperCase() }}',
	"={{ $json.item.name.replace('f', 'b') }}",
	"={{ $json.item.name.replaceAll('o', '0') }}",
	'={{ $json.item.count.toFixed(2) }}',
	'={{ $json.item.count.toString() }}',
	'={{ $json.item.count.toPrecision(3) }}',
	"={{ $json.item.names.includes('bar') }}",
	"={{ $json.item.names.indexOf('baz') }}",
	"={{ $json.item.names.join(', ') }}",
	'={{ $json.item.names.slice(0, 1) }}',
	'={{ $json.item.names.at(-1) }}',
	'={{ $json.item.names.toSorted() }}',
	"={{ $json.item.names.toReversed().join('-') }}",
	"={{ $json.item.names.concat('qux') }}",
	'={{ $json.item.names.concat($json.item.names) }}',
	'={{ $json.item.names.flat() }}',
	'={{ $json.item.names.flat(2) }}',
	// Binary operators beyond the exercised ===, !==, > and +, including
	// the coercion-sensitive loose equality.
	'={{ $json.item.count == "2" }}',
	'={{ $json.item.count != "2" }}',
	'={{ $json.item.count < 3 }}',
	'={{ $json.item.count <= 2 }}',
	'={{ $json.item.count >= 2 }}',
	'={{ $json.item.count - 1 }}',
	'={{ $json.item.count * 2 }}',
	'={{ $json.item.count / 2 }}',
	'={{ $json.item.count % 2 }}',
	// Unary + (the coercion counterpart of the exercised unary -).
	'={{ +$json.item.count }}',
	'={{ +true }}',
	// Allowlisted methods no other entry exercises.
	'={{ $json.item.name.trimStart() }}',
	'={{ $json.item.name.trimEnd() }}',
	'={{ $json.item.name.charAt(1) }}',
	'={{ $json.item.name.charAt() }}',
	'={{ $json.item.names.lastIndexOf("baz") }}',
	// Argument-count variants: default separators and replacements, radixes,
	// fromIndex positions, and an extra argument the method ignores.
	'={{ $json.item.names.join() }}',
	'={{ $json.item.names.concat() }}',
	"={{ $json.item.name.replace('o') }}",
	'={{ $json.item.count.toFixed() }}',
	'={{ $json.item.count.toPrecision() }}',
	'={{ $json.item.count.toString(2) }}',
	"={{ $json.item.name.includes('o', 1) }}",
	"={{ $json.item.name.indexOf('o', 1) }}",
	"={{ $json.item.name.startsWith('o', 1) }}",
	"={{ $json.item.name.endsWith('o', 2) }}",
	'={{ $json.item.name.toUpperCase($json.item.count) }}',
	// Optional-call form (`?.()` marks the call, not the member).
	'={{ $json.item.name.toUpperCase?.() }}',
	// Optional computed members (`?.[...]`).
	"={{ $json.item?.['name'] }}",
	'={{ $json.item.names?.[0] }}',
	// Numeric literal forms beyond plain integers.
	'={{ 0x10 }}',
	'={{ 0o17 }}',
	'={{ 0b101 }}',
	'={{ 1e3 }}',
	'={{ 0.5 }}',
	'={{ 1_000 }}',
	// A string literal with an escape sequence. One case by design: it
	// exercises esprima's decoding more than this module.
	'={{ $json.item["\\u006eame"] }}',
	// A parenthesized subexpression in a compound position.
	'={{ ($json.item.count + 1) * 2 }}',
	// Adjacent code chunks with no text between them.
	'={{ $json.item.name }}{{ $json.item.count }}',
	// Compound shapes: logical and ternary over call results, call arguments
	// that are themselves compound, cross-type chains, member on a call.
	"={{ $json.item.name.includes('o') && $json.item.count }}",
	"={{ $json.item.name.startsWith('f') ? 'yes' : 'no' }}",
	'={{ $json.item.name.slice($json.item.count + 1) }}',
	'={{ $json.item.name.slice($json.item.count > 1 ? 1 : 2) }}',
	'={{ $json.item.name.slice($json.item.name.trim().length) }}',
	'={{ $json.item.name.slice(0, 2).toUpperCase() }}',
	"={{ $json.item.names.slice(0, 1).join(',') }}",
	'={{ $json.item.name.toUpperCase().length }}',
	'={{ $json.item.nothing ?? $json.item.name }}',
	// Argument defaults that change the value but stay under the size limit:
	// a missing replacement inserts "undefined", a null separator joins with
	// "null".
	"={{ $json.item.big.replaceAll('y') }}",
	'={{ $json.item.manyEmpty.join(null) }}',
	// Data roots beyond $json/$parameter. $binary is the proxy's stripped
	// view, so a whole-value read and a leaf read both stay native.
	'={{ $itemIndex }}',
	'={{ $runIndex + 1 }}',
	'={{ $vars.region }}',
	"={{ $vars.missing ?? 'default' }}",
	'={{ $binary }}',
	'={{ $binary.file.fileName }}',
	'={{ $binary.file.data }}',
	"={{ $binary.missing?.fileName ?? 'none' }}",
	// Node references through the host proxy: paired item, first/last/all,
	// the legacy item-level form, and $input.
	'={{ $("Source").item.json.item.name }}',
	"={{ $('Source').item.json.item.count + 1 }}",
	"={{ $('Source').item.binary.file.fileName }}",
	"={{ $('Source').first().json.item.name }}",
	"={{ $('Source').last().json.item.names[0] }}",
	"={{ $('Source').all().length }}",
	"={{ $('Source').all()[0].json.item.name }}",
	"={{ $('Source').item.json.item.missing ?? 'fallback' }}",
	"={{ $('Source').first()?.json.item.name }}",
	"=Name: {{ $('Source').item.json.item.name }}",
	'={{ $node["Source"].json["item"]["name"] }}',
	"={{ $node['Source'].json.item.count }}",
	'={{ $node.Source.json.item.name }}',
	'={{ $node["Source"].binary.file.mimeType }}',
	'={{ $input.item.json.item.name }}',
	'={{ $input.first().json.item.name }}',
	'={{ $input.last().json.item.count }}',
	'={{ $input.all().length }}',
	'={{ $input.all()[0].json.item.name }}',
	// Array literals of literals, standing alone or as a receiver.
	'={{ [1, 2, 3] }}',
	"={{ ['a', 2, true, null] }}",
	'={{ [] }}',
	'={{ [].length }}',
	"={{ ['bar', 'qux'].includes($json.item.name) }}",
	'={{ [1, 2].indexOf($json.item.count) }}',
	// Callbacks: one parameter, an expression body in the same subset. The
	// body sees the roots too, and the parameter name is free (`item` is
	// not a root).
	"={{ $json.item.names.filter((n) => n.includes('bar')) }}",
	"={{ $json.item.names.some(n => n.startsWith('b')) }}",
	'={{ $json.item.names.every(n => n.length === 3) }}',
	"={{ $json.item.names.find(n => n === 'baz') }}",
	"={{ $json.item.names.find(n => n === 'nope') }}",
	'={{ $json.item.names.map(n => n.toUpperCase()) }}',
	'={{ $json.item.names.map(n => n.length) }}',
	'={{ $json.item.names.map(n => $json.item.count) }}',
	'={{ $json.item.names.map(item => item) }}',
	'={{ $json.item.names.map($n => $json.item.name + $n) }}',
	// value2 is itself an expression; the body reads it once per evaluation.
	'={{ $json.item.names.some(n => n === $parameter.value2) }}',
	'={{ $json.item.names.map(n => $parameter.value2 + n) }}',
	"={{ $json.item.names.filter(n => n.startsWith('b')).map(n => n.toUpperCase()).join(', ') }}",
	'={{ $input.all().map(i => i.json.item.name) }}',
	'={{ $input.all().filter(i => i.json.item.count > 1).length }}',
	"={{ $('Source').all().some(i => i.json.item.active) }}",
	"={{ $json.item.names.map(n => n.missing?.deep ?? 'd') }}",
	'={{ $json.item.missing?.map(n => n) }}',
	'={{ $json.item.names?.map(n => n) }}',
	"={{ [1, 'a'].map(x => x + 1) }}",
	// Empty receivers. (Sparse ones are pinned per engine in the parity test.)
	'={{ $json.item.empty.some(n => true) }}',
	'={{ $json.item.empty.every(n => false) }}',
	'={{ $json.item.empty.map(n => n) }}',
	'={{ [].find(n => true) }}',
	// A body that throws mid-iteration: tournament swallows the TypeError on
	// both paths, so the chunk yields undefined.
	'={{ $json.item.names.filter(n => n.missing.deep) }}',
	// Short-circuiting methods stop before the step budget does.
	'={{ $json.item.manyZeros.some(n => n === 0) }}',
	'={{ $json.item.names.map(n => $json.item.filler).length }}',
	// The Internal only-run-if that moved callbacks into Foundation (CAT-4698).
	"={{ !!($json.body?.data?.identifiers?.id) && ['research', 'interview', 'survey'].some(s => ($json.body?.data?.subject ?? '').toLowerCase().includes(s)) }}",
	"={{ !!($json.item.my_object?.addresses?.primary) && ['main', 'elm'].some(s => ($json.item.my_object?.addresses?.primary ?? '').toLowerCase().includes(s)) }}",
];

// Fits the subset, but a runtime value falls outside what the parse proved:
// evaluation bails and the engine result must come back unchanged.
export const RUNTIME_BAILOUT_CORPUS: string[] = [
	// Allowlisted method on a receiver of another type.
	'={{ $json.item.count.toUpperCase() }}',
	'={{ $json.item.name.toFixed(1) }}',
	"={{ $json.item.my_object.includes('x') }}",
	// Operators on object operands: the engine compares and coerces copies.
	"={{ $json.item.my_object + '' }}",
	'={{ $json.item.names === $json.item.names }}',
	'={{ -$json.item.names }}',
	'=Name: {{ $json.item.my_object }}',
	// A result above MAX_RESULT_LENGTH goes to the engine's limits, whether
	// it shows in the result or in the pre-flight bound.
	"={{ $json.item.name.replaceAll('', $json.item.filler).replaceAll('', $json.item.filler).replaceAll('', $json.item.filler) }}",
	"={{ $json.item.big.replaceAll('', $json.item.filler) }}",
	// `$\`` splices the text before each match into the result, for a single
	// replacement as much as for every one.
	"={{ $json.item.name.replaceAll('o', '$`') }}",
	"={{ $json.item.name.replace('o', '$`') }}",
	"={{ $json.item.name.replace('o', '$$$&') }}",
	// A receiver above MAX_RESULT_LENGTH is the engine's work, whatever the
	// method. (concat is bounded the same way, by receiver plus arguments; a
	// corpus entry would make quickjs marshal a million-element result.)
	'={{ $json.item.huge.toUpperCase() }}',
	'={{ $json.item.huge.slice(0, 1) }}',
	'={{ $json.item.hugeArr.at(0) }}',
	// join('') is bounded by the elements, not the separator.
	"={{ $json.item.manyBig.join('') }}",
	// Several chunks obey the same limit as one.
	'={{ $json.item.bigger }}{{ $json.item.bigger }}{{ $json.item.bigger }}{{ $json.item.bigger }}{{ $json.item.bigger }}{{ $json.item.bigger }}{{ $json.item.bigger }}',
	"={{ $json.item.bigger.replaceAll('y') }}",
	'={{ $json.item.manyEmpty.join($json.item.filler) }}',
	// Object arguments to string methods coerce on the host where the isolates
	// see a copy; the engine owns them.
	"={{ $json.item.name.replace($json.item.re, 'X') }}",
	'={{ $json.item.name.includes($json.item.re) }}',
	'={{ $json.item.name.slice($json.item.my_object) }}',
	// Object arguments to array methods: coercion hooks, or a live-reference
	// comparison where the isolate compares copies.
	'={{ $json.item.names.includes($json.item.my_object) }}',
	'={{ $json.item.names.concat($json.item.my_object) }}',
	'={{ $json.item.names.slice($json.item.my_object) }}',
	// Items are objects: an operator on one hands off like any object operand.
	"={{ $('Source').item === $input.item }}",
	"=item: {{ $('Source').item }}",
	// Iterators need a real array receiver without an own property of the
	// same name.
	'={{ $json.item.name.some(s => s) }}',
	'={{ $json.item.my_object.map(x => x) }}',
	'={{ $json.item.count.filter(x => x) }}',
	// A body that bails mid-iteration bails the whole expression.
	'={{ $json.item.mixed.map(n => n.toUpperCase()) }}',
	// Past the step budget, the engine runs the loop.
	'={{ $json.item.manyZeros.every(n => n === 0) }}',
	'={{ $json.item.manyZeros.map(n => n) }}',
	// map is bounded by the content it produces, not the element count.
	'={{ $json.item.manyEmpty.map(s => $json.item.filler) }}',
];

export const DECLINED_CORPUS: string[] = [
	// BigInt literals are not part of the subset.
	'={{ 1n }}',
	// Node references stand only under .item / first() / last() / all() (or
	// .json / .binary for the legacy form): bare references, other members,
	// arguments, dynamic names and other roots stay on the engine.
	"={{ $('Source') }}",
	'={{ $input }}',
	'={{ $node["Source"] }}',
	"={{ $('Source') ?? 'x' }}",
	"={{ $('Source').params }}",
	"={{ $('Source').context.counter }}",
	"={{ $('Source').isExecuted }}",
	"={{ $('Source').itemMatching(0) }}",
	"={{ $('Source').pairedItem }}",
	"={{ $('Source').first(1) }}",
	"={{ $('Source').all(0, 0) }}",
	"={{ $('Source').item() }}",
	"={{ $('Source', true).item }}",
	'={{ $() }}',
	'={{ $($json.item.name).item.json }}',
	'={{ $(name).item.json }}',
	'={{ $(`Source`).item.json }}',
	'={{ $node[$json.item.name].json }}',
	'={{ $node[name].json }}',
	'={{ $node[`Source`].json }}',
	"={{ $node?.['Source'].json }}",
	'={{ $node["Source"].parameter }}',
	'={{ $node["Source"].runIndex }}',
	'={{ $node["Source"].context }}',
	'={{ $node["Source"].first() }}',
	'={{ $input.params }}',
	'={{ $input.first().json.item.names.first() }}',
	"={{ $('__proto__').item.json }}",
	'={{ $node.constructor.json }}',
	// Roots outside the data set.
	'={{ $now }}',
	'={{ $today }}',
	'={{ $env.HOME }}',
	'={{ $execution.id }}',
	'={{ $prevNode.name }}',
	'={{ $workflow.id }}',
	'={{ $position }}',
	'={{ $items() }}',
	'={{ $item(0).$json.item.name }}',
	'={{ $json.item.names.first() }}',
	'={{ Object.keys($json.item) }}',
	'={{ $json.item[$json.item.name] }}',
	"={{ $json.item['__proto__'] }}",
	'={{ $json.item.name.constructor }}',
	// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string
	'={{ `hi ${$json.item.name}` }}',
	'={{ /foo/.test($json.item.name) }}',
	'={{ (function () { return 1 })() }}',
	'={{ { a: 1 } }}',
	// Array literals hold literals only.
	'={{ [1, $json.item.count] }}',
	'={{ [[1]] }}',
	'={{ [-1] }}',
	'={{ [1, , 3] }}',
	'={{ [...$json.item.names] }}',
	'={{ [{ a: 1 }] }}',
	'={{ [1n] }}',
	'={{ [/x/] }}',
	// Callbacks: exactly one arrow function with one plain identifier
	// parameter and an expression body, on the five iterator methods only.
	'={{ $json.item.names.some() }}',
	'={{ $json.item.names.some(n => n, $json.item) }}',
	'={{ $json.item.names.some((a, b) => a) }}',
	'={{ $json.item.names.some(() => true) }}',
	'={{ $json.item.names.some(n => { return n }) }}',
	'={{ $json.item.names.some(function (n) { return n }) }}',
	'={{ $json.item.names.some(async n => n) }}',
	'={{ $json.item.names.some((n = 1) => n) }}',
	'={{ $json.item.names.some(({ length }) => length) }}',
	'={{ $json.item.names.some(([n]) => n) }}',
	'={{ $json.item.names.some((...n) => n) }}',
	'={{ $json.item.names.some(n => this) }}',
	'={{ $json.item.names.some(n => $json.item.names.some(m => m === n)) }}',
	'={{ $json.item.names.some(n => true) && n }}',
	'={{ $json.item.names.some($json => $json) }}',
	'={{ $json.item.names.some($input => $input) }}',
	'={{ $json.item.names.some($ => $) }}',
	'={{ $json.item.names.some(undefined => undefined) }}',
	'={{ $json.item.names.some(__proto__ => 1) }}',
	'={{ $json.item.names.some(constructor => 1) }}',
	'={{ $json.item.names.some(n => n.first()) }}',
	// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string
	'={{ $json.item.names.some(n => `${n}`) }}',
	'={{ $json.item.names.reduce((a, b) => a + b) }}',
	'={{ $json.item.names.forEach(n => n) }}',
	'={{ $json.item.names.flatMap(n => n) }}',
	'={{ $json.item.names.findIndex(n => n) }}',
	'={{ $json.item.names.findLast(n => n) }}',
	"={{ $json.item.names['some'](n => n) }}",
	// Extension methods and non-allowlisted natives stay on the engine.
	'={{ $json.item.name.isEmpty() }}',
	'={{ $json.item.name.hash() }}',
	'={{ $json.item.name.padStart(8) }}',
	// sort()/fill() mutate the receiver in place; only immutable variants are
	// allowlisted. A callback makes any call non-simple.
	'={{ $json.item.names.sort() }}',
	"={{ $json.item.names.fill('x') }}",
	'={{ $json.item.names.toSorted((a, b) => a.length - b.length) }}',
	// Iterator-returning methods have no engine-equivalent value.
	'={{ $json.item.names.entries() }}',
	'={{ $json.item.names.values() }}',
	'={{ $json.item.names.keys() }}',
	"={{ $json.item.name['toUpperCase']() }}",
	// A computed key on a call declines for node references too.
	"={{ $input['first']().json.item.name }}",
	"={{ $input['all']().length }}",
	'={{ $json.item.name.toUpperCase($json.item[$json.item.name]) }}',
	// Syntax errors go to the engine for its error reporting.
	'={{ $json.item. }}',
	// Deep enough to overflow the recursive re-parse: declined, never thrown.
	`={{ $json${'.a'.repeat(5000)} }}`,
];

// Both paths must throw the same error.
export const ERROR_CORPUS: string[] = [
	'={{ $json.item.name }}',
	'=Name: {{ $json.item.name }}',
	'={{ $parameter.value2 }}',
	'={{ $binary.file.fileName }}',
	"={{ $('Source').item.json.item.name }}",
	'={{ $node["Source"].json.item.name }}',
	'={{ $input.item.json.item.name }}',
	'={{ $input.all().length }}',
];

// Function and symbol values hand the expression to the engine, so the
// outcome is whatever the configured engine does: legacy throws for a
// function, the isolates drop a nested one and fail on an inherited one.
// Compared as values or as errors, whichever the engine produces.
export const ENGINE_DECIDED_CORPUS: string[] = [
	'={{ $json.item.fn }}',
	'={{ $json.item.sym }}',
	'={{ $json.hasOwnProperty }}',
	'={{ $json.toString }}',
	'={{ $json.item.valueOf }}',
];

export const ALL_CORPORA: string[] = [
	...HANDLED_CORPUS,
	...RUNTIME_BAILOUT_CORPUS,
	...DECLINED_CORPUS,
	...ERROR_CORPUS,
	...ENGINE_DECIDED_CORPUS,
];
