import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';

import {
	extractCredentials,
	extractExtractParams,
	extractUploadParams,
	createContextualError,
} from './KeboolaV1.utils';
import { handleExtractOperation, handleUploadOperation } from './storageFunctions';

export async function keboolaNodeExecution(this: IExecuteFunctions) {
	try {
		const items = this.getInputData();
		const credentials = await extractCredentials(this);
		const operation = this.getNodeParameter('operation', 0) as string;

		let returnItems: INodeExecutionData[] = [];

		switch (operation) {
			case 'extract': {
				const params = extractExtractParams(this);
				returnItems = await handleExtractOperation(params, credentials);
				break;
			}

			case 'upload': {
				const params = extractUploadParams(this);
				returnItems = await handleUploadOperation(params, credentials, items);
				break;
			}

			default:
				throw new UnexpectedError(`Unknown operation: ${operation}`);
		}

		return await this.prepareOutputData(returnItems);
	} catch (error: unknown) {
		let logMessage = 'Keboola node execution failed';
		if (error instanceof Error) {
			logMessage += `: ${error.message}`;
		} else if (typeof error === 'string') {
			logMessage += `: ${error}`;
		} else {
			logMessage += ': Unknown error';
		}
		console.error(logMessage);

		let operation = 'unknown';
		try {
			operation = this.getNodeParameter('operation', 0) as string;
		} catch {}

		throw createContextualError(error, operation);
	}
}
