import { ExpressionExtensionError } from '../../errors/expression-extension.error';
import { ExpressionError } from '../../errors/expression.error';
import type { IWorkflowDataProxyData } from '../../interfaces';
import {
	ARRAY_METHODS,
	MAX_RESULT_LENGTH,
	NUMBER_METHODS,
	STRING_METHODS,
	hasOwn,
	isArray,
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

function evalMember(
	node: Extract<SimpleNode, { kind: 'member' }>,
	data: IWorkflowDataProxyData,
): unknown {
	const object = evalNode(node.object, data);

	if (node.optional && (object === null || object === undefined)) {
		throw chainShortCircuit;
	}

	if (!isIndexable(object)) {
		throw new TypeError(`Cannot read properties of ${toStr(object)} (reading '${node.key}')`);
	}

	// Below the roots (get-trap proxies, where Object.hasOwn misreports every
	// key) the data is plain JSON, so an inherited property is a host prototype
	// the isolates never see. The engine decides what it yields.
	const inherited =
		node.object.kind !== 'root' &&
		typeof object === 'object' &&
		node.key in object &&
		!hasOwn(object, node.key);
	if (inherited) {
		throw new EngineFallbackError();
	}

	const value = object[node.key];

	// Neither crosses an engine boundary the same way twice (the vm bridge
	// drops a nested function but fails on an inherited one; legacy throws),
	// so the configured engine decides rather than this module guessing.
	if (typeof value === 'function' || typeof value === 'symbol') {
		throw new EngineFallbackError();
	}

	return value;
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
 * result) bail on an upper bound of their output.
 */
function assertPreflightSize(receiver: unknown, method: string, args: unknown[]): void {
	let upperBound = typeof receiver === 'number' ? 0 : (receiver as { length: number }).length;

	if (method === 'concat') {
		for (const arg of args) {
			upperBound += isArray(arg) ? arg.length : 1;
		}
	} else if (method === 'flat' && isArray(receiver)) {
		const depth = args.length === 0 ? 1 : toNum(args[0]);
		upperBound = flatSize(receiver, depth);
	} else if (method === 'replaceAll' && typeof receiver === 'string') {
		// A missing replacement inserts the string "undefined".
		const replacement = args.length < 2 ? 'undefined' : toStr(args[1]);

		// `$&`, `$\``, `$'` splice match context into every replacement, so
		// the result is not bounded by the replacement's length.
		if (replacement.includes('$')) throw new EngineFallbackError();

		upperBound = (receiver.length + 1) * (replacement.length + 1);
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

function evalCall(
	node: Extract<SimpleNode, { kind: 'call' }>,
	data: IWorkflowDataProxyData,
): unknown {
	const receiver = evalNode(node.receiver, data);
	const receiverMissing = receiver === null || receiver === undefined;

	if (node.optional && receiverMissing) {
		throw chainShortCircuit;
	}

	if (receiverMissing) {
		throw new TypeError(`Cannot read properties of ${toStr(receiver)} (reading '${node.method}')`);
	}

	// An own property shadowing the method (an engine-resolved $parameter value
	// can carry one) would take precedence in the engines.
	if (hasOwn(receiver, node.method)) {
		throw new EngineFallbackError();
	}

	const method = methodFor(receiver, node.method);

	const args = node.args.map((argument) => evalNode(argument, data));
	if (!args.every((arg) => isAllowedArgument(node.method, arg))) {
		throw new EngineFallbackError();
	}

	assertPreflightSize(receiver, node.method, args);

	return bounded(method.apply(receiver, args));
}

function evalChain(
	node: Extract<SimpleNode, { kind: 'chain' }>,
	data: IWorkflowDataProxyData,
): unknown {
	try {
		return evalNode(node.expression, data);
	} catch (error) {
		if (error === chainShortCircuit) return undefined;

		throw error;
	}
}

function evalUnary(
	node: Extract<SimpleNode, { kind: 'unary' }>,
	data: IWorkflowDataProxyData,
): unknown {
	const argument = evalNode(node.argument, data);

	if (node.op === '!') {
		return !argument;
	}

	if (!isPrimitive(argument)) {
		throw new EngineFallbackError();
	}

	return node.op === '-' ? -toNum(argument) : toNum(argument);
}

function evalBinary(
	node: Extract<SimpleNode, { kind: 'binary' }>,
	data: IWorkflowDataProxyData,
): unknown {
	const left = evalNode(node.left, data);
	const right = evalNode(node.right, data);

	if (!isPrimitive(left) || !isPrimitive(right)) {
		throw new EngineFallbackError();
	}

	return binaryOps[node.op](left, right);
}

function evalLogical(
	node: Extract<SimpleNode, { kind: 'logical' }>,
	data: IWorkflowDataProxyData,
): unknown {
	const left = evalNode(node.left, data);

	switch (node.op) {
		case '&&':
			return left ? evalNode(node.right, data) : left;
		case '||':
			return left ? left : evalNode(node.right, data);
		case '??':
			return left ?? evalNode(node.right, data);
	}
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
		case 'chain':
			return evalChain(node, data);
		case 'unary':
			return evalUnary(node, data);
		case 'binary':
			return evalBinary(node, data);
		case 'logical':
			return evalLogical(node, data);
		case 'conditional':
			return evalNode(node.test, data)
				? evalNode(node.consequent, data)
				: evalNode(node.alternate, data);
		case 'call':
			return evalCall(node, data);
	}
}

/**
 * Tournament wraps each code chunk in try/catch and routes errors to the E()
 * handler, which rethrows ExpressionErrors and swallows everything else (the
 * chunk then yields undefined). Mirror that exactly.
 */
export function evalChunk(node: SimpleNode, data: IWorkflowDataProxyData): unknown {
	try {
		return evalNode(node, data);
	} catch (error) {
		const rethrow =
			error instanceof EngineFallbackError ||
			error instanceof ExpressionError ||
			error instanceof ExpressionExtensionError;

		if (rethrow) throw error;

		return undefined;
	}
}
