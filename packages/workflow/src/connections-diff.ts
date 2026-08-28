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

/**
 * Reads a value only when it is an own property, so an inherited key such as
 * "__proto__" resolves to `undefined` (via the Object.prototype accessor) rather
 * than to the prototype object itself.
 */
function ownValue<T>(map: Record<string, T>, key: string): T | undefined {
	return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined;
}

/**
 * Creates a prototype-less dictionary so a dynamic key such as "__proto__" is
 * stored as an ordinary own key instead of resolving through the
 * Object.prototype accessor.
 */
function nullProtoRecord<T>(): Record<string, T> {
	return Object.create(null) as Record<string, T>;
}

export function compareConnections(prev: IConnections, next: IConnections): ConnectionsDiff {
	// Prototype-less accumulators so a node/input name of "__proto__" becomes an
	// ordinary own key instead of resolving through the Object.prototype accessor.
	const added: Record<string, INodeConnectionsDiff> = nullProtoRecord<INodeConnectionsDiff>();
	const removed: Record<string, INodeConnectionsDiff> = nullProtoRecord<INodeConnectionsDiff>();

	// Get all unique node names from both connection objects
	const allNodeNames = new Set([...Object.keys(prev), ...Object.keys(next)]);

	for (const nodeName of allNodeNames) {
		const prevNodeConnections = ownValue(prev, nodeName) ?? {};
		const nextNodeConnections = ownValue(next, nodeName) ?? {};

		// Get all unique input names for this node
		const allInputNames = new Set([
			...Object.keys(prevNodeConnections),
			...Object.keys(nextNodeConnections),
		]);

		for (const inputName of allInputNames) {
			const prevInputConnections = ownValue(prevNodeConnections, inputName) ?? [];
			const nextInputConnections = ownValue(nextNodeConnections, inputName) ?? [];

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
						if (!added[nodeName]) added[nodeName] = nullProtoRecord<ConnectionEntry[]>();
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
						if (!removed[nodeName]) removed[nodeName] = nullProtoRecord<ConnectionEntry[]>();
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
