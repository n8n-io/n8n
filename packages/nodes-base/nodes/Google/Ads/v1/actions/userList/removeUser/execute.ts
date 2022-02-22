import {
	IExecuteFunctions
} from 'n8n-core';

import {
	INodeExecutionData
} from 'n8n-workflow';

import {
	addOperationsToOfflineUserDataJob,
	createOfflineUserDataJob,
	runOfflineUserDataJob
} from '../../offlineUserDataJob';

export async function removeUser(this: IExecuteFunctions, index: number): Promise<INodeExecutionData[]> {

	const createOfflineUserDataJobResponse = await createOfflineUserDataJob.call(this, index);
	const dataJobName = createOfflineUserDataJobResponse.resourceName as string;

	await addOperationsToOfflineUserDataJob.call(this, index, dataJobName, 'remove');

	const responseData = await runOfflineUserDataJob.call(this, index, dataJobName);

	return this.helpers.returnJsonArray(responseData);
}
