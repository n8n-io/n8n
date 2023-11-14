import {
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { generatePairedItemData } from '@utils/utilities';
import type { JsonToSpreadsheetBinaryOptions, JsonToSpreadsheetBinaryFormat } from '@utils/binary';
import { convertJsonToSpreadsheetBinary, createBinaryFromJson } from '@utils/binary';

export class ConvertToFile implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Convert to File',
		name: 'convertToFile',
		icon: 'fa:file-import',
		group: ['input'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Convert JSON data to binary data',
		defaults: {
			name: 'Convert to File',
			color: '#999999',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'hidden',
				noDataExpression: true,
				default: 'file',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['file'],
					},
				},
				options: [
					{
						name: 'Convert to CSV',
						value: 'csv',
						action: 'Convert to CSV',
					},
					{
						name: 'Convert to HTML',
						value: 'html',
						action: 'Convert to HTML',
					},
					{
						name: 'Convert to iCal',
						value: 'iCal',
						action: 'Convert to iCal',
					},
					{
						name: 'Convert to JSON',
						value: 'json',
						action: 'Convert to JSON',
					},
					{
						name: 'Convert to ODS',
						value: 'ods',
						action: 'Convert to ODS',
					},
					{
						name: 'Convert to RTF',
						value: 'rtf',
						action: 'Convert to RTF',
					},
					{
						name: 'Convert to XLS',
						value: 'xls',
						action: 'Convert to XLS',
					},
					{
						name: 'Convert to XLSX',
						value: 'xlsx',
						action: 'Convert to XLSX',
					},
					{
						name: 'Move Base64 String to File',
						value: 'encodedString',
						action: 'Move base64 string to file',
					},
				],
				default: 'csv',
			},
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'All Items to One File',
						value: 'once',
					},
					{
						name: 'Each Item to Separate File',
						value: 'each',
					},
				],
				default: 'once',
			},
			{
				displayName: 'File Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				placeholder: 'e.g data',
				description: 'Name of the binary property to which to write the data of the files',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
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
						description: 'Whether compression will be applied or not',
					},
					{
						displayName: 'File Name',
						name: 'fileName',
						type: 'string',
						default: '',
						description: 'File name to set in binary data',
					},
					{
						displayName: 'Header Row',
						name: 'headerRow',
						type: 'boolean',
						default: true,
						description: 'Whether the first row of the file contains the header names',
						displayOptions: {
							show: {
								'/operation': ['csv', 'html', 'rtf', 'ods', 'xls', 'xlsx'],
							},
						},
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
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions) {
		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0);
		const newItems: INodeExecutionData[] = [];

		if (['csv', 'html', 'rtf', 'ods', 'xls', 'xlsx'].includes(operation)) {
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

				newItems.push(newItem);
			} catch (error) {
				if (this.continueOnFail()) {
					newItems.push({
						json: {
							error: error.message,
						},
						pairedItem,
					});
				} else {
					throw error;
				}
			}
		}

		if (operation === 'json') {
			const mode = this.getNodeParameter('mode', 0, 'once') as string;
			if (mode === 'once') {
				const options = this.getNodeParameter('options', 0, {});
				const binaryPropertyName = this.getNodeParameter('binaryPropertyName', 0, 'data');
				const pairedItem = generatePairedItemData(items.length);

				const binaryData = await createBinaryFromJson.call(
					this,
					items.map((item) => item.json),
					{
						fileName: options.fileName as string,
						mimeType: 'application/json',
					},
				);

				const newItem: INodeExecutionData = {
					json: {},
					binary: {
						[binaryPropertyName]: binaryData,
					},
					pairedItem,
				};

				newItems.push(newItem);
			} else {
				for (let i = 0; i < items.length; i++) {
					const options = this.getNodeParameter('options', i, {});
					const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i, 'data');
					const pairedItem = generatePairedItemData(items.length);

					const binaryData = await createBinaryFromJson.call(this, items[i].json, {
						fileName: options.fileName as string,
						mimeType: 'application/json',
						itemIndex: i,
					});

					const newItem: INodeExecutionData = {
						json: {},
						binary: {
							[binaryPropertyName]: binaryData,
						},
						pairedItem,
					};

					newItems.push(newItem);
				}
			}
		}
		return [newItems];
	}
}
