import type { IExecuteFunctions, INodeExecutionData, ProjectFilesOperation } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import * as file from './file/File.resource';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	let operationResult: INodeExecutionData[] = [];

	const items = this.getInputData();
	const operation = this.getNodeParameter('operation', 0) as ProjectFilesOperation;

	for (let i = 0; i < items.length; i++) {
		try {
			const responseData = await file[operation].execute.call(this, i);
			const executionData = this.helpers.constructExecutionMetaData(responseData, {
				itemData: { item: i },
			});
			operationResult = operationResult.concat(executionData);
		} catch (error) {
			if (this.continueOnFail()) {
				const inputData = this.getInputData(i)[0].json;
				if (error instanceof NodeApiError || error instanceof NodeOperationError) {
					operationResult.push({ json: inputData, error });
				} else {
					operationResult.push({
						json: inputData,
						error: new NodeOperationError(this.getNode(), error as Error),
					});
				}
			} else {
				throw error;
			}
		}
	}

	return [operationResult];
}
