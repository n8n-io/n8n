import {
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { generatePairedItemData, updateDisplayOptions } from '@utils/utilities';
import type {
	JsonToSpreadsheetBinaryOptions,
	JsonToSpreadsheetBinaryFormat,
	JsonToBinaryOptions,
} from '@utils/binary';

import { convertJsonToSpreadsheetBinary, createBinaryFromJson } from '@utils/binary';
import { encodeDecodeOptions } from '@utils/descriptions';

import * as createEvent from '../../ICalendar/createEvent.operation';

const iCalDescription = updateDisplayOptions(
	{
		show: {
			operation: ['iCal'],
		},
	},
	createEvent.description.filter((property) => property.name !== 'binaryPropertyName'),
);

const spreadsheetOperations = ['csv', 'html', 'rtf', 'ods', 'xls', 'xlsx'];

export class ConvertToFile implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Convert to File',
		name: 'convertToFile',
		icon: 'fa:file-import',
		group: ['input'],
		version: 1,
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
						description: 'Converts all input data to a single file, each item will represent a row',
					},
					{
						name: 'Convert to HTML',
						value: 'html',
						action: 'Convert to HTML',
						description: 'Converts all input data to a single file, each item will represent a row',
					},
					{
						name: 'Convert to iCal',
						value: 'iCal',
						action: 'Convert to iCal',
						description: 'Converts each item to an iCal event',
					},
					{
						name: 'Convert to JSON',
						value: 'toJson',
						action: 'Convert to JSON',
						description:
							'Converts all input data to a single file, or each item to a separate file',
					},
					{
						name: 'Convert to ODS',
						value: 'ods',
						action: 'Convert to ODS',
						description: 'Converts all input data to a single file, each item will represent a row',
					},
					{
						name: 'Convert to RTF',
						value: 'rtf',
						action: 'Convert to RTF',
						description: 'Converts all input data to a single file, each item will represent a row',
					},
					{
						name: 'Convert to XLS',
						value: 'xls',
						action: 'Convert to XLS',
						description: 'Converts all input data to a single file, each item will represent a row',
					},
					{
						name: 'Convert to XLSX',
						value: 'xlsx',
						action: 'Convert to XLSX',
						description: 'Converts all input data to a single file, each item will represent a row',
					},
					{
						name: 'Move Base64 String to File',
						value: 'moveValueToBinary',
						action: 'Move base64 string to file',
						description:
							'Specify a property in the item that contains a base64 string to be converted into a file',
					},
				],
				default: 'csv',
			},
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						operation: ['toJson'],
					},
				},
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
				description: 'Name of the binary property to which to write the data of the file',
			},
			{
				displayName: 'Source Property',
				name: 'sourceProperty',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['moveValueToBinary'],
					},
				},
				default: '',
				required: true,
				placeholder: 'e.g data',
				description:
					'The name of the JSON key to get data from. It is also possible to define deep keys by using dot-notation like for example: "level1.level2.currentKey".',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					hide: {
						'/operation': ['iCal'],
					},
				},
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
						displayName: 'Data Is Base64',
						name: 'dataIsBase64',
						type: 'boolean',
						displayOptions: {
							show: {
								'/operation': ['moveValueToBinary'],
							},
						},
						default: true,
						description: 'Whether the data is already base64 encoded',
					},
					{
						displayName: 'Encoding',
						name: 'encoding',
						type: 'options',
						options: encodeDecodeOptions,
						displayOptions: {
							show: {
								'/operation': ['moveValueToBinary', 'toJson'],
							},
						},
						default: 'utf8',
						description: 'Set the encoding of the data stream',
					},
					{
						displayName: 'Add BOM',
						name: 'addBOM',
						displayOptions: {
							show: {
								'/operation': ['moveValueToBinary', 'toJson'],
								encoding: ['utf8', 'cesu8', 'ucs2'],
							},
						},
						type: 'boolean',
						default: false,
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
								'/operation': spreadsheetOperations,
							},
						},
					},
					{
						displayName: 'MIME Type',
						name: 'mimeType',
						type: 'string',
						displayOptions: {
							show: {
								'/operation': ['moveValueToBinary'],
							},
						},
						default: '',
						placeholder: 'e.g text/plain',
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
			...iCalDescription,
		],
	};

	async execute(this: IExecuteFunctions) {
		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0);
		let returnData: INodeExecutionData[] = [];

		if (spreadsheetOperations.includes(operation)) {
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
					throw error;
				}
			}
		}

		if (operation === 'toJson') {
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
						encoding: options.encoding as string,
						addBOM: options.addBOM as boolean,
					},
				);

				const newItem: INodeExecutionData = {
					json: {},
					binary: {
						[binaryPropertyName]: binaryData,
					},
					pairedItem,
				};

				returnData = [newItem];
			} else {
				for (let i = 0; i < items.length; i++) {
					const options = this.getNodeParameter('options', i, {});
					const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i, 'data');

					const binaryData = await createBinaryFromJson.call(this, items[i].json, {
						fileName: options.fileName as string,
						encoding: options.encoding as string,
						addBOM: options.addBOM as boolean,
						mimeType: 'application/json',
						itemIndex: i,
					});

					const newItem: INodeExecutionData = {
						json: {},
						binary: {
							[binaryPropertyName]: binaryData,
						},
						pairedItem: { item: i },
					};

					returnData.push(newItem);
				}
			}
		}

		if (operation === 'moveValueToBinary') {
			for (let i = 0; i < items.length; i++) {
				const options = this.getNodeParameter('options', i, {});
				const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i, 'data');
				const sourceProperty = this.getNodeParameter('sourceProperty', i) as string;

				const jsonToBinaryOptions: JsonToBinaryOptions = {
					sourceKey: sourceProperty,
					fileName: options.fileName as string,
					mimeType: options.mimeType as string,
					dataIsBase64: options.dataIsBase64 !== false,
					encoding: options.encoding as string,
					addBOM: options.addBOM as boolean,
					itemIndex: i,
				};

				const binaryData = await createBinaryFromJson.call(
					this,
					items[i].json,
					jsonToBinaryOptions,
				);

				const newItem: INodeExecutionData = {
					json: {},
					binary: {
						[binaryPropertyName]: binaryData,
					},
					pairedItem: { item: i },
				};

				returnData.push(newItem);
			}
		}

		if (operation === 'iCal') {
			returnData = await createEvent.execute.call(this, items);
		}

		return [returnData];
	}
}
