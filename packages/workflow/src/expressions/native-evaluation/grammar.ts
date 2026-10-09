import type { namedTypes } from 'ast-types';

// The closed subset grammar, its operator and method allowlists, and the
// limits the parser and the evaluator share. See index.ts for the overview.

export const BINARY_OPS = [
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
export const UNARY_OPS = ['!', '-', '+'] as const;

export type BinaryOp = (typeof BINARY_OPS)[number];
export type LogicalOp = namedTypes.LogicalExpression['operator'];
export type UnaryOp = (typeof UNARY_OPS)[number];

// The subset grammar. Closed: nothing outside it is representable, so nothing
// outside it can reach the interpreter. `kind` (not esprima's `type`) is the
// discriminant, so a raw AST node can never be mistaken for a SimpleNode.
export type SimpleNode =
	| { kind: 'literal'; value: string | number | boolean | null }
	| { kind: 'root'; name: DataRoot }
	| { kind: 'nodeRef'; ref: 'input' }
	| { kind: 'nodeRef'; ref: 'node'; name: string }
	| { kind: 'nodeRef'; ref: 'legacy'; name: string }
	| { kind: 'undefined' }
	| { kind: 'member'; object: SimpleNode; key: string | number; optional: boolean }
	| { kind: 'chain'; expression: SimpleNode }
	| { kind: 'unary'; op: UnaryOp; argument: SimpleNode }
	| { kind: 'binary'; op: BinaryOp; left: SimpleNode; right: SimpleNode }
	| { kind: 'logical'; op: LogicalOp; left: SimpleNode; right: SimpleNode }
	| { kind: 'conditional'; test: SimpleNode; consequent: SimpleNode; alternate: SimpleNode }
	| { kind: 'call'; receiver: SimpleNode; method: string; args: SimpleNode[]; optional: boolean }
	| { kind: 'array'; elements: Literal[] }
	| { kind: 'param' }
	| {
			kind: 'iterate';
			receiver: SimpleNode;
			method: IteratorMethod;
			body: SimpleNode;
			optional: boolean;
	  };

export type Literal = Extract<SimpleNode, { kind: 'literal' }>;

// Data roots: plain reads off the data proxy. `$now`/`$today` are excluded on
// purpose: they are Luxon DateTimes whose methods would make every useful
// expression on them a CallExpression anyway.
//
// Note on $parameter: the proxy resolves nested `=` parameter values by
// re-entering resolveSimpleParameterValue - a nested non-simple value simply
// takes the engine path there (under lazy acquisition, creating the bridge on
// demand).
//
// Note on $binary: the proxy strips the `data` field from every entry, so a
// whole-value read never carries a payload.
export const DATA_ROOTS = [
	'$json',
	'$parameter',
	'$vars',
	'$binary',
	'$itemIndex',
	'$runIndex',
] as const;
export type DataRoot = (typeof DATA_ROOTS)[number];

// Node references: `$('Name')` and `$input` resolve to the node proxy, the
// legacy `$node['Name']` to the item-level proxy. A nodeRef is only ever
// built as the object of an allowlisted member (NODE_REF_MEMBERS) or the
// receiver of an allowlisted zero-argument call (NODE_REF_METHODS), so a bare
// reference is unrepresentable. Evaluation goes through the same host proxy
// the engines call, paired-item resolution included, which is what keeps the
// two paths in parity; the proxy's ExpressionErrors propagate unchanged.
export const NODE_REF_MEMBERS = new Set(['item']);
export const LEGACY_NODE_REF_MEMBERS = new Set(['json', 'binary']);
export const NODE_REF_METHODS = new Set(['first', 'last', 'all']);

// Intrinsics are captured at import so a later patch to a prototype or a
// global (a polyfill, a community package) does not change what the native
// path runs; the isolates never see such a patch either.
export const { isArray } = Array;
export const { hasOwn } = Object;
export const toStr = String;
export const toNum = Number;
export const clone = structuredClone;

export type NativeMethod = (this: unknown, ...args: unknown[]) => unknown;

const captureMethods = (proto: object, names: string[]): ReadonlyMap<string, NativeMethod> => {
	const methods = new Map<string, NativeMethod>();
	for (const name of names) {
		const method: unknown = Reflect.get(proto, name);
		if (typeof method === 'function') methods.set(name, method as NativeMethod);
	}
	return methods;
};

// Native prototype methods callable on a receiver of the matching type.
// Every name here must stay disjoint from the expression-extension method
// names (extendSyntax rewrites extension calls into `extend()` dispatch;
// natives pass through untouched) - pinned by a test in the parity corpus.
// The receiver's type is only known at runtime: a receiver whose type has no
// allowlist entry for the method makes the evaluation bail to the engine
// (EngineFallbackError below). Regex and function arguments are
// unrepresentable: those argument nodes decline parsing. The one callback
// form is ITERATOR_METHODS below.
export const STRING_METHODS = captureMethods(String.prototype, [
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

export const NUMBER_METHODS = captureMethods(Number.prototype, [
	'toFixed',
	'toPrecision',
	'toString',
]);

// Non-mutating methods only: the receiver is the live workflow data (the vm
// engine evaluates a copy inside the isolate), so an in-place mutator like
// sort()/reverse()/fill() would corrupt execution data as a side effect. Use
// the toSorted()/toReversed() immutable variants instead. Iterator-returning
// methods (entries/values/keys) are also excluded: a live iterator has no
// equivalent representation across the engine boundary.
export const ARRAY_METHODS = captureMethods(Array.prototype, [
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

// Array methods that take one callback. The callback is a single-parameter
// arrow function with an expression body in the same closed grammar; the
// parameter is the only name it adds, and a nested callback declines. These
// are the only calls where the interpreter runs an expression per element,
// so they are a grammar kind of their own (iterate), under MAX_STEPS.
export const ITERATOR_METHODS = ['some', 'every', 'find', 'filter', 'map'] as const;
export type IteratorMethod = (typeof ITERATOR_METHODS)[number];
export const ITERATOR_NATIVES = captureMethods(Array.prototype, [...ITERATOR_METHODS]);

// A callback parameter may not take one of these names: the body would then
// read the parameter where this grammar reads the root. `undefined` is a
// legal parameter name in JS; here it is a literal.
export const RESERVED_NAMES = new Set<string>([...DATA_ROOTS, '$input', '$node', '$', 'undefined']);

export const CALLABLE_METHODS = new Set([
	...STRING_METHODS.keys(),
	...NUMBER_METHODS.keys(),
	...ARRAY_METHODS.keys(),
]);

// The engine evaluates under a timeout and a memory limit; this interpreter
// has neither. A string or array result above this length is handed to the
// engine so those limits apply (nested replaceAll('', ...) or concat chains
// can otherwise expand without bound on the main thread).
export const MAX_RESULT_LENGTH = 1_000_000;

// Callback body evaluations one expression may run, across all its iterate
// nodes. The receiver cap alone would let a body with its own allocation
// (a replaceAll per element) repeat a million times on the main thread.
export const MAX_STEPS = 100_000;

// Characters one expression may put through its method calls and string
// concatenations in total. The step cap bounds visits, not the work one
// visit does (a body can scan a MAX_RESULT_LENGTH string per element); this
// bounds the product, in units the interpreter already computes, so it does
// not depend on the clock or the machine.
export const MAX_WORK = 10 * MAX_RESULT_LENGTH;

// Nesting depth of the subset grammar. Parsing and evaluation both recurse
// once per level, so this keeps a pathological expression off the host stack;
// real expressions are a handful of levels deep.
export const MAX_DEPTH = 64;

export const isObj = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

export const isOneOf = <T extends string>(ops: readonly T[], op: unknown): op is T =>
	typeof op === 'string' && (ops as readonly string[]).includes(op);
