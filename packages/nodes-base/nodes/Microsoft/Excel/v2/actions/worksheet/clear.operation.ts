import type { INodeExecutionData, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

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
				description: 'Clear data in cells and remove all formatting',
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
		displayName: 'Select a Range',
		name: 'useRange',
		type: 'boolean',
		default: false,
	},
	{
		displayName: 'Range',
		name: 'range',
		type: 'string',
		displayOptions: {
			show: {
				useRange: [true],
			},
		},
		placeholder: 'e.g. A1:B2',
		default: '',
		description: 'The sheet range that would be cleared, specified using a A1-style notation',
		hint: 'Leave blank for entire worksheet',
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
			const useRange = this.getNodeParameter('useRange', i, false) as boolean;

			if (!useRange) {
				await microsoftApiRequest.call(
					this,
					'POST',
					`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/range/clear`,
					{ applyTo },
				);
			} else {
				const range = this.getNodeParameter('range', i, '') as string;
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
