import type { IExecuteFunctions } from 'n8n-workflow';

import { extractCredentials } from './KeboolaV1.types';
import { extractUploadParams } from './KeboolaV1.utils';
import { handleUploadOperation } from './storageFunctions';

export async function keboolaNodeExecution(this: IExecuteFunctions) {
	try {
		const items = this.getInputData();

		const credentials = await extractCredentials.call(this);
		const params = extractUploadParams(this);

		const returnItems = await handleUploadOperation(params, credentials, items);
		return await this.prepareOutputData(returnItems);
	} catch (error: unknown) {
		console.error('Keboola node execution failed:', error);
		throw error;
	}
}
