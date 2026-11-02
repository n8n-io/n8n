import { getCompiled, type CompiledExpression } from './compiler';
import {
	EngineFallbackError,
	Env,
	bounded,
	evalChunk,
	type NativeFallbackReason,
} from './evaluator';
import { MAX_DEPTH, MAX_RESULT_LENGTH, hasOwn, isArray, isObj } from './grammar';
import type { IWorkflowDataProxyData } from '../../interfaces';

const { getPrototypeOf, keys } = Object;

export {
	CALLABLE_METHODS,
	ITERATOR_METHODS,
	MAX_RESULT_LENGTH,
	MAX_STEPS,
	MAX_WORK,
	TIME_METHODS,
} from './grammar';

// Fast native evaluation: an in-process interpreter for a closed subset of
// the expression grammar.
//
// The subset is data path access on the data roots (`$json`, `$parameter`,
// `$vars`, `$binary`, `$itemIndex`, `$runIndex`) and on node references
// (`$('Name').item`, `$('Name').first()`, `$input.item`, `$node['Name'].json`),
// primitive reads off the time roots (`$now.toMillis()`, `$today.year`),
// literals (array literals of literals included), a fixed set of operators,
// calls to a closed allowlist of native string/number/array methods, and the
// five array iterators (some/every/find/filter/map) with a one-parameter
// arrow callback whose body is in the same subset. Such expressions cannot
// reach prototypes or touch anything outside the data proxy, and the only
// loop is a native iterator over a size-capped array under a step budget, so
// they are interpreted here without the sandbox AST hooks, the
// global-context setup, or an engine (isolate) evaluation. Anything that
// does not fit the subset is declined and takes the regular pipeline.
//
// Structure follows "parse, don't validate": the esprima AST is not checked
// in place, it is re-parsed into the closed {@link SimpleNode} grammar below.
// Construction either yields a node of that grammar or null; the interpreter
// only ever sees objects this module built, so it cannot read a field the
// parser did not put there, and unsupported constructs are unrepresentable
// rather than rejected. Expression text is never executed as code.
//
// Data is the other input. Node output is normalised to JSON at the node
// boundary (verified for Set and Code output on a running instance), so
// `$json` holds plain objects, arrays and primitives. The runtime guards
// below therefore target what JSON content can do (sizes) and where the host
// would diverge from the isolates (live references, coercion, aliasing), not
// hooks that cannot arrive. Non-JSON values in workflow data are engine bugs.
//
// Layout: grammar.ts holds the closed grammar and the allowlists, parser.ts
// turns esprima output into it, compiler.ts splits, compiles and caches whole
// expressions, evaluator.ts interprets them, and this file runs them.
// skeleton.ts and verify.ts serve verify mode only.

/** Does the expression (leading `=` stripped) fit the native subset? */
export function isNativelyEvaluable(expression: string): boolean {
	return getCompiled(expression) !== null;
}

/**
 * Evaluate an expression (with the leading `=` already stripped) in-process.
 * Returns `{ handled: false }` when the expression is outside the subset, and
 * `{ handled: false, fallbackReason }` when a runtime value fell outside what
 * parsing proved; the caller must then run the regular pipeline.
 */
export function evaluateNatively(
	expression: string,
	data: IWorkflowDataProxyData,
): { handled: true; value: unknown } | { handled: false; fallbackReason?: NativeFallbackReason } {
	const compiled = getCompiled(expression);
	if (compiled === null) return { handled: false };

	try {
		const value = copyResult(evalCompiled(compiled, data));
		return { handled: true, value };
	} catch (error) {
		if (error instanceof EngineFallbackError) {
			return { handled: false, fallbackReason: error.reason };
		}

		throw error;
	}
}

// The engines hand back a copy of any object they return; a whole-value read
// like `{{ $json.body }}` here would hand back the live execution data, which
// callers then mutate in place (cleanupParameterData). Match the engines with
// a plain-data copy. Everything else is the engine's: a data proxy (the
// `$parameter` get trap resolves nested expressions), a non-plain object or
// array (Date, DateTime), a function, symbol or bigint, data deeper than
// MAX_DEPTH, and an own `__proto__` key,
// which the vm and quickjs serialiser drops and legacy keeps.
function copyResult(value: unknown): unknown {
	// A shared object is copied once per reference, so shared or cyclic data
	// and long sparse arrays are bounded by the slots visited, not by depth.
	let visits = 0;

	const copy = (value: unknown, depth: number): unknown => {
		const nonJsonLeaf =
			typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint';
		if (nonJsonLeaf) throw new EngineFallbackError('unsupported_type');
		if (!isObj(value)) return value;
		if (depth > MAX_DEPTH) throw new EngineFallbackError('too_deep');
		if (value.isProxy === true) throw new EngineFallbackError('unsupported_type');

		if (isArray(value)) {
			if (getPrototypeOf(value) !== Array.prototype)
				throw new EngineFallbackError('unsupported_type');

			visits += value.length;
			if (visits > MAX_RESULT_LENGTH) throw new EngineFallbackError('too_large');

			// Holes stay holes: the corpus pins an engine divergence on sparse arrays.
			const result = new Array<unknown>(value.length);
			for (let i = 0; i < value.length; i++) {
				if (hasOwn(value, i)) result[i] = copy(value[i], depth + 1);
			}
			return result;
		}

		const proto: unknown = getPrototypeOf(value);
		if (proto !== Object.prototype && proto !== null)
			throw new EngineFallbackError('unsupported_type');

		const ownKeys = keys(value);
		visits += ownKeys.length;
		if (visits > MAX_RESULT_LENGTH) throw new EngineFallbackError('too_large');

		const result: Record<string, unknown> = {};
		for (const key of ownKeys) {
			if (key === '__proto__') throw new EngineFallbackError('unsupported_type');
			result[key] = copy(value[key], depth + 1);
		}
		return result;
	};

	return copy(value, 0);
}

function evalCompiled(compiled: CompiledExpression, data: IWorkflowDataProxyData): unknown {
	const env = new Env(data);

	if (compiled.isWholeValue) {
		const code = compiled.chunks[1];
		// isWholeValue guarantees chunks = [text '', code]
		return code.type === 'code' ? evalChunk(code.node, env) : '';
	}

	// String concatenation, mirroring tmpl semantics: falsy chunk values other
	// than 0/false render as '', parts are joined with String() coercion.
	const parts: unknown[] = [];
	let length = 0;
	for (const chunk of compiled.chunks) {
		if (chunk.type === 'text') {
			if (chunk.text !== '') parts.push(chunk.text);
			length += chunk.text.length;
			continue;
		}

		const value = evalChunk(chunk.node, env);

		// An object here would coerce through its toString on the host.
		if (isObj(value)) {
			throw new EngineFallbackError('unsupported_type');
		}

		const part = value || value === 0 || value === false ? value : '';
		parts.push(part);
		length += typeof part === 'string' ? part.length : 1;

		// Bound before the join allocates the combined string.
		if (length > MAX_RESULT_LENGTH) throw new EngineFallbackError('too_large');
	}

	// Single-chunk expressions (plain text, or a lone blank `{{}}`) return the
	// part as-is; everything else joins to a string.
	if (compiled.chunks.length < 2) return parts[0] ?? '';

	return bounded(parts.join(''));
}
