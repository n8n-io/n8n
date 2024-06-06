import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import * as spreadsheet from './actions/spreadsheet.operation';
import * as toBinary from './actions/toBinary.operation';
import * as toText from './actions/toText.operation';
import * as toJson from './actions/toJson.operation';
import * as iCall from './actions/iCall.operation';

export class ConvertToFile implements INodeType {
	// eslint-disable-next-line n8n-nodes-base/node-class-description-missing-subtitle
	description: INodeTypeDescription = {
		displayName: 'Convert to File',
		name: 'convertToFile',
		icon: { light: 'file:convertToFile.svg', dark: 'file:convertToFile.dark.svg' },
		group: ['input'],
		version: [1, 1.1],
		description: 'Convert JSON data to binary data',
		defaults: {
			name: 'Convert to File',
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
						name: 'Convert to CSV',
						value: 'csv',
						action: 'Convert to CSV',
						description: 'Transform input data into a CSV file',
					},
					{
						name: 'Convert to HTML',
						value: 'html',
						action: 'Convert to HTML',
						description: 'Transform input data into a table in an HTML file',
					},
					{
						name: 'Convert to ICS',
						value: 'iCal',
						action: 'Convert to ICS',
						description: 'Converts each input item to an ICS event file',
					},
					{
						name: 'Convert to JSON',
						value: 'toJson',
						action: 'Convert to JSON',
						description: 'Transform input data into a single or multiple JSON files',
					},
					{
						name: 'Convert to ODS',
						value: 'ods',
						action: 'Convert to ODS',
						description: 'Transform input data into an ODS file',
					},
					{
						name: 'Convert to RTF',
						value: 'rtf',
						action: 'Convert to RTF',
						description: 'Transform input data into a table in an RTF file',
					},
					{
						name: 'Convert to Text File',
						value: 'toText',
						action: 'Convert to text file',
						description: 'Transform input data string into a file',
					},
					{
						name: 'Convert to XLS',
						value: 'xls',
						action: 'Convert to XLS',
						description: 'Transform input data into an Excel file',
					},
					{
						name: 'Convert to XLSX',
						value: 'xlsx',
						action: 'Convert to XLSX',
						description: 'Transform input data into an Excel file',
					},
					{
						name: 'Move Base64 String to File',
						value: 'toBinary',
						action: 'Move base64 string to file',
						description: 'Convert a base64-encoded string into its original file format',
					},
				],
				default: 'csv',
			},
			...spreadsheet.description,
			...toBinary.description,
			...toText.description,
			...toJson.description,
			...iCall.description,
		],
	};

	async execute(this: IExecuteFunctions) {
		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0);
		let returnData: INodeExecutionData[] = [];

		if (spreadsheet.operations.includes(operation)) {
			returnData = await spreadsheet.execute.call(this, items, operation);
		}

		if (operation === 'toJson') {
			returnData = await toJson.execute.call(this, items);
		}

		if (operation === 'toBinary') {
			returnData = await toBinary.execute.call(this, items);
		}

		if (operation === 'toText') {
			returnData = await toText.execute.call(this, items);
		}

		if (operation === 'iCal') {
			returnData = await iCall.execute.call(this, items);
		}

		return [returnData];
	}
}
