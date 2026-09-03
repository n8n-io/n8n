/* eslint-disable @typescript-eslint/no-for-in-array */

import type { IConnections, NodeConnectionType } from '../interfaces';

// Connection indexes address node outputs, which are single digits in
// practice. Cap the padding so a corrupt or hostile stored workflow cannot
// turn a few bytes into gigabytes of empty buckets (#37783).
const MAX_CONNECTION_INDEX = 10_000;

export function mapConnectionsByDestination(connections: IConnections) {
	const returnConnection: IConnections = {};

	let connectionInfo;
	let maxIndex: number;
	for (const sourceNode in connections) {
		if (!connections.hasOwnProperty(sourceNode)) {
			continue;
		}

		for (const type of Object.keys(connections[sourceNode]) as NodeConnectionType[]) {
			if (!connections[sourceNode].hasOwnProperty(type)) {
				continue;
			}

			for (const inputIndex in connections[sourceNode][type]) {
				if (!connections[sourceNode][type].hasOwnProperty(inputIndex)) {
					continue;
				}

				for (connectionInfo of connections[sourceNode][type][inputIndex] ?? []) {
					if (!returnConnection.hasOwnProperty(connectionInfo.node)) {
						returnConnection[connectionInfo.node] = {};
					}
					if (!returnConnection[connectionInfo.node].hasOwnProperty(connectionInfo.type)) {
						returnConnection[connectionInfo.node][connectionInfo.type] = [];
					}

					maxIndex = returnConnection[connectionInfo.node][connectionInfo.type].length - 1;
					if (connectionInfo.index > MAX_CONNECTION_INDEX) {
						throw new Error(
							`Connection index ${connectionInfo.index} exceeds the maximum of ${MAX_CONNECTION_INDEX}`,
						);
					}
					for (let j = maxIndex; j < connectionInfo.index; j++) {
						returnConnection[connectionInfo.node][connectionInfo.type].push([]);
					}

					returnConnection[connectionInfo.node][connectionInfo.type][connectionInfo.index]?.push({
						node: sourceNode,
						type,
						index: parseInt(inputIndex, 10),
					});
				}
			}
		}
	}

	return returnConnection;
}
