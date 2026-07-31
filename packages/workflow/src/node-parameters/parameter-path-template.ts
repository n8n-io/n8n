/**
 * Native (engine-free) resolution of node-description templates that are a
 * plain `$parameter` lookup, e.g. `={{$parameter["path"]}}` or
 * `={{$parameter["httpMethod"] || "GET"}}`.
 *
 * `$parameter` is a Proxy over `node.parameters` (see `nodeParameterGetter` in
 * `workflow-data-proxy.ts`) whose only behaviours beyond a plain property read
 * are resolving `=` values through the expression engine, unwrapping
 * resource-locator values, and `&sibling` lookups. So for a node whose
 * parameters contain neither an expression nor a resource-locator value —
 * `nodeParametersAreStatic()` below — `$parameter["a"]["b"]` is exactly
 * `node.parameters.a.b`, and templates of this shape can be resolved without
 * an expression engine (and, under `N8N_EXPRESSION_ENGINE=vm`, without an
 * isolate).
 */

import type { INode, INodeParameters } from '../interfaces';
import { isResourceLocatorValue } from '../type-guards';

/**
 * A whole-value single expression reading `$parameter` — one or more path
 * segments (`["a"]`, `['a']`, `[0]`, `.a`) with an optional `|| <literal>`
 * tail. Anchored on purpose: interpolation forms such as
 * `=prefix-{{$parameter["x"]}}` (which concatenate) and anything else the
 * engine would treat differently must not match.
 */
const PARAMETER_PATH_TEMPLATE_RE =
	/^=\s*\{\{\s*\$parameter((?:\[\s*(?:'[^']*'|"[^"]*"|\d+)\s*\]|\.[A-Za-z_$][\w$]*)+)\s*(?:\|\|\s*('[^']*'|"[^"]*"|-?\d+(?:\.\d+)?|true|false|null|undefined))?\s*\}\}\s*$/;

/** Matches one path segment of the above, capturing the key. */
const SEGMENT_RE = /\[\s*(?:'([^']*)'|"([^"]*)"|(\d+))\s*\]|\.([A-Za-z_$][\w$]*)/g;

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

/**
 * Returns the parsed template if `value` is a plain `$parameter` lookup,
 * `null` otherwise (in which case the caller must fall back to the engine).
 */
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
 * Resolves a matched template against a node's parameters. Property access
 * follows plain JS (as the engine's `$parameter` proxy does), except that
 * walking into a nullish value yields `undefined` instead of throwing —
 * matching what the engine returns for the same reference.
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

	// `||` in the template is plain JS truthiness, so mirror it exactly.
	if (template.hasFallback && !current) return template.fallback;

	return current;
}

export type NativeResolution = { resolved: true; value: unknown } | { resolved: false };

const NOT_RESOLVED: NativeResolution = { resolved: false };

/**
 * Resolves a template against a node's parameters without the expression
 * engine, when the template is a plain `$parameter` lookup and the node's
 * parameters are static. Returns `{ resolved: false }` otherwise — the caller
 * must then evaluate the template as before.
 */
export function resolveNativeParameterTemplate(
	node: Pick<INode, 'parameters'>,
	template: unknown,
): NativeResolution {
	if (!nodeParametersAreStatic(node)) return NOT_RESOLVED;

	const match = matchParameterPathTemplate(template);
	if (!match) return NOT_RESOLVED;

	return { resolved: true, value: resolveParameterPathTemplate(match, node.parameters) };
}

/**
 * Whether a node's parameters can stand in for the expression engine's
 * `$parameter` proxy: no expression values to resolve and no resource-locator
 * values to unwrap. See the module doc comment for why these two are the whole
 * list.
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
