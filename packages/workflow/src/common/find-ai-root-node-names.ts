/**
 * AI root nodes are the target of any `ai_*` connection — Agent/Chain nodes
 * to which language model, memory, tool, etc. sub-nodes attach. Pinning these
 * during eval short-circuits sub-node SDK calls.
 *
 * Accepts `unknown` so callers reading workflow JSON from the wire (which
 * arrives as `Record<string, unknown>`) can use it without an `as` cast.
 * Typed-`IConnections` callers assign in without widening.
 */
function isObjectRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

// `Array.isArray` narrows to `any[]` in lib.es5.d.ts; wrap it so the elements
// stay typed as `unknown` and downstream checks have to narrow explicitly.
function isUnknownArray(value: unknown): value is readonly unknown[] {
	return Array.isArray(value);
}

export function findAiRootNodeNames(connections: unknown): Set<string> {
	const roots = new Set<string>();
	if (!isObjectRecord(connections)) return roots;
	for (const nodeConns of Object.values(connections)) {
		if (!isObjectRecord(nodeConns)) continue;
		for (const [connType, outputs] of Object.entries(nodeConns)) {
			if (!connType.startsWith('ai_') || !isUnknownArray(outputs)) continue;
			for (const group of outputs) {
				if (!isUnknownArray(group)) continue;
				for (const conn of group) {
					if (isObjectRecord(conn) && typeof conn.node === 'string') {
						roots.add(conn.node);
					}
				}
			}
		}
	}
	return roots;
}
