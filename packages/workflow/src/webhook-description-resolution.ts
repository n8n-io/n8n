/**
 * Engine-free resolution of `webhookDescription` fields.
 *
 * A webhook node's description fields are almost all expression templates
 * (`path: '={{$parameter["path"]}}'`, …) that depend only on `$parameter`, so
 * they are re-evaluated on every incoming request. Under
 * `N8N_EXPRESSION_ENGINE=vm` that means a V8 isolate is needed to serve a
 * request even when the workflow itself contains no expression at all. These
 * helpers resolve such fields natively instead; `LiveWebhooks` uses
 * `webhookDescriptionIsNativelyResolvable` to decide whether the webhook phase
 * can skip acquiring an isolate entirely.
 */

import type { INode, IWebhookDescription } from './interfaces';
import type { NativeResolution } from './node-parameters/parameter-path-template';
import {
	matchParameterPathTemplate,
	nodeParametersAreStatic,
	resolveNativeParameterTemplate,
} from './node-parameters/parameter-path-template';

const NOT_RESOLVED: NativeResolution = { resolved: false };

/**
 * Resolves a webhook description field without the expression engine, from the
 * node's own `resolve` map or from a plain `$parameter` template. Returns
 * `{ resolved: false }` when the field needs the engine — the caller must then
 * evaluate it as before.
 *
 * Values that are not expressions (plain strings, booleans, `undefined`) are
 * deliberately reported as unresolved: the engine's own short-circuit already
 * returns them without evaluating anything, so there is no isolate to save and
 * no behaviour to reimplement here.
 */
export function resolveWebhookDescriptionValue(
	node: INode,
	webhookDescription: IWebhookDescription,
	field: string,
): NativeResolution {
	// The `resolve` functions and the `$parameter` path walk both read
	// `node.parameters` directly, which only stands in for the engine's
	// `$parameter` proxy while the parameters are static.
	if (!nodeParametersAreStatic(node)) return NOT_RESOLVED;

	const resolver = webhookDescription.resolve?.[field];
	if (resolver) return { resolved: true, value: resolver(node.parameters) };

	return resolveNativeParameterTemplate(node, webhookDescription[field]);
}

/**
 * Whether every field of a webhook description can be resolved without the
 * expression engine — either natively (`resolve` entry or plain `$parameter`
 * template) or because it is not an expression in the first place.
 *
 * Checked over all fields rather than the subset the webhook phase happens to
 * read today, so a template added to a description later cannot silently
 * invalidate a caller that relies on this.
 */
export function webhookDescriptionIsNativelyResolvable(
	webhookDescription: IWebhookDescription,
): boolean {
	return Object.entries(webhookDescription).every(([field, value]) => {
		if (field === 'resolve') return true;
		if (webhookDescription.resolve?.[field]) return true;
		if (typeof value !== 'string' || !value.startsWith('=')) return true;
		return matchParameterPathTemplate(value) !== null;
	});
}
