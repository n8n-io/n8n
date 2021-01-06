import {
	get,
	set,
} from 'lodash';

import {
	BINARY_ENCODING,
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	read as xlsxRead,
	Sheet2JSONOpts,
	utils as xlsxUtils,
	WorkBook,
	write as xlsxWrite,
	WritingOptions,
} from 'xlsx';


/**
 * Flattens an object with deep data
 *
 * @param {IDataObject} data The object to flatten
 * @returns
 */
function flattenObject (data: IDataObject) {
	const returnData: IDataObject = {};
	for (const key1 of Object.keys(data)) {
		if (data[key1] !== null && (typeof data[key1]) === 'object') {
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
		description: 'Reads and writes data from a spreadsheet file.',
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
				options: [
					{
						name: 'Read from file',
						value: 'fromFile',
						description: 'Reads data from a spreadsheet file',
					},
					{
						name: 'Write to file',
						value: 'toFile',
						description: 'Writes the workflow data to a spreadsheet file',
					},
					{
						name: 'Read from JSON',
						value: 'fromJson',
						description: 'Read spreadsheet from JSON',
					},
					{
						name: 'Write to JSON',
						value: 'toJson',
						description: 'Write spreadsheet to JSON',
					},
				],
				default: 'fromFile',
				description: 'The operation to perform.',
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
						operation: [
							'fromFile',
						],
					},

				},
				placeholder: '',
				description: 'Name of the binary property from which to read<br />the binary data of the spreadsheet file.',
			},
			
			// ----------------------------------
			//         fromJson
			// ----------------------------------
			{
				displayName: 'Source Key',
				name: 'sourceKey',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'fromJson',
						],
					},
				},
				default: 'data',
				required: true,
				placeholder: 'data',
				description: 'The name of the JSON key to get data from.<br />It is also possible to define deep keys by using dot-notation like for example:<br />"level1.level2.currentKey"',
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
						operation: [
							'toFile',
						],
					},
				},
				description: 'The format of the file to save the data as.',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'toFile',
						],
					},
				},
				placeholder: '',
				description: 'Name of the binary property in which to save<br />the binary data of the spreadsheet file.',
			},
			// ----------------------------------
			//         toJson
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
				],
				default: 'csv',
				displayOptions: {
					show: {
						operation: [
							'toJson',
						],
					},
				},
				description: 'The format of the file to save the data as.',
			},
			{
				displayName: 'Destination Key',
				name: 'destinationKey',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'toJson',
						],
					},
				},
				default: 'data',
				required: true,
				placeholder: '',
				description: 'The name the JSON key to copy data to. It is also possible<br />to define deep keys by using dot-notation like for example:<br />"level1.level2.newKey"',
			},

			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					// ----------------------------------
					//         fromFile
					// ----------------------------------
					{
						displayName: 'Include Empty Cells',
						name: 'includeEmptyCells',
						type: 'boolean',
						displayOptions: {
							show: {
								'/operation': [
									'fromFile',
								],
							},
						},
						default: false,
						description: 'When reading from file the empty cells will be filled with an empty string in the JSON.',
					},
					{
						displayName: 'RAW Data',
						name: 'rawData',
						type: 'boolean',
						displayOptions: {
							show: {
								'/operation': [
									'fromFile',
								],
							},
						},
						default: false,
						description: 'If the data should be returned RAW instead of parsed.',
					},
					{
						displayName: 'Read As String',
						name: 'readAsString',
						type: 'boolean',
						displayOptions: {
							show: {
								'/operation': [
									'fromFile',
								],
							},
						},
						default: false,
						description: 'In some cases and file formats, it is necessary to read<br />specifically as string else some special character get interpreted wrong.',
					},
					{
						displayName: 'Delimiter',
						name: 'delimiter',
						type: 'string',
						displayOptions: {
							show: {
								'/operation': [
									'fromFile',
								]
							},
						},
						default: '',
						description: 'Change the delimiter for reading.',
					},
					{
						displayName: 'Range',
						name: 'range',
						type: 'string',
						displayOptions: {
							show: {
								'/operation': [
									'fromFile',
								],
							},
						},
						default: '',
						description: 'The range to read from the table.<br />If set to a number it will be the starting row.<br />If set to string it will be used as A1-style bounded range.',
					},
					{
						displayName: 'Sheet Name',
						name: 'sheetName',
						type: 'string',
						displayOptions: {
							show: {
								'/operation': [
									'fromFile',
								],
							},
						},
						default: 'Sheet',
						description: 'Name of the sheet to read from in the spreadsheet (if supported). If not set, the first one gets chosen.',
					},
					// ----------------------------------
					//         fromJson
					// ----------------------------------
					{
						displayName: 'RAW Data',
						name: 'rawData',
						type: 'boolean',
						displayOptions: {
							show: {
								'/operation': [
									'fromJson',
								],
							},
						},
						default: false,
						description: 'If the data should be returned RAW instead of parsed.',
					},
					{
						displayName: 'Delimiter',
						name: 'delimiter',
						type: 'string',
						displayOptions: {
							show: {
								'/operation': [
									'fromJson',
								]
							},
						},
						default: '',
						description: 'Change the delimiter for reading.',
					},
					// ----------------------------------
					//         toFile
					// ----------------------------------
					{
						displayName: 'Compression',
						name: 'compression',
						type: 'boolean',
						displayOptions: {
							show: {
								'/operation': [
									'toFile',
								],
								'/fileFormat': [
									'xlsx',
									'ods',
								],
							},
						},
						default: false,
						description: 'Weather compression will be applied or not',
					},
					{
						displayName: 'File Name',
						name: 'fileName',
						type: 'string',
						displayOptions: {
							show: {
								'/operation': [
									'toFile',
								],
							},
						},
						default: '',
						description: 'File name to set in binary data. By default will "spreadsheet.<fileFormat>" be used.',
					},
					{
						displayName: 'Delimiter',
						name: 'delimiter',
						type: 'string',
						displayOptions: {
							show: {
								'/operation': [
									'toFile',
								],
								'/fileFormat': [
									'csv',
								],
							},
						},
						default: '',
						description: 'Change the delimiter for writing.',
					},
					{
						displayName: 'Sheet Name',
						name: 'sheetName',
						type: 'string',
						displayOptions: {
							show: {
								'/operation': [
									'toFile',
								],
								'/fileFormat': [
									'ods',
									'xls',
									'xlsx',
								],
							},
						},
						default: 'Sheet',
						description: 'Name of the sheet to create in the spreadsheet.',
					},
					// ----------------------------------
					//         toJson
					// ----------------------------------
					{
						displayName: 'Delimiter',
						name: 'delimiter',
						type: 'string',
						displayOptions: {
							show: {
								'/operation': [
									'toJson',
								],
								'/fileFormat': [
									'csv',
								],
							},
						},
						default: '',
						description: 'Change the delimiter for writing.',
					},
				],
			},
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();

		const operation = this.getNodeParameter('operation', 0) as string;

		const newItems: INodeExecutionData[] = [];

		if (operation === 'fromFile') {
			// Read data from spreadsheet file to workflow

			let item: INodeExecutionData;
			for (let i = 0; i < items.length; i++) {
				item = items[i];

				const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
				const options = this.getNodeParameter('options', i, {}) as IDataObject;

				if (item.binary === undefined || item.binary[binaryPropertyName] === undefined) {
					// Property did not get found on item
					continue;
				}

				// Read the binary spreadsheet data
				let binaryData = Buffer.from(item.binary[binaryPropertyName].data, BINARY_ENCODING);
				if (options.delimiter) {
					binaryData = Buffer.concat([new Buffer('sep=' + options.delimiter + '\n'), binaryData])
				}
				let workbook;
				if (options.readAsString === true) {
					workbook = xlsxRead(binaryData.toString(), { type: 'string', raw: options.rawData as boolean });
				} else {
					workbook = xlsxRead(binaryData, { raw: options.rawData as boolean });
				}

				if (workbook.SheetNames.length === 0) {
					throw new Error('Spreadsheet does not have any sheets!');
				}

				let sheetName = workbook.SheetNames[0];
				if (options.sheetName) {
					if (!workbook.SheetNames.includes(options.sheetName as string)) {
						throw new Error(`Spreadsheet does not contain sheet called "${options.sheetName}"!`);
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

				const sheetJson = xlsxUtils.sheet_to_json(workbook.Sheets[sheetName], sheetToJsonOptions);

				// Check if data could be found in file
				if (sheetJson.length === 0) {
					continue;
				}

				// Add all the found data columns to the workflow data
				for (const rowData of sheetJson) {
					newItems.push({ json: rowData } as INodeExecutionData);
				}
			}

			return this.prepareOutputData(newItems);
		} else if (operation === 'fromJson') {
			// Read data from spreadsheet string to workflow

			let item: INodeExecutionData;
			for (let i = 0; i < items.length; i++) {
				item = items[i];

				const sourceKey = this.getNodeParameter('sourceKey', i) as string;
				const options = this.getNodeParameter('options', i, {}) as IDataObject;
				
				const workbook = xlsxRead(options.delimiter ? 'sep=' + options.delimiter + '\n' + get(item.json, sourceKey) : get(item.json, sourceKey), { raw: options.rawData as boolean });

				if (workbook.SheetNames.length === 0) {
					throw new Error('Spreadsheet does not have any sheets!');
				}

				let sheetName = workbook.SheetNames[0];
				if (options.sheetName) {
					if (!workbook.SheetNames.includes(options.sheetName as string)) {
						throw new Error(`Spreadsheet does not contain sheet called "${options.sheetName}"!`);
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

				const sheetJson = xlsxUtils.sheet_to_json(workbook.Sheets[sheetName], sheetToJsonOptions);

				// Check if data could be found in file
				if (sheetJson.length === 0) {
					continue;
				}

				// Add all the found data columns to the workflow data
				for (const rowData of sheetJson) {
					newItems.push({ json: rowData } as INodeExecutionData);
				}
			}

			return this.prepareOutputData(newItems);
		} else if (operation === 'toFile') {
			// Write the workflow data to spreadsheet file
			const binaryPropertyName = this.getNodeParameter('binaryPropertyName', 0) as string;
			const fileFormat = this.getNodeParameter('fileFormat', 0) as string;
			const options = this.getNodeParameter('options', 0, {}) as IDataObject;

			// Get the json data of the items and flatten it
			let item: INodeExecutionData;
			const itemData: IDataObject[] = [];
			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				item = items[itemIndex];
				itemData.push(flattenObject(item.json));
			}

			const ws = xlsxUtils.json_to_sheet(itemData);
			let wbout;
			
			if (fileFormat === 'csv') {
				wbout = Buffer.from(xlsxUtils.sheet_to_csv(ws, {
					FS: options.delimiter ? options.delimiter as string : ','
				}));
			} else {
				const wopts: WritingOptions = {
					bookSST: false,
					type: 'buffer',
				};

				if (fileFormat === 'html') {
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
				const sheetName = options.sheetName as string || 'Sheet';
				const wb: WorkBook = {
					SheetNames: [sheetName],
					Sheets: {
						[sheetName]: ws,
					},
				};
				wbout = xlsxWrite(wb, wopts);
			}

			// Create a new item with only the binary spreadsheet data
			const newItem: INodeExecutionData = {
				json: {},
				binary: {},
			};

			let fileName = `spreadsheet.${fileFormat}`;
			if (options.fileName !== undefined) {
				fileName = options.fileName as string;
			}

			newItem.binary![binaryPropertyName] = await this.helpers.prepareBinaryData(wbout, fileName);

			return this.prepareOutputData([newItem]);
		} else if (operation === 'toJson') {
			const fileFormat = this.getNodeParameter('fileFormat', 0) as string;
			const destinationKey = this.getNodeParameter('destinationKey', 0) as string;
			const options = this.getNodeParameter('options', 0, {}) as IDataObject;
			
			// Get the json data of the items and flatten it
			let item: INodeExecutionData;
			const itemData: IDataObject[] = [];
			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				item = items[itemIndex];
				itemData.push(flattenObject(item.json));
			}

			const ws = xlsxUtils.json_to_sheet(itemData);
			
			const newItem: INodeExecutionData = {
				json: {},
				binary: {},
			};
			
			if (fileFormat === 'csv') {
				set(newItem.json, destinationKey, xlsxUtils.sheet_to_csv(ws, {
					FS: options.delimiter ? options.delimiter as string : ','
				}));
			}  else if (fileFormat === 'html') {
				set(newItem.json, destinationKey, xlsxUtils.sheet_to_html(ws));
			}

			return this.prepareOutputData([newItem]);
		} else {
			throw new Error(`The operation "${operation}" is not supported!`);
		}
	}
}
