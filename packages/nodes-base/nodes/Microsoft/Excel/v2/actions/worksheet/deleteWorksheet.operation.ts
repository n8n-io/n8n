import type { IExecuteFunctions } from 'n8n-core';
import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../../../../utils/utilities';
import { microsoftApiRequest } from '../../transport';
import { workbookRLC, worksheetRLC } from '../common.descriptions';

const properties: INodeProperties[] = [workbookRLC, worksheetRLC];

const displayOptions = {
	show: {
		resource: ['worksheet'],
		operation: ['deleteWorksheet'],
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

			const worksheetId = this.getNodeParameter('worksheet', i, undefined, {
				extractValue: true,
			}) as string;

			await microsoftApiRequest.call(
				this,
				'DELETE',
				`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}`,
			);

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray({ success: true }),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
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
