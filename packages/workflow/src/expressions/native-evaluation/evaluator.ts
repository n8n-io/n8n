import { ExpressionExtensionError } from '../../errors/expression-extension.error';
import { ExpressionError } from '../../errors/expression.error';
import type { IWorkflowDataProxyData } from '../../interfaces';
import {
	ARRAY_METHODS,
	ITERATOR_NATIVES,
	MAX_DEPTH,
	MAX_RESULT_LENGTH,
	MAX_STEPS,
	MAX_WORK,
	NUMBER_METHODS,
	STRING_METHODS,
	hasOwn,
	isArray,
	isObj,
	toNum,
	toStr,
	type BinaryOp,
	type NativeMethod,
	type SimpleNode,
} from './grammar';

// ── Evaluation: total over the grammar. ────────────────────────────────────
//
// evalNode reads only fields parseSimple constructed, because those are the
// only fields that exist. The switch has no default branch: adding a kind to
// the grammar stops compilation until it is handled here.

/**
 * One evaluation's state: the data proxy, the value bound to the callback
 * parameter while a body runs, and the step and work budgets spent so far.
 * Only one callback is ever in scope (a nested one is unrepresentable), so a
 * single slot holds the parameter, and both budgets are shared by every node
 * of the expression.
 */
export class Env {
	param: unknown = undefined;

	steps = 0;

	work = 0;

	readonly parameters = new Map<string | number, unknown>();

	constructor(readonly data: IWorkflowDataProxyData) {}

	charge(units: number): void {
		this.work += units;
		if (this.work > MAX_WORK) throw new EngineFallbackError();
	}
}

/**
 * Thrown when a runtime value falls outside what parsing proved statically
 * (a whitelisted string method on a non-string receiver, an operator on an
 * object operand, a result above MAX_RESULT_LENGTH). The whole evaluation is
 * abandoned and the caller re-runs the expression through the regular engine
 * pipeline. Anything evaluated before the bail runs again in the engine: a
 * nested `$parameter` expression, or a getter on a data object. Expressions
 * are pure and workflow data is JSON, so the only cost is the repeated work.
 */
export class EngineFallbackError extends Error {}

/**
 * Thrown by an optional member/call on a nullish receiver and caught by the
 * enclosing chain node, which yields undefined for the whole chain. One
 * shared instance: a missing optional hop is ordinary data, not an error.
 */
class ChainShortCircuit extends Error {}
const chainShortCircuit = new ChainShortCircuit();

/**
 * Property lookup on a non-nullish primitive is well-defined and side-effect
 * free, so primitives are indexable here even though the predicate's type
 * only names objects.
 */
const isIndexable = (value: unknown): value is Record<string | number, unknown> =>
	value !== null && value !== undefined;

/**
 * Operators only ever see primitives. An object operand would coerce through
 * its valueOf/toString on the host, where the engine sees a structured-clone
 * copy; a reference comparison would differ from the engine's copy semantics.
 */
const isPrimitive = (value: unknown): boolean =>
	value === null || (typeof value !== 'object' && typeof value !== 'function');

export function bounded<T>(value: T): T {
	const isSizeable = typeof value === 'string' || isArray(value);

	if (isSizeable && value.length > MAX_RESULT_LENGTH) {
		throw new EngineFallbackError();
	}

	return value;
}

// Operand casts are intentional: the interpreter must reproduce JS coercion
// semantics exactly (parity with the engines), not re-implement them.
/* eslint-disable @typescript-eslint/no-explicit-any */
const binaryOps: Record<BinaryOp, (l: any, r: any) => unknown> = Object.freeze({
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
	'+': (l, r) => bounded(l + r),
	'-': (l, r) => l - r,
	'*': (l, r) => l * r,
	'/': (l, r) => l / r,
	'%': (l, r) => l % r,
});
/* eslint-enable @typescript-eslint/no-explicit-any */

function evalMember(node: Extract<SimpleNode, { kind: 'member' }>, env: Env): unknown {
	const object = evalNode(node.object, env);

	if (node.optional && (object === null || object === undefined)) {
		throw chainShortCircuit;
	}

	if (!isIndexable(object)) {
		throw new TypeError(`Cannot read properties of ${toStr(object)} (reading '${node.key}')`);
	}

	// Below the roots and node references (get-trap proxies, where Object.hasOwn
	// misreports every key) the data is plain JSON, so an inherited property is
	// a host prototype the isolates never see. The engine decides what it yields.
	const inherited =
		node.object.kind !== 'root' &&
		node.object.kind !== 'nodeRef' &&
		typeof object === 'object' &&
		node.key in object &&
		!hasOwn(object, node.key);
	if (inherited) {
		throw new EngineFallbackError();
	}

	const value = isParameterRead(node) ? readParameter(object, node.key, env) : object[node.key];

	// Neither crosses an engine boundary the same way twice (the vm bridge
	// drops a nested function but fails on an inherited one; legacy throws),
	// so the configured engine decides rather than this module guessing.
	if (typeof value === 'function' || typeof value === 'symbol') {
		throw new EngineFallbackError();
	}

	return value;
}

const isParameterRead = (node: Extract<SimpleNode, { kind: 'member' }>): boolean =>
	node.object.kind === 'root' && node.object.name === '$parameter';

/**
 * A `$parameter` read resolves a nested `=` expression through the proxy on
 * every access, each in its own evaluation with its own budgets. A callback
 * body would resolve it once per element, multiplying the budgets. The vm
 * bridge resolves each parameter once per evaluation; do the same, so nested
 * work is one budget per key the expression names.
 */
function readParameter(proxy: Record<string | number, unknown>, key: string | number, env: Env) {
	if (!env.parameters.has(key)) env.parameters.set(key, proxy[key]);

	return env.parameters.get(key);
}

/**
 * Parsing only proves the method name; the receiver's type is data. A
 * receiver whose type has no allowlist entry for the method could be
 * intercepted by extensions, so it hands the whole expression to the engine.
 */
function methodFor(receiver: unknown, name: string): NativeMethod {
	let method: NativeMethod | undefined;

	if (typeof receiver === 'string') {
		method = STRING_METHODS.get(name);
	} else if (typeof receiver === 'number') {
		method = NUMBER_METHODS.get(name);
	} else if (isArray(receiver)) {
		method = ARRAY_METHODS.get(name);
	}

	if (method === undefined) throw new EngineFallbackError();

	return method;
}

/**
 * Arguments are primitives, plus arrays for concat. An object argument would
 * compare by live reference where the isolate compares copies (includes/
 * indexOf) or coerce on the host where the isolate sees a copy.
 */
function isAllowedArgument(method: string, arg: unknown): boolean {
	if (isPrimitive(arg)) return true;

	return method === 'concat' && isArray(arg);
}

/**
 * The engine runs under a timeout; a synchronous native call cannot be
 * interrupted, so the input size is the budget. A receiver above the result
 * cap goes to the engine before any work is done, and the amplifying methods
 * (which can allocate far beyond MAX_RESULT_LENGTH before bounded() sees the
 * result) bail on an upper bound of their output. Returns that bound, which
 * the caller charges against the expression's work budget.
 */
function preflightSize(receiver: unknown, method: string, args: unknown[]): number {
	let upperBound = typeof receiver === 'number' ? 0 : (receiver as { length: number }).length;

	if (method === 'concat') {
		for (const arg of args) {
			upperBound += isArray(arg) ? arg.length : 1;
		}
	} else if (method === 'flat' && isArray(receiver)) {
		const depth = args.length === 0 ? 1 : toNum(args[0]);
		upperBound = flatSize(receiver, depth);
	} else if ((method === 'replace' || method === 'replaceAll') && typeof receiver === 'string') {
		// A missing replacement inserts the string "undefined".
		const replacement = args.length < 2 ? 'undefined' : toStr(args[1]);

		// Three replacement tokens expand: `$&`, `$\`` and `$'` insert match
		// context, so the output is not bounded by the replacement's length.
		// `$$` is an escaped literal `$`; strip those pairs first so that `$$&`
		// (a literal "$&") stays native while `$$$&` (a literal "$" then `$&`)
		// bails. With a string pattern every other `$` is literal.
		if (/\$[&`']/.test(replacement.replaceAll('$$', ''))) throw new EngineFallbackError();

		upperBound =
			method === 'replace'
				? receiver.length + replacement.length
				: (receiver.length + 1) * (replacement.length + 1);
	} else if (method === 'join' && isArray(receiver)) {
		// Only an undefined separator means ","; null joins with "null".
		const separator = args[0] === undefined ? ',' : toStr(args[0]);
		upperBound = separator.length * Math.max(receiver.length - 1, 0);

		for (const element of receiver) {
			upperBound += toStr(element ?? '').length;
		}
	}

	if (upperBound > MAX_RESULT_LENGTH) {
		throw new EngineFallbackError();
	}

	return upperBound;
}

/**
 * Element count of `array.flat(depth)`, stopping early once past the cap
 * (a nested structure can flatten to far more elements than the outer
 * array holds).
 */
function flatSize(array: unknown[], depth: number): number {
	let size = 0;
	for (const element of array) {
		size += depth >= 1 && isArray(element) ? flatSize(element, depth - 1) : 1;
		if (size > MAX_RESULT_LENGTH) break;
	}
	return size;
}

/**
 * Array methods that call toString on their elements: join() on every
 * element, toSorted()'s default comparator on both operands per comparison.
 * On nested arrays that work is proportional to the nested size, which no
 * element count bounds, so these run natively over primitive elements only.
 */
const STRINGIFIES_ELEMENTS = new Set(['join', 'toSorted']);

/**
 * Hands off to the engine unless every element is a primitive. O(n) over a
 * receiver the size cap already limits, and runs before anything is
 * stringified.
 */
function assertPrimitiveElements(receiver: unknown[]): void {
	// The receiver cap applies before the scan, so the scan never walks more
	// than the cap either.
	if (receiver.length > MAX_RESULT_LENGTH) throw new EngineFallbackError();

	for (const element of receiver) {
		if (!isPrimitive(element)) throw new EngineFallbackError();
	}
}

/**
 * Content size of a JSON value: string lengths plus one per element and
 * key, stopping early past the budget. Deeper than the grammar's own depth
 * cap hands off: the engine owns data that deep.
 */
function contentWeight(value: unknown, budget: number, depth = 0): number {
	if (depth > MAX_DEPTH) throw new EngineFallbackError();
	if (typeof value === 'string') return value.length;
	if (!isObj(value)) return 1;

	let weight = 1;
	if (isArray(value)) {
		for (const element of value) {
			weight += contentWeight(element, budget - weight, depth + 1);
			if (weight > budget) break;
		}
		return weight;
	}

	// Walk keys without materialising an entries array: an object with many
	// keys would otherwise be copied before the budget is checked.
	for (const key in value) {
		if (!hasOwn(value, key)) continue;
		weight += key.length + contentWeight(value[key], budget - weight, depth + 1);
		if (weight > budget) break;
	}
	return weight;
}

/**
 * concat() is the one method that can hold more content than the payload
 * delivered: N arguments that reference one large string become N copies
 * when the result is cloned (copyResult) and N operands for every method
 * downstream (join, toSorted, includes). Element count does not see that,
 * so concat is bounded by the content size of receiver plus arguments.
 */
function assertConcatWeight(receiver: unknown[], args: unknown[]): void {
	let weight = contentWeight(receiver, MAX_RESULT_LENGTH);
	for (const arg of args) {
		if (weight > MAX_RESULT_LENGTH) break;
		weight += contentWeight(arg, MAX_RESULT_LENGTH - weight);
	}
	if (weight > MAX_RESULT_LENGTH) throw new EngineFallbackError();
}

function evalReceiver(
	node: Extract<SimpleNode, { kind: 'call' | 'iterate' }>,
	env: Env,
): NonNullable<unknown> {
	const receiver = evalNode(node.receiver, env);
	const receiverMissing = receiver === null || receiver === undefined;

	if (node.optional && receiverMissing) {
		throw chainShortCircuit;
	}

	if (receiverMissing) {
		throw new TypeError(`Cannot read properties of ${toStr(receiver)} (reading '${node.method}')`);
	}

	return receiver;
}

function evalCall(node: Extract<SimpleNode, { kind: 'call' }>, env: Env): unknown {
	const receiver = evalReceiver(node, env);

	if (node.receiver.kind === 'nodeRef') {
		return evalNodeRefCall(receiver, node.method);
	}

	// An own property shadowing the method (an engine-resolved $parameter value
	// can carry one) would take precedence in the engines.
	if (hasOwn(receiver, node.method)) {
		throw new EngineFallbackError();
	}

	const method = methodFor(receiver, node.method);

	const args = node.args.map((argument) => evalNode(argument, env));
	if (!args.every((arg) => isAllowedArgument(node.method, arg))) {
		throw new EngineFallbackError();
	}

	if (isArray(receiver)) {
		if (STRINGIFIES_ELEMENTS.has(node.method)) assertPrimitiveElements(receiver);
		if (node.method === 'concat') assertConcatWeight(receiver, args);
	}
	env.charge(preflightSize(receiver, node.method, args));

	return bounded(method.apply(receiver, args));
}

/**
 * `some`/`every`/`find`/`filter`/`map` with a callback body. The native
 * method drives the iteration; the body runs per element with the element
 * bound to the parameter, under the shared step and work budgets. map is the one
 * method whose result is new content per element, so it is bounded by the
 * content weight of its results the way concat is bounded by its operands.
 */
function evalIterate(node: Extract<SimpleNode, { kind: 'iterate' }>, env: Env): unknown {
	const receiver = evalReceiver(node, env);

	if (!isArray(receiver) || hasOwn(receiver, node.method)) {
		throw new EngineFallbackError();
	}

	const method = ITERATOR_NATIVES.get(node.method);
	if (method === undefined) throw new EngineFallbackError();

	env.charge(preflightSize(receiver, node.method, []));

	let weight = 0;
	const visit = (element: unknown) => {
		if (++env.steps > MAX_STEPS) throw new EngineFallbackError();

		env.param = element;
		const result = evalNode(node.body, env);

		if (node.method === 'map') {
			weight += contentWeight(result, MAX_RESULT_LENGTH - weight);
			if (weight > MAX_RESULT_LENGTH) throw new EngineFallbackError();
		}

		return result;
	};

	return bounded(method.call(receiver, visit));
}

/**
 * `first()`, `last()` and `all()` on a node proxy. The proxy hands back a
 * host function that reads run data for the node the reference names, which
 * is what the engines call too (the vm bridge routes it through typed RPC).
 */
function evalNodeRefCall(proxy: unknown, method: string): unknown {
	const fn: unknown = Reflect.get(proxy as object, method);
	if (typeof fn !== 'function') throw new EngineFallbackError();

	return bounded(fn.call(proxy));
}

function evalNodeRef(node: Extract<SimpleNode, { kind: 'nodeRef' }>, env: Env): unknown {
	if (node.ref === 'input') return env.data.$input;
	if (node.ref === 'legacy') return env.data.$node[node.name];

	return env.data.$(node.name);
}

function evalChain(node: Extract<SimpleNode, { kind: 'chain' }>, env: Env): unknown {
	try {
		return evalNode(node.expression, env);
	} catch (error) {
		if (error === chainShortCircuit) return undefined;

		throw error;
	}
}

function evalUnary(node: Extract<SimpleNode, { kind: 'unary' }>, env: Env): unknown {
	const argument = evalNode(node.argument, env);

	if (node.op === '!') {
		return !argument;
	}

	if (!isPrimitive(argument)) {
		throw new EngineFallbackError();
	}

	return node.op === '-' ? -toNum(argument) : toNum(argument);
}

function evalBinary(node: Extract<SimpleNode, { kind: 'binary' }>, env: Env): unknown {
	const left = evalNode(node.left, env);
	const right = evalNode(node.right, env);

	if (!isPrimitive(left) || !isPrimitive(right)) {
		throw new EngineFallbackError();
	}

	const result = binaryOps[node.op](left, right);

	// `+` is the one operator that allocates; a body concatenating a payload
	// string per element repeats that allocation.
	if (typeof result === 'string') env.charge(result.length);

	return result;
}

function evalLogical(node: Extract<SimpleNode, { kind: 'logical' }>, env: Env): unknown {
	const left = evalNode(node.left, env);

	switch (node.op) {
		case '&&':
			return left ? evalNode(node.right, env) : left;
		case '||':
			return left ? left : evalNode(node.right, env);
		case '??':
			return left ?? evalNode(node.right, env);
	}
}

function evalNode(node: SimpleNode, env: Env): unknown {
	switch (node.kind) {
		case 'literal':
			return node.value;
		case 'root':
			return env.data[node.name];
		case 'nodeRef':
			return evalNodeRef(node, env);
		case 'undefined':
			return undefined;
		case 'member':
			return evalMember(node, env);
		case 'chain':
			return evalChain(node, env);
		case 'unary':
			return evalUnary(node, env);
		case 'binary':
			return evalBinary(node, env);
		case 'logical':
			return evalLogical(node, env);
		case 'conditional':
			return evalNode(node.test, env)
				? evalNode(node.consequent, env)
				: evalNode(node.alternate, env);
		case 'call':
			return evalCall(node, env);
		case 'array':
			return node.elements.map((element) => element.value);
		case 'param':
			return env.param;
		case 'iterate':
			return evalIterate(node, env);
	}
}

/**
 * Tournament wraps each code chunk in try/catch and routes errors to the E()
 * handler, which rethrows ExpressionErrors and swallows everything else (the
 * chunk then yields undefined). Mirror that exactly.
 */
export function evalChunk(node: SimpleNode, env: Env): unknown {
	try {
		return evalNode(node, env);
	} catch (error) {
		const rethrow =
			error instanceof EngineFallbackError ||
			error instanceof ExpressionError ||
			error instanceof ExpressionExtensionError;

		if (rethrow) throw error;

		return undefined;
	}
}
