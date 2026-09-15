import { getParsedExpression } from '@n8n/tournament';

import { ExpressionExtensionError } from '../errors/expression-extension.error';
import { ExpressionError } from '../errors/expression.error';
import type { IWorkflowDataProxyData } from '../interfaces';
import { isSafeObjectProperty } from '../utils';

// POC: a native fast path for provably-simple expressions.
//
// An expression is "simple" when every code chunk is built only from data
// path traversal, literals, a fixed set of operators, and calls to a closed
// allowlist of native string/number/array methods. Such expressions cannot
// loop, reach prototypes, or touch anything outside the data proxy, so they
// are interpreted host-side without the sandbox
// AST hooks, the global-context setup, or an engine (isolate) evaluation.
// Anything not positively proven simple is declined and falls through to
// the regular pipeline.
//
// Structure follows "parse, don't validate": the esprima AST is not
// classified in place, it is re-parsed into the closed {@link SimpleNode}
// grammar below. Construction either yields a node of that grammar or null;
// the interpreter only ever sees objects this module built, so it cannot
// read a field the parser did not put there, and unsupported constructs are
// unrepresentable rather than rejected.
//
// TODO(POC): promote the enable flag to ExpressionEngineConfig in @n8n/config.
export const isSimpleExpressionPathEnabled = () =>
	typeof process !== 'undefined' && process.env.N8N_EXPRESSION_SIMPLE_PATH === 'true';

const BINARY_OPS = [
	'===',
	'!==',
	'==',
	'!=',
	'<',
	'<=',
	'>',
	'>=',
	'+',
	'-',
	'*',
	'/',
	'%',
] as const;
const LOGICAL_OPS = ['&&', '||', '??'] as const;
const UNARY_OPS = ['!', '-', '+'] as const;

type BinaryOp = (typeof BINARY_OPS)[number];
type LogicalOp = (typeof LOGICAL_OPS)[number];
type UnaryOp = (typeof UNARY_OPS)[number];

// The safe grammar. Closed: nothing outside it is representable, so nothing
// outside it can reach the interpreter. `kind` (not esprima's `type`) is the
// discriminant, so a raw AST node can never be mistaken for a SimpleNode.
type SimpleNode =
	| { kind: 'literal'; value: string | number | boolean | null }
	| { kind: 'root'; name: '$json' | '$parameter' }
	| { kind: 'undefined' }
	| { kind: 'member'; object: SimpleNode; key: string | number; optional: boolean }
	| { kind: 'unary'; op: UnaryOp; argument: SimpleNode }
	| { kind: 'binary'; op: BinaryOp; left: SimpleNode; right: SimpleNode }
	| { kind: 'logical'; op: LogicalOp; left: SimpleNode; right: SimpleNode }
	| { kind: 'conditional'; test: SimpleNode; consequent: SimpleNode; alternate: SimpleNode }
	| { kind: 'call'; receiver: SimpleNode; method: string; args: SimpleNode[]; optional: boolean };

// TODO(POC): extend to $binary, $itemIndex, $runIndex, $vars — each needs a
// semantics check against the data proxy first. $now/$today are excluded on
// purpose: they are Luxon DateTimes whose methods would make every useful
// expression on them a CallExpression anyway.
//
// Note on $parameter: the proxy resolves nested `=` parameter values by
// re-entering resolveSimpleParameterValue — a nested non-simple value simply
// takes the engine path there (under lazy acquisition, creating the bridge on
// demand).
// (Supported roots are the literal comparisons in parseIdentifier.)

// Native prototype methods callable on a receiver of the matching type.
// Every name here must stay disjoint from the expression-extension method
// names (extendSyntax rewrites extension calls into `extend()` dispatch;
// natives pass through untouched) — pinned by a test in the parity corpus.
// The receiver's type is only known at runtime: a receiver whose type has no
// allowlist entry for the method makes the evaluation bail to the engine
// (EngineFallbackError below). Callback-taking forms (regex/function args,
// array callbacks) are unrepresentable: those argument nodes decline parsing.
const STRING_METHODS = new Set([
	'toUpperCase',
	'toLowerCase',
	'trim',
	'trimStart',
	'trimEnd',
	'includes',
	'startsWith',
	'endsWith',
	'slice',
	'indexOf',
	'charAt',
	'replace',
	'replaceAll',
]);
const NUMBER_METHODS = new Set(['toFixed', 'toPrecision', 'toString']);
// Non-mutating methods only: the fast path's receiver is the live workflow
// data (the vm engine evaluates a copy inside the isolate), so an in-place
// mutator like sort()/reverse()/fill() would corrupt execution data as a
// side effect. Use the toSorted()/toReversed() immutable variants instead.
// Iterator-returning methods (entries/values/keys) are also excluded: a live
// iterator has no equivalent representation across the engine boundary.
const ARRAY_METHODS = new Set([
	'includes',
	'indexOf',
	'lastIndexOf',
	'join',
	'slice',
	'at',
	'concat',
	'flat',
	'toSorted',
	'toReversed',
]);

export const CALLABLE_METHODS = new Set([...STRING_METHODS, ...NUMBER_METHODS, ...ARRAY_METHODS]);

const isObj = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

const isOneOf = <T extends string>(ops: readonly T[], op: unknown): op is T =>
	typeof op === 'string' && (ops as readonly string[]).includes(op);

// ── Parsing: untrusted esprima output → the safe grammar, or null. ─────────
//
// Total (never throws), constructive (returns new objects; the esprima node
// is read and dropped, so no unvetted field survives), and recursive (one
// unsupported leaf makes the whole expression decline).

function parseLiteral(node: Record<string, unknown>): SimpleNode | null {
	// Regex literals stay on the engine (backtracking blowup has no isolate
	// timeout here).
	if ('regex' in node && node.regex) return null;
	const value = node.value;
	if (
		value === null ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	)
		return { kind: 'literal', value };
	return null;
}

function parseIdentifier(node: Record<string, unknown>): SimpleNode | null {
	if (node.name === '$json' || node.name === '$parameter') {
		return { kind: 'root', name: node.name };
	}
	if (node.name === 'undefined') return { kind: 'undefined' };
	return null;
}

// Only static keys are representable. Dynamic keys ($json[$json.key]) need
// the sandbox's PrototypeSanitizer, so they stay on the engine. String keys
// are vetted at parse time (isSafeObjectProperty), which keeps prototype
// names unrepresentable. (Danny's own-property-only lookup would make that
// vetting unnecessary, but $json/$parameter are get-trap proxies for which
// Object.hasOwn misreports every key, so the parse-time vet is the boundary.)
function parseMember(node: Record<string, unknown>): SimpleNode | null {
	const object = parseSimple(node.object);
	if (object === null) return null;
	const property = node.property;
	if (!isObj(property)) return null;

	let key: string | number;
	if (node.computed === true) {
		if (property.type !== 'Literal') return null;
		const value = property.value;
		if (typeof value === 'number') key = value;
		else if (typeof value === 'string' && isSafeObjectProperty(value)) key = value;
		else return null;
	} else {
		if (
			property.type !== 'Identifier' ||
			typeof property.name !== 'string' ||
			!isSafeObjectProperty(property.name)
		)
			return null;
		key = property.name;
	}

	return { kind: 'member', object, key, optional: node.optional === true };
}

function parseCall(node: Record<string, unknown>): SimpleNode | null {
	const callee = node.callee;
	if (!isObj(callee) || callee.type !== 'MemberExpression' || callee.computed === true) return null;
	const property = callee.property;
	if (
		!isObj(property) ||
		property.type !== 'Identifier' ||
		typeof property.name !== 'string' ||
		!CALLABLE_METHODS.has(property.name)
	)
		return null;
	const receiver = parseSimple(callee.object);
	if (receiver === null) return null;
	if (!Array.isArray(node.arguments)) return null;
	const args: SimpleNode[] = [];
	for (const argument of node.arguments) {
		const parsed = parseSimple(argument);
		if (parsed === null) return null;
		args.push(parsed);
	}
	// `a?.m()` marks the member optional, `a.m?.()` marks the call optional;
	// both short-circuit on a missing receiver, so one flag carries both.
	return {
		kind: 'call',
		receiver,
		method: property.name,
		args,
		optional: node.optional === true || callee.optional === true,
	};
}

function parseBranches(node: Record<string, unknown>): SimpleNode | null {
	const test = parseSimple(node.test);
	const consequent = parseSimple(node.consequent);
	const alternate = parseSimple(node.alternate);
	if (test === null || consequent === null || alternate === null) return null;
	return { kind: 'conditional', test, consequent, alternate };
}

function parseSimple(node: unknown): SimpleNode | null {
	if (!isObj(node)) return null;
	switch (node.type) {
		case 'Literal':
			return parseLiteral(node);
		case 'Identifier':
			return parseIdentifier(node);
		case 'MemberExpression':
			return parseMember(node);
		case 'ChainExpression':
			// Optionality is carried per member/call node, so the wrapper is
			// transparent in the grammar.
			return parseSimple(node.expression);
		case 'UnaryExpression': {
			if (node.prefix !== true || !isOneOf(UNARY_OPS, node.operator)) return null;
			const argument = parseSimple(node.argument);
			return argument === null ? null : { kind: 'unary', op: node.operator, argument };
		}
		case 'BinaryExpression': {
			if (!isOneOf(BINARY_OPS, node.operator)) return null;
			const left = parseSimple(node.left);
			const right = parseSimple(node.right);
			if (left === null || right === null) return null;
			return { kind: 'binary', op: node.operator, left, right };
		}
		case 'LogicalExpression': {
			if (!isOneOf(LOGICAL_OPS, node.operator)) return null;
			const left = parseSimple(node.left);
			const right = parseSimple(node.right);
			if (left === null || right === null) return null;
			return { kind: 'logical', op: node.operator, left, right };
		}
		case 'ConditionalExpression':
			return parseBranches(node);
		case 'CallExpression':
			return parseCall(node);
		default:
			// TODO(POC): tier 2 — CallExpression on a closed list of array
			// methods (filter/sort/map) whose callbacks are parsed by this
			// same restricted grammar under a step budget. Declined for now.
			return null;
	}
}

// ── Evaluation: total over the grammar. ────────────────────────────────────
//
// evalNode reads only fields parseSimple constructed, because those are the
// only fields that exist. The switch has no default branch: adding a kind to
// the grammar stops compilation until it is handled here.

// Thrown when a runtime value falls outside what parsing proved statically
// (e.g. a whitelisted string method called on a non-string receiver, where
// extensions could apply). The whole evaluation is abandoned and the caller
// re-runs the expression through the regular engine pipeline.
class EngineFallbackError extends Error {}

// ponytail: predicate lies for primitives, but JS property lookup on a
// non-nullish primitive is well-defined and side-effect free.
const isIndexable = (value: unknown): value is Record<string | number, unknown> =>
	value !== null && value !== undefined;

// Operand casts are intentional: the fast path must reproduce JS coercion
// semantics exactly (parity with the engines), not re-implement them.
/* eslint-disable @typescript-eslint/no-explicit-any */
const binaryOps: Record<BinaryOp, (l: any, r: any) => unknown> = {
	'===': (l, r) => l === r,
	'!==': (l, r) => l !== r,
	// eslint-disable-next-line eqeqeq
	'==': (l, r) => l == r,
	// eslint-disable-next-line eqeqeq
	'!=': (l, r) => l != r,
	'<': (l, r) => l < r,
	'<=': (l, r) => l <= r,
	'>': (l, r) => l > r,
	'>=': (l, r) => l >= r,
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	'+': (l, r) => l + r,
	'-': (l, r) => l - r,
	'*': (l, r) => l * r,
	'/': (l, r) => l / r,
	'%': (l, r) => l % r,
};
/* eslint-enable @typescript-eslint/no-explicit-any */

function evalMember(
	node: Extract<SimpleNode, { kind: 'member' }>,
	data: IWorkflowDataProxyData,
): unknown {
	const object = evalNode(node.object, data);
	// ponytail: per-node optional check instead of full chain short-circuiting.
	// Behaviour-equivalent here because keys are static (no side effects to
	// skip) and the chunk-level catch maps the resulting TypeError to the same
	// observable value the engine produces.
	if (node.optional && (object === null || object === undefined)) return undefined;
	if (!isIndexable(object)) {
		throw new TypeError(`Cannot read properties of ${String(object)} (reading '${node.key}')`);
	}
	const value = object[node.key];
	// Never surface functions: matches the VM bridge, whose getValueAtPath
	// returns undefined for function-typed values. (The legacy engine returns
	// the function and the caller throws "this is a function" — a pre-existing
	// engine divergence; we side with the default engine.)
	return typeof value === 'function' ? undefined : value;
}

function evalCall(
	node: Extract<SimpleNode, { kind: 'call' }>,
	data: IWorkflowDataProxyData,
): unknown {
	const receiver = evalNode(node.receiver, data);
	const receiverMissing = receiver === null || receiver === undefined;
	if (node.optional && receiverMissing) return undefined;
	if (receiverMissing) {
		throw new TypeError(`Cannot read properties of ${String(receiver)} (reading '${node.method}')`);
	}
	// Parsing only proves the method name; the receiver's type is data. A
	// receiver whose type has no allowlist entry for the method could be
	// intercepted by extensions, so hand the whole expression to the engine.
	let proto: object;
	if (typeof receiver === 'string' && STRING_METHODS.has(node.method)) proto = String.prototype;
	else if (typeof receiver === 'number' && NUMBER_METHODS.has(node.method))
		proto = Number.prototype;
	else if (Array.isArray(receiver) && ARRAY_METHODS.has(node.method)) proto = Array.prototype;
	else throw new EngineFallbackError();
	const method: unknown = Reflect.get(proto, node.method);
	if (typeof method !== 'function') throw new EngineFallbackError();
	const args = node.args.map((argument) => evalNode(argument, data));
	return method.apply(receiver, args) as unknown;
}

function evalNode(node: SimpleNode, data: IWorkflowDataProxyData): unknown {
	switch (node.kind) {
		case 'literal':
			return node.value;
		case 'root':
			return node.name === '$json' ? data.$json : data.$parameter;
		case 'undefined':
			return undefined;
		case 'member':
			return evalMember(node, data);
		case 'unary': {
			const argument = evalNode(node.argument, data);
			if (node.op === '!') return !argument;
			if (node.op === '-') return -Number(argument);
			return Number(argument);
		}
		case 'binary':
			return binaryOps[node.op](evalNode(node.left, data), evalNode(node.right, data));
		case 'logical': {
			const left = evalNode(node.left, data);
			if (node.op === '&&') return left ? evalNode(node.right, data) : left;
			if (node.op === '||') return left ? left : evalNode(node.right, data);
			// '??'
			return left ?? evalNode(node.right, data);
		}
		case 'conditional':
			return evalNode(node.test, data)
				? evalNode(node.consequent, data)
				: evalNode(node.alternate, data);
		case 'call':
			return evalCall(node, data);
	}
}

// Tournament wraps each code chunk in try/catch and routes errors to the E()
// handler, which rethrows ExpressionErrors and swallows everything else (the
// chunk then yields undefined). Mirror that exactly.
function evalChunk(node: SimpleNode, data: IWorkflowDataProxyData): unknown {
	try {
		return evalNode(node, data);
	} catch (error) {
		if (
			error instanceof EngineFallbackError ||
			error instanceof ExpressionError ||
			error instanceof ExpressionExtensionError
		)
			throw error;
		return undefined;
	}
}

type CompiledChunk = { type: 'text'; text: string } | { type: 'code'; node: SimpleNode };

interface CompiledSimpleExpression {
	chunks: CompiledChunk[];
	// Exactly [empty text, code]: return the code chunk's raw value instead of
	// string-concatenating (tmpl compatibility, see ExpressionBuilder).
	isWholeValue: boolean;
}

// null = classified as not simple. TODO(POC): naive clear-on-overflow map;
// unify with the expression-runtime evaluator's LRU so verdict and
// transformed code share one cache entry.
const cache = new Map<string, CompiledSimpleExpression | null>();
const CACHE_MAX = 500;

function compile(expression: string): CompiledSimpleExpression | null {
	let parsed;
	try {
		parsed = getParsedExpression(expression);
	} catch {
		// Syntax errors fall through to the engine for its error reporting.
		return null;
	}

	const chunks: CompiledChunk[] = [];
	for (const chunk of parsed) {
		if (chunk.type === 'text') {
			chunks.push(chunk);
			continue;
		}
		const body: unknown[] = chunk.parsed.program.body;
		if (body.length !== 1) return null;
		const statement = body[0];
		if (!isObj(statement) || statement.type !== 'ExpressionStatement') return null;
		const node = parseSimple(statement.expression);
		if (node === null) return null;
		chunks.push({ type: 'code', node });
	}

	// Mirrors the branch condition in ExpressionBuilder.getExpressionCode.
	const isWholeValue = !(
		chunks.length > 2 ||
		chunks[0].type !== 'text' ||
		chunks[0].text !== '' ||
		chunks.length === 1
	);

	return { chunks, isWholeValue };
}

/** Exposed for tests: does the fast path claim this expression? */
export function isSimpleExpression(expression: string): boolean {
	return getCompiled(expression) !== null;
}

function getCompiled(expression: string): CompiledSimpleExpression | null {
	let compiled = cache.get(expression);
	if (compiled === undefined) {
		if (cache.size >= CACHE_MAX) cache.clear();
		compiled = compile(expression);
		cache.set(expression, compiled);
	}
	return compiled;
}

/**
 * Try to evaluate an expression (with the leading `=` already stripped)
 * natively. Returns `{ handled: false }` when the expression is not provably
 * simple; the caller must then run the regular pipeline.
 */
export function evaluateSimpleExpression(
	expression: string,
	data: IWorkflowDataProxyData,
): { handled: true; value: unknown } | { handled: false } {
	const compiled = getCompiled(expression);
	if (compiled === null) return { handled: false };

	try {
		return { handled: true, value: evalCompiled(compiled, data) };
	} catch (error) {
		// A runtime value the static parse could not see (a string method on a
		// non-string receiver): let the engine evaluate instead.
		if (error instanceof EngineFallbackError) return { handled: false };
		throw error;
	}
}

function evalCompiled(compiled: CompiledSimpleExpression, data: IWorkflowDataProxyData): unknown {
	if (compiled.isWholeValue) {
		const code = compiled.chunks[1];
		// isWholeValue guarantees chunks = [text '', code]
		return code.type === 'code' ? evalChunk(code.node, data) : '';
	}

	// String concatenation, mirroring tmpl semantics: falsy chunk values other
	// than 0/false render as '', parts are joined with String() coercion.
	const parts: unknown[] = [];
	for (const chunk of compiled.chunks) {
		if (chunk.type === 'text') {
			if (chunk.text !== '') parts.push(chunk.text);
		} else {
			const value = evalChunk(chunk.node, data);
			parts.push(value || value === 0 || value === false ? value : '');
		}
	}
	// Single-chunk expressions (plain text, or a lone blank `{{}}`) return the
	// part as-is; everything else joins to a string.
	if (compiled.chunks.length < 2) return parts[0] ?? '';
	return parts.join('');
}
