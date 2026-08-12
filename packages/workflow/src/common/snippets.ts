import { ExpressionError } from '../errors/expression.error';
import { getStandaloneExpressionCode } from '../expression-evaluator-proxy';
import { extendTransform, hasExpressionExtension, hasNativeMethod } from '../extensions';
import type { SnippetSources, IDataObject } from '../interfaces';
import { isSafeObjectProperty } from '../utils';

/** Key under which snippet sources travel in `IWorkflowDataProxyAdditionalKeys`. */
export const SNIPPETS_PROXY_KEY = '$__snippets';

type CompiledProgram = (this: IDataObject, errorHandler: (error: Error) => void) => unknown;

const noopErrorHandler = () => {};

let codeGenerationSupported: boolean | undefined;

/** `new Function` throws under `--disallow-code-generation-from-strings` (secure task runners). */
function isCodeGenerationSupported(): boolean {
	if (codeGenerationSupported === undefined) {
		try {
			// eslint-disable-next-line @typescript-eslint/no-implied-eval
			new Function('');
			codeGenerationSupported = true;
		} catch {
			codeGenerationSupported = false;
		}
	}
	return codeGenerationSupported;
}

const MAX_COMPILED_CACHE_SIZE = 200;
const compiledProgramCache = new Map<string, CompiledProgram>();

/** Applies the same extension-method rewrite expressions get (e.g. `.toTitleCase()`). */
export function extendSnippetSource(source: string): string {
	if (hasExpressionExtension(source) && !hasNativeMethod(source)) {
		return extendTransform(source)?.code ?? source;
	}
	return source;
}

function getCompiledProgram(source: string): CompiledProgram {
	const cached = compiledProgramCache.get(source);
	if (cached) return cached;

	const code = getStandaloneExpressionCode(extendSnippetSource(source));
	// eslint-disable-next-line @typescript-eslint/no-implied-eval
	const program = new Function('E', code + ';') as CompiledProgram;

	if (compiledProgramCache.size >= MAX_COMPILED_CACHE_SIZE) {
		const oldestKey = compiledProgramCache.keys().next().value;
		if (oldestKey !== undefined) compiledProgramCache.delete(oldestKey);
	}
	compiledProgramCache.set(source, program);
	return program;
}

export function hasSnippets(sources: SnippetSources | undefined): sources is SnippetSources {
	if (!sources) return false;
	return (
		Object.keys(sources.global ?? {}).length > 0 || Object.keys(sources.project ?? {}).length > 0
	);
}

/** Transformed program code per snippet, ready for compilation in the VM isolate. */
export interface TransformedSnippetSources {
	global: Record<string, string>;
	project: Record<string, string>;
}

const transformedSourceCache = new Map<string, string>();

function getTransformedSource(source: string): string {
	const cached = transformedSourceCache.get(source);
	if (cached) return cached;

	const code = getStandaloneExpressionCode(extendSnippetSource(source));
	if (transformedSourceCache.size >= MAX_COMPILED_CACHE_SIZE) {
		const oldestKey = transformedSourceCache.keys().next().value;
		if (oldestKey !== undefined) transformedSourceCache.delete(oldestKey);
	}
	transformedSourceCache.set(source, code);
	return code;
}

/**
 * Transforms raw snippet sources through the sandbox pipeline for the VM
 * expression engine, which compiles them inside the isolate. A source that
 * fails to transform becomes a program that throws when the snippet is used.
 */
export function getTransformedSnippets(sources: SnippetSources): TransformedSnippetSources {
	const transform = (map: Record<string, string> = {}) => {
		const out: Record<string, string> = {};
		for (const [name, source] of Object.entries(map)) {
			if (!isSafeObjectProperty(name)) continue;
			try {
				out[name] = getTransformedSource(source);
			} catch (error) {
				const message = `Snippet "${name}" failed to compile: ${(error as Error).message}`;
				out[name] = `throw new Error(${JSON.stringify(message)})`;
			}
		}
		return out;
	};
	return { global: transform(sources.global), project: transform(sources.project) };
}

/**
 * Evaluates a single standalone expression against a prepared context.
 * The context is `this` inside the compiled program, so `$snippets`/`$json`/...
 * resolve against whatever the caller has bound onto it.
 */
export function evaluateSnippetExpression(source: string, data: IDataObject): unknown {
	return getCompiledProgram(source).call(data, noopErrorHandler);
}

/**
 * Validates that a snippet source is a single JS expression that compiles
 * through the expression sandbox transforms. Throws on invalid input.
 */
export function validateSnippetSource(source: string): void {
	if (/\.\s*constructor/.test(source)) {
		throw new ExpressionError('Snippet contains invalid constructor function call');
	}
	getStandaloneExpressionCode(extendSnippetSource(source));
}

function populateNamespace(
	namespace: Record<string, unknown>,
	sources: Record<string, string>,
	data: IDataObject,
): void {
	for (const [name, source] of Object.entries(sources)) {
		if (!isSafeObjectProperty(name)) continue;
		try {
			namespace[name] = getCompiledProgram(source).call(data, noopErrorHandler);
		} catch (error) {
			// A broken snippet must only fail where it's used, not break every expression
			Object.defineProperty(namespace, name, {
				enumerable: true,
				get() {
					throw new ExpressionError(`Snippet "${name}" failed to compile`, {
						cause: error as Error,
					});
				},
			});
		}
	}
}

/**
 * Binds `$snippets` / `$project` namespaces onto an expression data context from
 * the raw sources carried under `SNIPPETS_PROXY_KEY`. Snippets compile once
 * per source (process-wide cache) and re-bind to `data` per call, so a snippet
 * body sees the calling expression's scope ($json, $vars, ...).
 */
export function bindSnippets(data: IDataObject): void {
	const sources = data[SNIPPETS_PROXY_KEY] as SnippetSources | undefined;
	if (!hasSnippets(sources) || !isCodeGenerationSupported()) return;

	const globalSources = sources.global ?? {};
	const projectSources = sources.project ?? {};

	// ponytail: namespaces rebuild per evaluation (closure alloc only, parsing is
	// cached per source); memoize per data proxy if profiling ever demands it
	const globalNs: Record<string, unknown> = {};
	const projectNs: Record<string, unknown> = {};
	// Assign before populating so snippets can call each other through the namespaces.
	// Object.assign because function values don't fit IDataObject's index signature.
	Object.assign(data, { $snippets: globalNs, $project: projectNs });
	populateNamespace(globalNs, globalSources, data);
	populateNamespace(projectNs, projectSources, data);
	Object.freeze(globalNs);
	Object.freeze(projectNs);
}
