/**
 * Contains all the data which is needed to execute a workflow and so also to
 * restart it again if it fails.
 * RunData, ExecuteData and WaitForExecution contain often the same data.
 *
 */

import type { IRunExecutionDataV0 } from './run-execution-data.v0';
import { runExecutionDataV0ToV1, type IRunExecutionDataV1 } from './run-execution-data.v1';

/**
 * All the versions of the interface.
 * !!! Only used at the data access layer to handle records saved under older versions. !!!
 * !!! All other code should use the current version, below. !!!
 */
export type IRunExecutionDataAll = IRunExecutionDataV0 | IRunExecutionDataV1;

const __brand = Symbol('brand');

/**
 * Current version of IRunExecutionData.
 */
export type IRunExecutionData = IRunExecutionDataV1 & {
	[__brand]: 'Use createRunExecutionData factory instead of constructing manually';
};

export function migrateRunExecutionData(data: IRunExecutionDataAll): IRunExecutionData {
	switch (data.version) {
		case 0:
		case undefined: // Missing version means version 0
			data = runExecutionDataV0ToV1(data);
		// Fall through to subsequent versions as they're added.
	}

	if (data.version !== 1) {
		throw new Error(
			`Unsupported IRunExecutionData version: ${(data as { version?: number }).version}`,
		);
	}

	return data as IRunExecutionData;
}
