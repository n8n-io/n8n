import type { IDestinationNode, IRunExecutionData } from './interfaces';

/**
 * Migrates legacy execution data to the current format.
 * This runs on-the-fly when reading from the database.
 */
export function migrateExecutionData(data: IRunExecutionData): IRunExecutionData {
	const version = data.version ?? 0;

	if (version === 0) {
		// Migrate v0 -> v1: Convert string destinationNode to IDestinationNode
		if (data.startData?.destinationNode) {
			const legacyDestinationNode = data.startData.destinationNode as unknown;
			if (typeof legacyDestinationNode === 'string') {
				data.startData.destinationNode = {
					nodeName: legacyDestinationNode,
					mode: 'inclusive', // This was the default behavior
				} satisfies IDestinationNode;
			}
		}
		data.version = 1;
	}

	// Future migrations would go here
	// if (version === 1) { ... }

	return data;
}
