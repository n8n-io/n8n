import type { IExecuteFunctions } from 'n8n-core';
import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../../../../utils/utilities';
import { microsoftApiRequest } from '../../transport';
import { workbookRLC, worksheetRLC } from '../common.descriptions';

const properties: INodeProperties[] = [
	workbookRLC,
	worksheetRLC,
	{
		displayName: 'Apply To',
		name: 'applyTo',
		type: 'options',
		//values in capital case as required by api
		options: [
			{
				name: 'All',
				value: 'All',
			},
			{
				name: 'Formats',
				value: 'Formats',
				description: 'Clear formatting(e.g. font size, color) of cells',
			},
			{
				name: 'Contents',
				value: 'Contents',
				description: 'Clear data contained in cells',
			},
		],
		default: 'All',
	},
	{
		displayName: 'Select Range',
		name: 'selectRange',
		type: 'options',
		options: [
			{
				name: 'Whole Sheet',
				value: 'whole',
			},
			{
				name: 'Specify',
				value: 'specify',
			},
		],
		default: 'whole',
	},
	{
		displayName: 'Range',
		name: 'range',
		type: 'string',
		default: '',
		placeholder: 'e.g. A1:B2',
		description: 'The range of cells that will be cleared',
		displayOptions: {
			show: {
				selectRange: ['specify'],
			},
		},
	},
];

const displayOptions = {
	show: {
		resource: ['worksheet'],
		operation: ['clear'],
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

			const applyTo = this.getNodeParameter('applyTo', i) as string;
			const selectRange = this.getNodeParameter('selectRange', i) as string;

			if (selectRange === 'whole') {
				await microsoftApiRequest.call(
					this,
					'POST',
					`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/range/clear`,
					{ applyTo },
				);
			} else {
				const range = this.getNodeParameter('range', i) as string;
				await microsoftApiRequest.call(
					this,
					'POST',
					`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/range(address='${range}')/clear`,
					{ applyTo },
				);
			}

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
