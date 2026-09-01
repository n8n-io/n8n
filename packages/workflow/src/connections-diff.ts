import type { IConnection, IConnections } from '.';

type ConnectionEntry = {
	sourceIndex: number;
	value: { index: number; connection: IConnection } | null;
};

export type INodeConnectionsDiff = Record<string, ConnectionEntry[]>;

export type ConnectionsDiff = {
	added: Record<string, INodeConnectionsDiff>;
	removed: Record<string, INodeConnectionsDiff>;
};

/**
 * Groups connections by their serialized value, keeping every occurrence.
 * A bucket may hold the same connection more than once, so comparing by value
 * alone would collapse the duplicates and hide added or removed ones.
 */
function groupByValue(connections: IConnection[]) {
	const byValue = new Map<string, Array<NonNullable<ConnectionEntry['value']>>>();

	connections.forEach((connection, index) => {
		const key = JSON.stringify(connection);
		const entries = byValue.get(key);

		if (entries) entries.push({ index, connection });
		else byValue.set(key, [{ index, connection }]);
	});

	return byValue;
}

export function compareConnections(prev: IConnections, next: IConnections): ConnectionsDiff {
	const added: Record<string, INodeConnectionsDiff> = {};
	const removed: Record<string, INodeConnectionsDiff> = {};

	// Get all unique node names from both connection objects
	const allNodeNames = new Set([...Object.keys(prev), ...Object.keys(next)]);

	for (const nodeName of allNodeNames) {
		const prevNodeConnections = prev[nodeName] ?? {};
		const nextNodeConnections = next[nodeName] ?? {};

		// Get all unique input names for this node
		const allInputNames = new Set([
			...Object.keys(prevNodeConnections),
			...Object.keys(nextNodeConnections),
		]);

		for (const inputName of allInputNames) {
			const prevInputConnections = prevNodeConnections[inputName] ?? [];
			const nextInputConnections = nextNodeConnections[inputName] ?? [];

			// Compare each source index
			const maxLength = Math.max(prevInputConnections.length, nextInputConnections.length);

			for (let sourceIndex = 0; sourceIndex < maxLength; sourceIndex++) {
				const prevConnections = prevInputConnections[sourceIndex] ?? [];
				const nextConnections = nextInputConnections[sourceIndex] ?? [];

				// Build maps for easier comparison
				const prevMap = groupByValue(prevConnections);
				const nextMap = groupByValue(nextConnections);

				// Find added connections
				for (const [key, entries] of nextMap) {
					const kept = prevMap.get(key)?.length ?? 0;
					for (const value of entries.slice(kept)) {
						if (!added[nodeName]) added[nodeName] = {};
						if (!added[nodeName][inputName]) added[nodeName][inputName] = [];

						added[nodeName][inputName].push({
							sourceIndex,
							value,
						});
					}
				}

				// Find removed connections
				for (const [key, entries] of prevMap) {
					const kept = nextMap.get(key)?.length ?? 0;
					for (const value of entries.slice(kept)) {
						if (!removed[nodeName]) removed[nodeName] = {};
						if (!removed[nodeName][inputName]) removed[nodeName][inputName] = [];

						removed[nodeName][inputName].push({
							sourceIndex,
							value,
						});
					}
				}
			}
		}
	}

	return { added, removed };
}
