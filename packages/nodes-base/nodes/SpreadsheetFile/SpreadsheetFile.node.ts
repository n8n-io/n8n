import type { IExecuteFunctions } from 'n8n-core';

import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { JSON2SheetOpts, Sheet2JSONOpts, WorkBook, WritingOptions } from 'xlsx';
import { read as xlsxRead, utils as xlsxUtils, write as xlsxWrite } from 'xlsx';

/**
 * Flattens an object with deep data
 *
 * @param {IDataObject} data The object to flatten
 */
function flattenObject(data: IDataObject) {
	const returnData: IDataObject = {};
	for (const key1 of Object.keys(data)) {
		if (data[key1] !== null && typeof data[key1] === 'object') {
			if (data[key1] instanceof Date) {
				returnData[key1] = data[key1]?.toString();
				continue;
			}
			const flatObject = flattenObject(data[key1] as IDataObject);
			for (const key2 in flatObject) {
				if (flatObject[key2] === undefined) {
					continue;
				}
				returnData[`${key1}.${key2}`] = flatObject[key2];
			}
		} else {
			returnData[key1] = data[key1];
		}
	}
	return returnData;
}

export class SpreadsheetFile implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Spreadsheet File',
		name: 'spreadsheetFile',
		icon: 'fa:table',
		group: ['transform'],
		version: 1,
		description: 'Reads and writes data from a spreadsheet file like CSV, XLS, ODS, etc',
		defaults: {
			name: 'Spreadsheet File',
			color: '#2244FF',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Read From File',
						value: 'fromFile',
						description: 'Reads data from a spreadsheet file',
						action: 'Read data from a spreadsheet file',
					},
					{
						name: 'Write to File',
						value: 'toFile',
						description: 'Writes the workflow data to a spreadsheet file',
						action: 'Write data to a spreadsheet file',
					},
				],
				default: 'fromFile',
			},

			// ----------------------------------
			//         fromFile
			// ----------------------------------
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						operation: ['fromFile'],
					},
				},
				placeholder: '',
				description:
					'Name of the binary property from which to read the binary data of the spreadsheet file',
			},

			// ----------------------------------
			//         toFile
			// ----------------------------------
			{
				displayName: 'File Format',
				name: 'fileFormat',
				type: 'options',
				options: [
					{
						name: 'CSV',
						value: 'csv',
						description: 'Comma-separated values',
					},
					{
						name: 'HTML',
						value: 'html',
						description: 'HTML Table',
					},
					{
						name: 'ODS',
						value: 'ods',
						description: 'OpenDocument Spreadsheet',
					},
					{
						name: 'RTF',
						value: 'rtf',
						description: 'Rich Text Format',
					},
					{
						name: 'XLS',
						value: 'xls',
						description: 'Excel',
					},
					{
						name: 'XLSX',
						value: 'xlsx',
						description: 'Excel',
					},
				],
				default: 'xls',
				displayOptions: {
					show: {
						operation: ['toFile'],
					},
				},
				description: 'The format of the file to save the data as',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						operation: ['toFile'],
					},
				},
				placeholder: '',
				description:
					'Name of the binary property in which to save the binary data of the spreadsheet file',
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
								'/operation': ['toFile'],
								'/fileFormat': ['xlsx', 'ods'],
							},
						},
						default: false,
						description: 'Whether compression will be applied or not',
					},
					{
						displayName: 'File Name',
						name: 'fileName',
						type: 'string',
						displayOptions: {
							show: {
								'/operation': ['toFile'],
							},
						},
						default: '',
						description:
							'File name to set in binary data. By default will "spreadsheet.&lt;fileFormat&gt;" be used.',
					},
					{
						displayName: 'Header Row',
						name: 'headerRow',
						type: 'boolean',
						displayOptions: {
							show: {
								'/operation': ['fromFile', 'toFile'],
							},
						},
						default: true,
						description: 'Whether the first row of the file contains the header names',
					},
					{
						displayName: 'Include Empty Cells',
						name: 'includeEmptyCells',
						type: 'boolean',
						displayOptions: {
							show: {
								'/operation': ['fromFile'],
							},
						},
						default: false,
						// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
						description:
							'When reading from file the empty cells will be filled with an empty string in the JSON',
					},
					{
						displayName: 'RAW Data',
						name: 'rawData',
						type: 'boolean',
						displayOptions: {
							show: {
								'/operation': ['fromFile'],
							},
						},
						default: false,
						description: 'Whether the data should be returned RAW instead of parsed',
					},
					{
						displayName: 'Read As String',
						name: 'readAsString',
						type: 'boolean',
						displayOptions: {
							show: {
								'/operation': ['fromFile'],
							},
						},
						default: false,
						// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
						description:
							'In some cases and file formats, it is necessary to read specifically as string else some special character get interpreted wrong',
					},
					{
						displayName: 'Range',
						name: 'range',
						type: 'string',
						displayOptions: {
							show: {
								'/operation': ['fromFile'],
							},
						},
						default: '',
						description:
							'The range to read from the table. If set to a number it will be the starting row. If set to string it will be used as A1-style bounded range.',
					},
					{
						displayName: 'Sheet Name',
						name: 'sheetName',
						type: 'string',
						displayOptions: {
							show: {
								'/operation': ['fromFile'],
							},
						},
						default: 'Sheet',
						description:
							'Name of the sheet to read from in the spreadsheet (if supported). If not set, the first one gets chosen.',
					},
					{
						displayName: 'Sheet Name',
						name: 'sheetName',
						type: 'string',
						displayOptions: {
							show: {
								'/operation': ['toFile'],
								'/fileFormat': ['ods', 'xls', 'xlsx'],
							},
						},
						default: 'Sheet',
						description: 'Name of the sheet to create in the spreadsheet',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const operation = this.getNodeParameter('operation', 0);

		const newItems: INodeExecutionData[] = [];

		if (operation === 'fromFile') {
			// Read data from spreadsheet file to workflow

			let item: INodeExecutionData;
			for (let i = 0; i < items.length; i++) {
				try {
					item = items[i];

					const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
					const options = this.getNodeParameter('options', i, {});

					if (item.binary === undefined || item.binary[binaryPropertyName] === undefined) {
						// Property did not get found on item
						continue;
					}

					// Read the binary spreadsheet data
					const binaryData = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
					let workbook;
					if (options.readAsString === true) {
						workbook = xlsxRead(binaryData.toString(), {
							type: 'string',
							raw: options.rawData as boolean,
						});
					} else {
						workbook = xlsxRead(binaryData, { raw: options.rawData as boolean });
					}

					if (workbook.SheetNames.length === 0) {
						throw new NodeOperationError(this.getNode(), 'Spreadsheet does not have any sheets!', {
							itemIndex: i,
						});
					}

					let sheetName = workbook.SheetNames[0];
					if (options.sheetName) {
						if (!workbook.SheetNames.includes(options.sheetName as string)) {
							throw new NodeOperationError(
								this.getNode(),
								`Spreadsheet does not contain sheet called "${options.sheetName}"!`,
								{ itemIndex: i },
							);
						}
						sheetName = options.sheetName as string;
					}

					// Convert it to json
					const sheetToJsonOptions: Sheet2JSONOpts = {};
					if (options.range) {
						if (isNaN(options.range as number)) {
							sheetToJsonOptions.range = options.range;
						} else {
							sheetToJsonOptions.range = parseInt(options.range as string, 10);
						}
					}

					if (options.includeEmptyCells) {
						sheetToJsonOptions.defval = '';
					}
					if (options.headerRow === false) {
						sheetToJsonOptions.header = 1; // Consider the first row as a data row
					}

					const sheetJson = xlsxUtils.sheet_to_json(workbook.Sheets[sheetName], sheetToJsonOptions);

					// Check if data could be found in file
					if (sheetJson.length === 0) {
						continue;
					}

					// Add all the found data columns to the workflow data
					if (options.headerRow === false) {
						// Data was returned as an array - https://github.com/SheetJS/sheetjs#json
						for (const rowData of sheetJson) {
							newItems.push({
								json: {
									row: rowData,
								},
								pairedItem: {
									item: i,
								},
							} as INodeExecutionData);
						}
					} else {
						for (const rowData of sheetJson) {
							newItems.push({
								json: rowData,
								pairedItem: {
									item: i,
								},
							} as INodeExecutionData);
						}
					}
				} catch (error) {
					if (this.continueOnFail()) {
						newItems.push({
							json: {
								error: error.message,
							},
							pairedItem: {
								item: i,
							},
						});
						continue;
					}
					throw error;
				}
			}

			return this.prepareOutputData(newItems);
		} else if (operation === 'toFile') {
			try {
				// Write the workflow data to spreadsheet file
				const binaryPropertyName = this.getNodeParameter('binaryPropertyName', 0);
				const fileFormat = this.getNodeParameter('fileFormat', 0) as string;
				const options = this.getNodeParameter('options', 0, {});
				const sheetToJsonOptions: JSON2SheetOpts = {};
				if (options.headerRow === false) {
					sheetToJsonOptions.skipHeader = true;
				}
				// Get the json data of the items and flatten it
				let item: INodeExecutionData;
				const itemData: IDataObject[] = [];
				for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
					item = items[itemIndex];
					itemData.push(flattenObject(item.json));
				}

				const ws = xlsxUtils.json_to_sheet(itemData, sheetToJsonOptions);

				const wopts: WritingOptions = {
					bookSST: false,
					type: 'buffer',
				};

				if (fileFormat === 'csv') {
					wopts.bookType = 'csv';
				} else if (fileFormat === 'html') {
					wopts.bookType = 'html';
				} else if (fileFormat === 'rtf') {
					wopts.bookType = 'rtf';
				} else if (fileFormat === 'ods') {
					wopts.bookType = 'ods';
					if (options.compression) {
						wopts.compression = true;
					}
				} else if (fileFormat === 'xls') {
					wopts.bookType = 'xls';
				} else if (fileFormat === 'xlsx') {
					wopts.bookType = 'xlsx';
					if (options.compression) {
						wopts.compression = true;
					}
				}

				// Convert the data in the correct format
				const sheetName = (options.sheetName as string) || 'Sheet';
				const wb: WorkBook = {
					SheetNames: [sheetName],
					Sheets: {
						[sheetName]: ws,
					},
				};
				const wbout: Buffer = xlsxWrite(wb, wopts);

				// Create a new item with only the binary spreadsheet data
				const newItem: INodeExecutionData = {
					json: {},
					binary: {},
					pairedItem: {
						item: 0,
					},
				};

				let fileName = `spreadsheet.${fileFormat}`;
				if (options.fileName !== undefined) {
					fileName = options.fileName as string;
				}

				newItem.binary![binaryPropertyName] = await this.helpers.prepareBinaryData(wbout, fileName);

				newItems.push(newItem);
			} catch (error) {
				if (this.continueOnFail()) {
					newItems.push({
						json: {
							error: error.message,
						},
						pairedItem: {
							item: 0,
						},
					});
				} else {
					throw error;
				}
			}
		} else {
			if (this.continueOnFail()) {
				return this.prepareOutputData([
					{ json: { error: `The operation "${operation}" is not supported!` } },
				]);
			} else {
				throw new NodeOperationError(
					this.getNode(),
					`The operation "${operation}" is not supported!`,
				);
			}
		}
		return this.prepareOutputData(newItems);
	}
}
