import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { microsoftApiRequest } from '../../transport';
import { workbookRLC } from '../common.descriptions';

const properties: INodeProperties[] = [workbookRLC];

const displayOptions = {
	show: {
		resource: ['workbook'],
		operation: ['deleteWorkbook'],
	},
};
export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const workbookId = this.getNodeParameter('workbook', i, undefined, {
				extractValue: true,
			}) as string;

			try {
				await microsoftApiRequest.call(this, 'DELETE', `/drive/items/${workbookId}`);
			} catch (error) {
				if (error?.description.includes('Lock token does not match existing lock')) {
					const errorDescription =
						'Lock token does not match existing lock, this error could happen if the file is opened in the browser or the Office client, please close file and try again.';

					throw new NodeOperationError(this.getNode(), error as Error, {
						itemIndex: i,
						description: errorDescription,
					});
				} else {
					throw error;
				}
			}

			const responseData = { success: true };

			if (Array.isArray(responseData)) {
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} else if (responseData !== undefined) {
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			}
		} catch (error) {
			if (this.continueOnFail()) {
				const executionErrorData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({ error: error.message }),
					{ itemData: { item: i } },
				);
				returnData.push(...executionErrorData);
				continue;
			}
			throw error;
		}
	}

	return returnData;
}
