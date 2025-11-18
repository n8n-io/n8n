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

/**
 * Current version of IRunExecutionData.
 *
 * TODO: make V1 the default.
 */
export type IRunExecutionData = IRunExecutionDataV1;

export function migrateRunExecutionData(data: IRunExecutionDataAll): IRunExecutionData {
	switch (data.version) {
		case 0:
			data = runExecutionDataV0ToV1(data);
		// Fall through to subsequent versions as they're added.
	}
	return data as IRunExecutionData;
}
