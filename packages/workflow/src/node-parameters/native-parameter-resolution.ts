/**
 * Native (engine-free) resolution of node-description templates that are a
 * plain `$parameter` lookup, e.g. `={{$parameter["path"]}}` or
 * `={{$parameter["httpMethod"] || "GET"}}`.
 *
 * Beyond a plain property read, the `$parameter` proxy (`nodeParameterGetter` in
 * `workflow-data-proxy.ts`) only resolves `=` values, unwraps resource-locator
 * values and handles `&sibling` lookups. So while a node's parameters hold none
 * of those, `$parameter["a"]["b"]` is exactly `node.parameters.a.b` — no engine
 * needed, and under `N8N_EXPRESSION_ENGINE=vm` no isolate either.
 *
 * Other template shapes need a declared native equivalent; see
 * {@link NativeParameterResolvers}.
 */

import type { INode, INodeParameters, NativeParameterResolvers } from '../interfaces';
import { isResourceLocatorValue } from '../type-guards';

/**
 * A whole-value `$parameter` read: one or more path segments with an optional
 * `|| <literal>` tail. Anchored on purpose — interpolation forms such as
 * `=prefix-{{$parameter["x"]}}` concatenate, so they must not match.
 *
 * Quoted parts exclude `\` and newlines: `parseLiteral` only strips the quotes,
 * so an escape sequence would resolve raw where the engine unescapes it.
 */
const PARAMETER_PATH_TEMPLATE_RE =
	/^=\s*\{\{\s*\$parameter((?:\[\s*(?:'[^'\\\r\n]*'|"[^"\\\r\n]*"|\d+)\s*\]|\.[A-Za-z_$][\w$]*)+)\s*(?:\|\|\s*('[^'\\\r\n]*'|"[^"\\\r\n]*"|-?\d+(?:\.\d+)?|true|false|null|undefined))?\s*\}\}\s*$/;

/** Matches one path segment of the above, capturing the key. */
const SEGMENT_RE = /\[\s*(?:'([^'\\\r\n]*)'|"([^"\\\r\n]*)"|(\d+))\s*\]|\.([A-Za-z_$][\w$]*)/g;

export interface ParameterPathTemplate {
	/** Property keys to walk, in order. */
	path: string[];
	/** Value to fall back to when the lookup is falsy, from a `|| <literal>` tail. */
	fallback?: unknown;
	/** Whether the template had a `||` tail at all. */
	hasFallback: boolean;
}

function parseLiteral(literal: string): unknown {
	switch (literal) {
		case 'true':
			return true;
		case 'false':
			return false;
		case 'null':
			return null;
		case 'undefined':
			return undefined;
		default:
			if (literal.startsWith("'") || literal.startsWith('"')) return literal.slice(1, -1);
			return Number(literal);
	}
}

/** Returns `null` if `value` is not a plain `$parameter` lookup — caller must use the engine. */
export function matchParameterPathTemplate(value: unknown): ParameterPathTemplate | null {
	if (typeof value !== 'string') return null;

	const match = PARAMETER_PATH_TEMPLATE_RE.exec(value);
	if (!match) return null;

	const path: string[] = [];
	for (const segment of match[1].matchAll(SEGMENT_RE)) {
		const key = segment[1] ?? segment[2] ?? segment[3] ?? segment[4];
		// `$parameter["&x"]` is a sibling-parameter lookup handled by the proxy,
		// not a property read — leave it to the engine.
		if (key.startsWith('&')) return null;
		path.push(key);
	}

	const literal = match[2];
	return literal === undefined
		? { path, hasFallback: false }
		: { path, hasFallback: true, fallback: parseLiteral(literal) };
}

/**
 * Walking into a nullish value yields `undefined` rather than throwing, which is
 * what the engine returns for the same reference.
 */
export function resolveParameterPathTemplate(
	template: ParameterPathTemplate,
	parameters: INodeParameters,
): unknown {
	let current: unknown = parameters;
	for (const key of template.path) {
		if (current === null || current === undefined) return undefined;
		current = (current as INodeParameters)[key];
	}

	// Intentionally not a nullish check: `||` in the template is plain JS truthiness.
	if (template.hasFallback && !current) return template.fallback;

	return current;
}

export type NativeResolution = { resolved: true; value: unknown } | { resolved: false };

const NOT_RESOLVED: NativeResolution = { resolved: false };

/**
 * Resolves a description value from the description's own `resolver` if it
 * declares one, otherwise from a plain `$parameter` template. Both read
 * `node.parameters` directly, which only stands in for the `$parameter` proxy
 * while the parameters are static and `node` is the workflow's own node object —
 * the proxy reads `workflow.nodes[node.name]`, defaults and all.
 */
export function resolveNativeParameterValue(
	node: Pick<INode, 'parameters'>,
	value: unknown,
	resolver?: NativeParameterResolvers[string],
): NativeResolution {
	if (resolver) {
		if (!nodeParametersAreStatic(node)) return NOT_RESOLVED;
		return { resolved: true, value: resolver(node.parameters) };
	}

	// Matched before the deep scan: a regex over a short string is far cheaper.
	const match = matchParameterPathTemplate(value);
	if (!match || !nodeParametersAreStatic(node)) return NOT_RESOLVED;

	return { resolved: true, value: resolveParameterPathTemplate(match, node.parameters) };
}

/**
 * Checked over all values at any depth, not the subset a caller happens to read:
 * a template added to a description later must not silently invalidate a caller
 * that skipped acquiring an isolate on the strength of this.
 */
export function valuesAreNativelyResolvable(
	values: object,
	resolvers?: NativeParameterResolvers,
): boolean {
	return Object.entries(values).every(([field, value]) => {
		if (resolvers?.[field]) return true;
		return valueIsNativelyResolvable(value);
	});
}

function valueIsNativelyResolvable(value: unknown): boolean {
	if (typeof value === 'string') {
		return !value.startsWith('=') || matchParameterPathTemplate(value) !== null;
	}

	if (Array.isArray(value)) return value.every(valueIsNativelyResolvable);

	if (value !== null && typeof value === 'object') {
		return Object.keys(value).every((key) => valueIsNativelyResolvable(Reflect.get(value, key)));
	}

	return true;
}

/**
 * Whether a node's parameters can stand in for the `$parameter` proxy: no
 * expression values, no resource-locator values. See the module doc.
 */
export function nodeParametersAreStatic(node: Pick<INode, 'parameters'>): boolean {
	return !containsDynamicValue(node.parameters);
}

function containsDynamicValue(value: unknown): boolean {
	if (typeof value === 'string') return value.startsWith('=');

	if (Array.isArray(value)) return value.some(containsDynamicValue);

	if (value !== null && typeof value === 'object') {
		if (isResourceLocatorValue(value)) return true;
		return Object.keys(value).some((key) => containsDynamicValue(Reflect.get(value, key)));
	}

	return false;
}
