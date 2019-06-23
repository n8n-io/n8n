import {
	BINARY_ENCODING,
	IExecuteFunctions,
} from 'n8n-core';

import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';

import {
	read as xlsxRead,
	utils as xlsxUtils,
	write as xlsxWrite,
	WritingOptions,
	WorkBook,
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
		if ((typeof data[key1]) === 'object') {
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
			//         toFile
			// ----------------------------------
			{
				displayName: 'File Format',
				name: 'fileFormat',
				type: 'options',
				options: [
					{
						name: 'csv',
						value: 'csv',
						description: 'Comma-separated values',
					},
					{
						name: 'ods',
						value: 'ods',
						description: 'OpenDocument Spreadsheet',
					},
					{
						name: 'rtf',
						value: 'rtf',
						description: 'Rich Text Format',
					},
					{
						name: 'html',
						value: 'html',
						description: 'HTML Table',
					},
					{
						name: 'xls',
						value: 'xls',
						description: 'Excel',
					},
				],
				default: 'xls',
				displayOptions: {
					show: {
						operation: [
							'toFile'
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
		]
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

				const binaryPropertyName = this.getNodeParameter('binaryPropertyName', 0) as string;

				if (item.binary === undefined || item.binary[binaryPropertyName] === undefined) {
					// Property did not get found on item
					continue;
				}

				// Read the binary spreadsheet data
				const binaryData = Buffer.from(item.binary[binaryPropertyName].data, BINARY_ENCODING);
				const workbook = xlsxRead(binaryData);

				if (workbook.SheetNames.length === 0) {
					throw new Error('File does not have any sheets!');
				}

				// Convert it to json
				const sheetJson = xlsxUtils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

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

			// Get the json data of the items and flatten it
			let item: INodeExecutionData;
			const itemData: IDataObject[] = [];
			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				item = items[itemIndex];
				itemData.push(flattenObject(item.json));
			}

			const ws = xlsxUtils.json_to_sheet(itemData);

			const wopts: WritingOptions = {
				bookSST: false,
				type: 'buffer'
			};

			if (fileFormat === 'csv') {
				wopts.bookType = 'csv';
			} else if (fileFormat === 'html') {
				wopts.bookType = 'html';
			} else if (fileFormat === 'rtf') {
				wopts.bookType = 'rtf';
			} else if (fileFormat === 'ods') {
				wopts.bookType = 'ods';
			} else if (fileFormat === 'xls') {
				wopts.bookType = 'xlml';
			}

			// Convert the data in the correct format
			const sheetName = 'Sheet';
			const wb: WorkBook = {
				SheetNames: [sheetName],
				Sheets: {
					[sheetName]: ws,
				}
			};
			const wbout = xlsxWrite(wb, wopts);

			// Create a new item with only the binary spreadsheet data
			const newItem: INodeExecutionData = {
				json: {},
				binary: {},
			};

			newItem.binary![binaryPropertyName] = await this.helpers.prepareBinaryData(wbout, `spreadsheet.${fileFormat}`);

			const newItems = [];
			newItems.push(newItem);

			return this.prepareOutputData(newItems);
		} else {
			throw new Error(`The operation "${operation}" is not supported!`);
		}
	}
}
