import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import type { ExcelResponse } from '../../helpers/interfaces';
import { checkRange, prepareOutput } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';
import { workbookRLC, worksheetRLC } from '../common.descriptions';

const properties: INodeProperties[] = [
	workbookRLC,
	worksheetRLC,
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
		placeholder: 'e.g. A1:B2',
		default: '',
		description:
			'The sheet range to read the data from specified using a A1-style notation, has to be specific e.g A1:B5, generic ranges like A:B are not supported',
		hint: 'Leave blank to return entire sheet',
		displayOptions: {
			show: {
				useRange: [true],
			},
		},
	},
	{
		displayName: 'Header Row',
		name: 'keyRow',
		type: 'number',
		typeOptions: {
			minValue: 0,
		},
		default: 0,
		hint: 'Index of the row which contains the column names',
		description: "Relative to selected 'Range', first row index is 0",
		displayOptions: {
			show: {
				useRange: [true],
			},
		},
	},
	{
		displayName: 'First Data Row',
		name: 'dataStartRow',
		type: 'number',
		typeOptions: {
			minValue: 0,
		},
		default: 1,
		hint: 'Index of first row which contains the actual data',
		description: "Relative to selected 'Range', first row index is 0",
		displayOptions: {
			show: {
				useRange: [true],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'RAW Data',
				name: 'rawData',
				type: 'boolean',
				// eslint-disable-next-line n8n-nodes-base/node-param-default-wrong-for-boolean
				default: 0,
				description:
					'Whether the data should be returned RAW instead of parsed into keys according to their header',
			},
			{
				displayName: 'Data Property',
				name: 'dataProperty',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						rawData: [true],
					},
				},
				description: 'The name of the property into which to write the RAW data',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Fields the response will containt. Multiple can be added separated by ,.',
				displayOptions: {
					show: {
						rawData: [true],
					},
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['worksheet'],
		operation: ['readRows'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	//https://docs.microsoft.com/en-us/graph/api/worksheet-range?view=graph-rest-1.0&tabs=http
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		const qs: IDataObject = {};
		try {
			const workbookId = this.getNodeParameter('workbook', i, undefined, {
				extractValue: true,
			}) as string;

			const worksheetId = this.getNodeParameter('worksheet', i, undefined, {
				extractValue: true,
			}) as string;

			const options = this.getNodeParameter('options', i, {});

			const range = this.getNodeParameter('range', i, '') as string;
			checkRange(this.getNode(), range);

			const rawData = (options.rawData as boolean) || false;

			if (rawData && options.fields) {
				qs.$select = options.fields;
			}

			let responseData;
			if (range) {
				responseData = await microsoftApiRequest.call(
					this,
					'GET',
					`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/range(address='${range}')`,
					{},
					qs,
				);
			} else {
				responseData = await microsoftApiRequest.call(
					this,
					'GET',
					`/drive/items/${workbookId}/workbook/worksheets/${worksheetId}/usedRange`,
					{},
					qs,
				);
			}

			if (!rawData) {
				const keyRow = this.getNodeParameter('keyRow', i, 0) as number;
				const firstDataRow = this.getNodeParameter('dataStartRow', i, 1) as number;

				returnData.push(
					...prepareOutput.call(this, this.getNode(), responseData as ExcelResponse, {
						rawData,
						keyRow,
						firstDataRow,
					}),
				);
			} else {
				const dataProperty = (options.dataProperty as string) || 'data';
				returnData.push(
					...prepareOutput.call(this, this.getNode(), responseData as ExcelResponse, {
						rawData,
						dataProperty,
					}),
				);
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
