import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { microsoftApiRequest } from '../../transport';
import { workbookRLC, worksheetRLC } from '../common.descriptions';

const properties: INodeProperties[] = [
	workbookRLC,
	worksheetRLC,
	{
		displayName: 'Select Range',
		name: 'selectRange',
		type: 'options',
		options: [
			{
				name: 'Automatically',
				value: 'auto',
				description: 'The whole used range on the selected sheet will be converted into a table',
			},
			{
				name: 'Manually',
				value: 'manual',
				description: 'Select a range that will be converted into a table',
			},
		],
		default: 'auto',
	},
	{
		displayName: 'Range',
		name: 'range',
		type: 'string',
		default: '',
		placeholder: 'A1:B2',
		description: 'The range of cells that will be converted to a table',
		displayOptions: {
			show: {
				selectRange: ['manual'],
			},
		},
	},
	{
		displayName: 'Has Headers',
		name: 'hasHeaders',
		type: 'boolean',
		default: true,
		description:
			'Whether the range has column labels. When this property set to false Excel will automatically generate header shifting the data down by one row.',
	},
];

const displayOptions = {
	show: {
		resource: ['table'],
		operation: ['addTable'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	//https://learn.microsoft.com/en-us/graph/api/worksheet-post-tables?view=graph-rest-1.0
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const workbookId = this.getNodeParameter('workbook', i, undefined, {
				extractValue: true,
			}) as string;

			const worksheetId = this.getNodeParameter('worksheet', i, undefined, {
				extractValue: true,
			}) as string;

			const selectRange = this.getNodeParameter('selectRange', i) as string;

			const hasHeaders = this.getNodeParameter('hasHeaders', i) as boolean;

			let range = '';
			if (selectRange === 'auto') {
				const { address } = await microsoftApiRequest.call(
					this,
					'GET',
					`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/usedRange`,
					undefined,
					{
						select: 'address',
					},
				);
				range = address.split('!')[1];
			} else {
				range = this.getNodeParameter('range', i) as string;
			}

			const responseData = await microsoftApiRequest.call(
				this,
				'POST',
				`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/tables/add`,
				{
					address: range,
					hasHeaders,
				},
			);

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData as IDataObject),
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
