import {
	NodeOperationError,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';

import type { JsonToSpreadsheetBinaryOptions, JsonToSpreadsheetBinaryFormat } from '@utils/binary';
import { convertJsonToSpreadsheetBinary } from '@utils/binary';
import { generatePairedItemData, updateDisplayOptions } from '@utils/utilities';

export const operations = ['csv', 'html', 'rtf', 'ods', 'xls', 'xlsx'];

export const properties: INodeProperties[] = [
	{
		displayName: 'Put Output File in Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		placeholder: 'e.g data',
		hint: 'The name of the output binary field to put the file in',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Compression',
				name: 'compression',
				type: 'boolean',
				displayOptions: {
					show: {
						'/operation': ['xlsx', 'ods'],
					},
				},
				default: false,
				description: 'Whether to reduce the output file size',
			},
			{
				displayName: 'Delimiter',
				name: 'delimiter',
				type: 'string',
				displayOptions: {
					show: {
						'/operation': ['csv'],
					},
				},
				default: ',',
				description: 'The character to use to separate fields',
			},
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: '',
				description: 'Name of the output file',
			},
			{
				displayName: 'Header Row',
				name: 'headerRow',
				type: 'boolean',
				default: true,
				description: 'Whether the first row of the file contains the header names',
			},
			{
				displayName: 'Sheet Name',
				name: 'sheetName',
				type: 'string',
				displayOptions: {
					show: {
						'/operation': ['ods', 'xls', 'xlsx'],
					},
				},
				default: 'Sheet',
				description: 'Name of the sheet to create in the spreadsheet',
				placeholder: 'e.g. mySheet',
			},
		],
	},
];

const displayOptions = {
	show: {
		operation: operations,
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
	operation: string,
) {
	let returnData: INodeExecutionData[] = [];

	const pairedItem = generatePairedItemData(items.length);
	try {
		const options = this.getNodeParameter('options', 0, {}) as JsonToSpreadsheetBinaryOptions;
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', 0, 'data');

		const binaryData = await convertJsonToSpreadsheetBinary.call(
			this,
			items,
			operation as JsonToSpreadsheetBinaryFormat,
			options,
			'File',
		);

		const newItem: INodeExecutionData = {
			json: {},
			binary: {
				[binaryPropertyName]: binaryData,
			},
			pairedItem,
		};

		returnData = [newItem];
	} catch (error) {
		if (this.continueOnFail()) {
			returnData.push({
				json: {
					error: error.message,
				},
				pairedItem,
			});
		} else {
			throw new NodeOperationError(this.getNode(), error);
		}
	}

	return returnData;
}
