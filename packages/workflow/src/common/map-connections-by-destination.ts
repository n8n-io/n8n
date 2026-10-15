/* eslint-disable @typescript-eslint/no-for-in-array */

import { UserError } from '../errors';
import type { IConnections, NodeConnectionType } from '../interfaces';

export const MAX_CONNECTION_INDEX = 1000;

export const MAX_DESTINATION_INPUT_SLOTS = 100_000;

export function mapConnectionsByDestination(connections: IConnections) {
	const returnConnection: IConnections = {};

	let connectionInfo;
	let maxIndex: number;
	let inputSlots = 0;
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
					if (connectionInfo.index > MAX_CONNECTION_INDEX) {
						throw new UserError(
							`Connection from "${sourceNode}" to "${connectionInfo.node}" has an input index above ${MAX_CONNECTION_INDEX}`,
						);
					}
					if (!returnConnection.hasOwnProperty(connectionInfo.node)) {
						returnConnection[connectionInfo.node] = {};
					}
					if (!returnConnection[connectionInfo.node].hasOwnProperty(connectionInfo.type)) {
						returnConnection[connectionInfo.node][connectionInfo.type] = [];
					}

					maxIndex = returnConnection[connectionInfo.node][connectionInfo.type].length - 1;
					inputSlots += Math.max(0, connectionInfo.index - maxIndex);
					if (inputSlots > MAX_DESTINATION_INPUT_SLOTS) {
						throw new UserError(
							`Workflow connections use more than ${MAX_DESTINATION_INPUT_SLOTS} input slots`,
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
