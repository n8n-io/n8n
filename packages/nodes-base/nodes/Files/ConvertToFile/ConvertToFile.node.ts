import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import * as spreadsheet from './actions/spreadsheet.operation';
import * as toBinary from './actions/toBinary.operation';
import * as toJson from './actions/toJson.operation';
import * as iCall from './actions/iCall.operation';

export class ConvertToFile implements INodeType {
	// eslint-disable-next-line n8n-nodes-base/node-class-description-missing-subtitle
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
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
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
						value: 'toBinary',
						action: 'Move base64 string to file',
						description:
							'Specify a property in the item that contains a base64 string to be converted into a file',
					},
				],
				default: 'csv',
			},
			...spreadsheet.description,
			...toBinary.description,
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

		if (operation === 'iCal') {
			returnData = await iCall.execute.call(this, items);
		}

		return [returnData];
	}
}
