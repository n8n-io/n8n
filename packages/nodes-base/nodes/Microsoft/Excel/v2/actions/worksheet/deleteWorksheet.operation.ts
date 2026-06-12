import type { INodeExecutionData, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { parseWorkbook } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';
import { workbookRLC, workbookSourceCollection, worksheetRLC } from '../common.descriptions';

const properties: INodeProperties[] = [workbookRLC, worksheetRLC, workbookSourceCollection];

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
			const workbookValue = this.getNodeParameter('workbook', i, undefined, {
				extractValue: true,
			}) as string;
			const { root, workbookId } = parseWorkbook(workbookValue);

			const worksheetId = this.getNodeParameter('worksheet', i, undefined, {
				extractValue: true,
			}) as string;

			await microsoftApiRequest.call(
				this,
				'DELETE',
				`${root}/items/${workbookId}/workbook/worksheets/${worksheetId}`,
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
