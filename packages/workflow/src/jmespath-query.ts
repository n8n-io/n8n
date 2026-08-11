import * as jmespath from 'jmespath';

import { containsUnsafeObjectPropertyToken } from './utils';

/** Thrown when a query is rejected by the property-name security guard. */
export class JmespathQueryError extends Error {
	override name = 'JmespathQueryError';
}

/**
 * Evaluate a JMESPath query against arbitrary JSON data, applying the same
 * property-name security guard n8n uses for the `$jmespath()` expression
 * helper. Throws `JmespathQueryError` for guarded queries and rethrows
 * jmespath's own parser errors for invalid syntax.
 */
export function evaluateJmespathQuery(data: unknown, query: string): unknown {
	if (query.includes('\\') || containsUnsafeObjectPropertyToken(query)) {
		throw new JmespathQueryError(
			'Cannot access this property in a jmespath query due to security concerns',
		);
	}

	// `null` is not a plain object: skip the spread and let jmespath handle it.
	if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
		// Spread strips any proxy wrappers, mirroring workflow-data-proxy.
		return jmespath.search({ ...(data as Record<string, unknown>) }, query);
	}

	return jmespath.search(data as Parameters<typeof jmespath.search>[0], query);
}
