/**
 * Single-source declaration of webhook-description fields.
 *
 * A webhook description needs values derived from the node instance's
 * parameters, historically encoded as expression templates such as
 * `={{$parameter["path"]}}`. The editor still needs those strings (they are
 * what survives the JSON serialization of node descriptions), but on the
 * backend they force the expression engine (under `N8N_EXPRESSION_ENGINE=vm`,
 * a V8 isolate) into every webhook request even when the user authored no
 * expression.
 *
 * The helpers here generate the template string and a native resolver from one
 * declaration, so the two cannot drift. Backend resolution sites call
 * {@link resolveWebhookDescriptionField} first and only fall back to the engine
 * when the user's parameters actually contain expressions.
 *
 * TODO(simple-path rollout): this whole module is transitional. Once lazy
 * isolate acquisition and the simple-expression fast path are the defaults,
 * a plain inline template in the simple grammar costs a cached parse plus a
 * host-side interpretation — no isolate, no prediction. Delete this module
 * (with the `webhookPhaseNeedsIsolate` gate and its flag) and revert the
 * descriptions to plain inline template strings.
 */

import type {
	INode,
	INodeParameters,
	IWebhookDescription,
	NativeParameterResolvers,
	NodeParameterValueType,
} from './interfaces';
import { WEBHOOK_RESOLVERS } from './interfaces';
import { isResourceLocatorValue } from './type-guards';

export type WebhookDescriptionField = NativeParameterResolvers[string];

/**
 * A field that reads a node parameter, e.g. `fromParameter('httpMethod', 'GET')`
 * → template `={{$parameter["httpMethod"] || "GET"}}` and a resolver applying
 * the same truthiness fallback. Nested reads take a path array. Walking into a
 * missing parent yields `undefined`, matching what the engine returns for the
 * same reference.
 *
 * TODO(simple-path rollout): remove — the template alone suffices (see module
 * doc).
 */
export function fromParameter(path: string | string[], fallback?: string): WebhookDescriptionField {
	const segments = Array.isArray(path) ? path : [path];
	const accessor = segments.map((segment) => `["${segment}"]`).join('');
	const tail = fallback === undefined ? '' : ` || ${JSON.stringify(fallback)}`;

	return {
		template: `={{$parameter${accessor}${tail}}}`,
		resolve: (parameters) => {
			let current: unknown = parameters;
			for (const key of segments) {
				if (current === null || current === undefined) return fallback;
				current = (current as INodeParameters)[key];
			}
			// `||` in the template is plain JS truthiness, not a nullish check.
			if (fallback !== undefined && !current) return fallback;
			return current as NodeParameterValueType | undefined;
		},
	};
}

/**
 * A field computed by a function of the parameters: the template inlines the
 * function's source and the resolver is the function itself, so both
 * representations run the same code.
 *
 * The function MUST be self-contained: closing over an outer identifier (an
 * import, a module constant) produces a template the expression sandbox cannot
 * evaluate. The parity test in the Webhook node's description.test.ts catches
 * this; add one for any node that declares `fromFunction` fields.
 *
 * TODO(simple-path rollout): remove — its inlined-function templates are never
 * simple, so rewrite any remaining use as a plain simple-grammar template (see
 * module doc).
 */
export function fromFunction<P extends INodeParameters>(
	fn: (parameters: P) => NodeParameterValueType | undefined,
): WebhookDescriptionField {
	return {
		template: `={{(${String(fn)})($parameter)}}`,
		resolve: fn as WebhookDescriptionField['resolve'],
	};
}

/**
 * A field whose template is hand-written in the simple-expression grammar
 * (path traversal, `?.`, ternary, `||`) instead of inlining a function like
 * {@link fromFunction}. Such a template stays evaluatable by the host-side
 * fast path, so it never forces the engine (an isolate) even when the node's
 * parameters hold expressions and the native resolver declines.
 *
 * Template and resolver are two representations of the same logic. Drift is
 * caught by executing both: the node's description parity tests must cover
 * every branch (see the Webhook node's description.test.ts), and a test must
 * assert the template classifies as simple (`isSimpleExpression`).
 *
 * TODO(simple-path rollout): remove — drop the resolver and inline the
 * template string directly in the description (see module doc).
 */
export function fromExpression<P extends INodeParameters>(
	template: string,
	resolve: (parameters: P) => NodeParameterValueType | undefined,
): WebhookDescriptionField {
	return { template, resolve: resolve as WebhookDescriptionField['resolve'] };
}

/**
 * Spreads into an {@link IWebhookDescription}: the template string per field,
 * plus the resolver map under the backend-only {@link WEBHOOK_RESOLVERS} key.
 */
export function webhookDescriptionFields<K extends string>(
	fields: Record<K, WebhookDescriptionField>,
): Record<K, string> & { [WEBHOOK_RESOLVERS]: NativeParameterResolvers } {
	const templates = {} as Record<K, string>;
	const resolvers: NativeParameterResolvers = {};
	for (const [field, entry] of Object.entries<WebhookDescriptionField>(fields)) {
		templates[field as K] = entry.template;
		resolvers[field] = entry;
	}
	return { ...templates, [WEBHOOK_RESOLVERS]: resolvers };
}

export type NativeResolution =
	| { resolved: true; value: NodeParameterValueType | undefined }
	| { resolved: false };

const NOT_RESOLVED: NativeResolution = { resolved: false };

/**
 * Resolves a description field without the expression engine when the field
 * declares a resolver, still carries the exact template that resolver was
 * generated from (a description built by spreading another inherits resolvers
 * for fields it overrides), and the node's parameters are static.
 *
 * Pass the workflow's own node (`workflow.nodes[name]`): its parameters
 * include the defaults the `Workflow` constructor applies.
 */
export function resolveWebhookDescriptionField(
	node: Pick<INode, 'parameters'>,
	description: IWebhookDescription,
	field: string,
): NativeResolution {
	const entry = description[WEBHOOK_RESOLVERS]?.[field];
	if (entry === undefined || description[field] !== entry.template) return NOT_RESOLVED;
	if (!nodeParametersAreStatic(node)) return NOT_RESOLVED;
	return { resolved: true, value: entry.resolve(node.parameters) };
}

/**
 * Whether every field of the description is engine-free for a static-parameter
 * node: either a resolver is declared for it, or the value contains no
 * expression template at any depth. A template added later without a resolver
 * makes this false, so callers skipping isolate acquisition on the strength of
 * this stay correct automatically.
 */
export function webhookDescriptionIsNativelyResolvable(description: IWebhookDescription): boolean {
	const resolvers = description[WEBHOOK_RESOLVERS];
	return Object.entries(description).every(
		([field, value]) => resolvers?.[field]?.template === value || !containsDynamicValue(value),
	);
}

/**
 * Whether a node's parameters can stand in for the `$parameter` proxy: beyond a
 * plain property read, the proxy only resolves `=` values, unwraps
 * resource-locator values and handles `&sibling` lookups — all of which require
 * a dynamic value somewhere in the parameters.
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
