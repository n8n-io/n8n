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
// TODO(POC): promote the enable flag to ExpressionEngineConfig in @n8n/config.
export const isSimpleExpressionPathEnabled = () =>
	typeof process !== 'undefined' && process.env.N8N_EXPRESSION_SIMPLE_PATH === 'true';

// Grammar of the supported AST subset. `isSupportedNode` is the single
// source of truth: it both classifies and acts as the type guard, so the
// interpreter never sees a shape it does not know.
type SimpleNode =
	| { type: 'Literal'; value: unknown }
	| { type: 'Identifier'; name: string }
	| {
			type: 'MemberExpression';
			object: SimpleNode;
			property: SimpleNode;
			computed: boolean;
			optional?: boolean;
	  }
	| { type: 'ChainExpression'; expression: SimpleNode }
	| { type: 'UnaryExpression'; operator: string; argument: SimpleNode; prefix: boolean }
	| { type: 'BinaryExpression'; operator: string; left: SimpleNode; right: SimpleNode }
	| { type: 'LogicalExpression'; operator: string; left: SimpleNode; right: SimpleNode }
	| {
			type: 'ConditionalExpression';
			test: SimpleNode;
			consequent: SimpleNode;
			alternate: SimpleNode;
	  }
	| {
			type: 'CallExpression';
			callee: Extract<SimpleNode, { type: 'MemberExpression' }>;
			arguments: SimpleNode[];
			optional?: boolean;
	  };

// TODO(POC): extend to $binary, $itemIndex, $runIndex, $vars — each needs a
// semantics check against the data proxy first. $now/$today are excluded on
// purpose: they are Luxon DateTimes whose methods would make every useful
// expression on them a CallExpression anyway.
//
// Note on $parameter: the proxy resolves nested `=` parameter values by
// re-entering resolveSimpleParameterValue — a nested non-simple value simply
// takes the engine path there (under lazy acquisition, creating the bridge on
// demand).
const SUPPORTED_ROOTS = new Set(['$json', '$parameter']);

// Native prototype methods callable on a receiver of the matching type.
// Every name here must stay disjoint from the expression-extension method
// names (extendSyntax rewrites extension calls into `extend()` dispatch;
// natives pass through untouched) — pinned by a test in the parity corpus.
// The receiver's type is only known at runtime: a receiver whose type has no
// allowlist entry for the method makes the evaluation bail to the engine
// (EngineFallbackError below). Callback-taking forms (regex/function args,
// array callbacks) are unrepresentable: those argument nodes are declined by
// the classifier.
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

const BINARY_OPS = new Set([
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
]);
const LOGICAL_OPS = new Set(['&&', '||', '??']);
const UNARY_OPS = new Set(['!', '-', '+']);

const isObj = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

function isSupportedLiteral(node: Record<string, unknown>): boolean {
	// Regex literals stay on the engine (backtracking blowup has no isolate
	// timeout here).
	if ('regex' in node && node.regex) return false;
	const value = node.value;
	return (
		value === null ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	);
}

function isSupportedMember(node: Record<string, unknown>): boolean {
	if (!isSupportedNode(node.object)) return false;
	const property = node.property;
	if (!isObj(property)) return false;
	if (node.computed === true) {
		// Only static literal keys. Dynamic keys ($json[$json.key]) need the
		// sandbox's PrototypeSanitizer, so they stay on the engine.
		if (property.type !== 'Literal') return false;
		const key = property.value;
		if (typeof key === 'number') return true;
		return typeof key === 'string' && isSafeObjectProperty(key);
	}
	return (
		property.type === 'Identifier' &&
		typeof property.name === 'string' &&
		isSafeObjectProperty(property.name)
	);
}

const isSupportedIdentifier = (node: Record<string, unknown>): boolean =>
	typeof node.name === 'string' && (SUPPORTED_ROOTS.has(node.name) || node.name === 'undefined');

function isSupportedCall(node: Record<string, unknown>): boolean {
	const callee = node.callee;
	if (!isObj(callee) || callee.type !== 'MemberExpression' || callee.computed === true)
		return false;
	const property = callee.property;
	if (
		!isObj(property) ||
		property.type !== 'Identifier' ||
		typeof property.name !== 'string' ||
		!CALLABLE_METHODS.has(property.name)
	)
		return false;
	if (!isSupportedNode(callee.object)) return false;
	return Array.isArray(node.arguments) && node.arguments.every(isSupportedNode);
}

function isSupportedNode(node: unknown): node is SimpleNode {
	if (!isObj(node)) return false;
	switch (node.type) {
		case 'Literal':
			return isSupportedLiteral(node);
		case 'Identifier':
			return isSupportedIdentifier(node);
		case 'MemberExpression':
			return isSupportedMember(node);
		case 'ChainExpression':
			return isSupportedNode(node.expression);
		case 'UnaryExpression':
			return (
				node.prefix === true &&
				typeof node.operator === 'string' &&
				UNARY_OPS.has(node.operator) &&
				isSupportedNode(node.argument)
			);
		case 'BinaryExpression':
			return (
				typeof node.operator === 'string' &&
				BINARY_OPS.has(node.operator) &&
				isSupportedNode(node.left) &&
				isSupportedNode(node.right)
			);
		case 'LogicalExpression':
			return (
				typeof node.operator === 'string' &&
				LOGICAL_OPS.has(node.operator) &&
				isSupportedNode(node.left) &&
				isSupportedNode(node.right)
			);
		case 'ConditionalExpression':
			return (
				isSupportedNode(node.test) &&
				isSupportedNode(node.consequent) &&
				isSupportedNode(node.alternate)
			);
		case 'CallExpression':
			return isSupportedCall(node);
		default:
			// TODO(POC): tier 2 — CallExpression on a closed list of array
			// methods (filter/sort/map) whose callbacks are interpreted by this
			// same restricted walker under a step budget. Declined for now.
			return false;
	}
}

// Thrown when a runtime value falls outside what the fast path proved
// statically (e.g. a whitelisted string method called on a non-string
// receiver, where extensions could apply). The whole evaluation is abandoned
// and the caller re-runs the expression through the regular engine pipeline.
class EngineFallbackError extends Error {}

// ponytail: predicate lies for primitives, but JS property lookup on a
// non-nullish primitive is well-defined and side-effect free.
const isIndexable = (value: unknown): value is Record<string | number, unknown> =>
	value !== null && value !== undefined;

// Operand casts are intentional: the fast path must reproduce JS coercion
// semantics exactly (parity with the engines), not re-implement them.
/* eslint-disable @typescript-eslint/no-explicit-any */
const binaryOps: Record<string, (l: any, r: any) => unknown> = {
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
	node: Extract<SimpleNode, { type: 'MemberExpression' }>,
	data: IWorkflowDataProxyData,
): unknown {
	const object = evalNode(node.object, data);
	// ponytail: per-node optional check instead of full chain short-circuiting.
	// Behaviour-equivalent here because keys are static (no side effects to
	// skip) and the chunk-level catch maps the resulting TypeError to the same
	// observable value the engine produces.
	if (node.optional === true && (object === null || object === undefined)) return undefined;
	const key =
		node.property.type === 'Literal'
			? node.property.value
			: node.property.type === 'Identifier'
				? node.property.name
				: undefined;
	if (typeof key !== 'string' && typeof key !== 'number') return undefined;
	// Statically guaranteed by the classifier; kept as defence in depth.
	if (typeof key === 'string' && !isSafeObjectProperty(key)) return undefined;
	if (!isIndexable(object)) {
		throw new TypeError(`Cannot read properties of ${String(object)} (reading '${key}')`);
	}
	const value = object[key];
	// Never surface functions: matches the VM bridge, whose getValueAtPath
	// returns undefined for function-typed values. (The legacy engine returns
	// the function and the caller throws "this is a function" — a pre-existing
	// engine divergence; we side with the default engine.)
	return typeof value === 'function' ? undefined : value;
}

function evalCall(
	node: Extract<SimpleNode, { type: 'CallExpression' }>,
	data: IWorkflowDataProxyData,
): unknown {
	const receiver = evalNode(node.callee.object, data);
	const receiverMissing = receiver === null || receiver === undefined;
	if ((node.callee.optional === true || node.optional === true) && receiverMissing)
		return undefined;
	const methodName =
		node.callee.property.type === 'Identifier' ? node.callee.property.name : undefined;
	if (receiverMissing) {
		throw new TypeError(
			`Cannot read properties of ${String(receiver)} (reading '${String(methodName)}')`,
		);
	}
	// The classifier only proves the method name; the receiver's type is data.
	// A receiver whose type has no allowlist entry for the method could be
	// intercepted by extensions, so hand the whole expression to the engine.
	if (methodName === undefined) throw new EngineFallbackError();
	let proto: object;
	if (typeof receiver === 'string' && STRING_METHODS.has(methodName)) proto = String.prototype;
	else if (typeof receiver === 'number' && NUMBER_METHODS.has(methodName)) proto = Number.prototype;
	else if (Array.isArray(receiver) && ARRAY_METHODS.has(methodName)) proto = Array.prototype;
	else throw new EngineFallbackError();
	const method: unknown = Reflect.get(proto, methodName);
	if (typeof method !== 'function') throw new EngineFallbackError();
	const args = node.arguments.map((argument) => evalNode(argument, data));
	return method.apply(receiver, args) as unknown;
}

function evalNode(node: SimpleNode, data: IWorkflowDataProxyData): unknown {
	switch (node.type) {
		case 'Literal':
			return node.value;
		case 'Identifier':
			// Only roots pass the classifier; 'undefined' is the sole other case.
			if (node.name === '$json') return data.$json;
			if (node.name === '$parameter') return data.$parameter;
			return undefined;
		case 'ChainExpression':
			return evalNode(node.expression, data);
		case 'MemberExpression':
			return evalMember(node, data);
		case 'UnaryExpression': {
			const argument = evalNode(node.argument, data);
			if (node.operator === '!') return !argument;
			if (node.operator === '-') return -Number(argument);
			return Number(argument);
		}
		case 'BinaryExpression':
			return binaryOps[node.operator](evalNode(node.left, data), evalNode(node.right, data));
		case 'LogicalExpression': {
			const left = evalNode(node.left, data);
			if (node.operator === '&&') return left ? evalNode(node.right, data) : left;
			if (node.operator === '||') return left ? left : evalNode(node.right, data);
			// '??'
			return left ?? evalNode(node.right, data);
		}
		case 'ConditionalExpression':
			return evalNode(node.test, data)
				? evalNode(node.consequent, data)
				: evalNode(node.alternate, data);
		case 'CallExpression':
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
		if (!isSupportedNode(statement.expression)) return null;
		chunks.push({ type: 'code', node: statement.expression });
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
		// A runtime value the static classification could not see (a string
		// method on a non-string receiver): let the engine evaluate instead.
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
