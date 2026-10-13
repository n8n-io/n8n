import { getParsedExpression } from '@n8n/tournament';
import type { ParsedCode } from '@n8n/tournament';
import { LruCache } from '@n8n/utils/lru-cache';

import { EngineFallbackError, Env, bounded, evalChunk } from './evaluator';
import { MAX_RESULT_LENGTH, clone, isObj, type SimpleNode } from './grammar';
import { parseSimple } from './parser';
import type { IWorkflowDataProxyData } from '../../interfaces';

export {
	CALLABLE_METHODS,
	ITERATOR_METHODS,
	MAX_RESULT_LENGTH,
	MAX_STEPS,
	MAX_WORK,
} from './grammar';

// Fast native evaluation: an in-process interpreter for a closed subset of
// the expression grammar.
//
// The subset is data path access on the data roots (`$json`, `$parameter`,
// `$vars`, `$binary`, `$itemIndex`, `$runIndex`) and on node references
// (`$('Name').item`, `$('Name').first()`, `$input.item`, `$node['Name'].json`),
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
// turns esprima output into it, evaluator.ts interprets it, and this file
// splits, compiles, caches and runs whole expressions.

type CompiledChunk = { type: 'text'; text: string } | { type: 'code'; node: SimpleNode };

interface CompiledExpression {
	chunks: CompiledChunk[];
	// Exactly [empty text, code]: return the code chunk's raw value instead of
	// string-concatenating (tmpl compatibility, see ExpressionBuilder).
	isWholeValue: boolean;
}

// null = outside the subset. Declined expressions are cached too, so an
// expression the engine owns costs one parse here, not one per evaluation.
// Entries are keyed by expression text, so the key length is capped to keep
// the cache's memory bounded; longer expressions are compiled per evaluation.
const cache = new LruCache<string, CompiledExpression | null>(1024);
const MAX_CACHED_EXPRESSION_LENGTH = 10_000;

// One code chunk of the split expression, or null when it is outside the
// subset. A throw during the re-parse must always mean "declined", never
// escape.
function compileChunk(chunk: ParsedCode): SimpleNode | null {
	const body = chunk.parsed.program.body;
	if (body.length !== 1) return null;

	const statement = body[0];
	if (statement.type !== 'ExpressionStatement') return null;

	try {
		return parseSimple(statement.expression);
	} catch {
		return null;
	}
}

function compile(expression: string): CompiledExpression | null {
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

		const node = compileChunk(chunk);
		if (node === null) return null;

		chunks.push({ type: 'code', node });
	}

	// Mirrors the branch condition in ExpressionBuilder.getExpressionCode.
	const isWholeValue = chunks.length === 2 && chunks[0].type === 'text' && chunks[0].text === '';

	return { chunks, isWholeValue };
}

function getCompiled(expression: string): CompiledExpression | null {
	if (expression.length > MAX_CACHED_EXPRESSION_LENGTH) return compile(expression);

	let compiled = cache.get(expression);

	if (compiled === undefined) {
		compiled = compile(expression);
		cache.set(expression, compiled);
	}

	return compiled;
}

/** Does the expression (leading `=` stripped) fit the native subset? */
export function isNativelyEvaluable(expression: string): boolean {
	return getCompiled(expression) !== null;
}

/**
 * Evaluate an expression (with the leading `=` already stripped) in-process.
 * Returns `{ handled: false }` when the expression is outside the subset or a
 * runtime value fell outside what parsing proved; the caller must then run
 * the regular pipeline.
 */
export function evaluateNatively(
	expression: string,
	data: IWorkflowDataProxyData,
): { handled: true; value: unknown } | { handled: false } {
	const compiled = getCompiled(expression);
	if (compiled === null) return { handled: false };

	try {
		const value = copyResult(evalCompiled(compiled, data));
		return { handled: true, value };
	} catch (error) {
		if (error instanceof EngineFallbackError) return { handled: false };

		throw error;
	}
}

// The engines hand back a copy of any object they return; a whole-value read
// like `{{ $json.body }}` here would hand back the live execution data, which
// callers then mutate in place (cleanupParameterData). Match the engines.
// The `$parameter` root is a Proxy and cannot be cloned: the engine owns it.
function copyResult(value: unknown): unknown {
	if (!isObj(value)) return value;

	try {
		return clone(value);
	} catch {
		throw new EngineFallbackError();
	}
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
			throw new EngineFallbackError();
		}

		const part = value || value === 0 || value === false ? value : '';
		parts.push(part);
		length += typeof part === 'string' ? part.length : 1;

		// Bound before the join allocates the combined string.
		if (length > MAX_RESULT_LENGTH) throw new EngineFallbackError();
	}

	// Single-chunk expressions (plain text, or a lone blank `{{}}`) return the
	// part as-is; everything else joins to a string.
	if (compiled.chunks.length < 2) return parts[0] ?? '';

	return bounded(parts.join(''));
}
