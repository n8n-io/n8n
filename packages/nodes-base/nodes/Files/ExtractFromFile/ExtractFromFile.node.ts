import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import * as spreadsheet from './actions/spreadsheet.operation';
import * as moveTo from './actions/moveTo.operation';
import * as pdf from './actions/pdf.operation';

export class ExtractFromFile implements INodeType {
	// eslint-disable-next-line n8n-nodes-base/node-class-description-missing-subtitle
	description: INodeTypeDescription = {
		displayName: 'Extract from File',
		name: 'extractFromFile',
		icon: { light: 'file:extractFromFile.svg', dark: 'file:extractFromFile.dark.svg' },
		group: ['input'],
		version: 1,
		description: 'Convert binary data to JSON',
		defaults: {
			name: 'Extract from File',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
				options: [
					{
						name: 'Extract From CSV',
						value: 'csv',
						action: 'Extract from CSV',
						description: 'Transform a CSV file into output items',
					},
					{
						name: 'Extract From HTML',
						value: 'html',
						action: 'Extract from HTML',
						description: 'Transform a table in an HTML file into output items',
					},
					{
						name: 'Extract From ICS',
						value: 'fromIcs',
						action: 'Extract from ICS',
						description: 'Transform a ICS file into output items',
					},
					{
						name: 'Extract From JSON',
						value: 'fromJson',
						action: 'Extract from JSON',
						description: 'Transform a JSON file into output items',
					},
					{
						name: 'Extract From ODS',
						value: 'ods',
						action: 'Extract from ODS',
						description: 'Transform an ODS file into output items',
					},
					{
						name: 'Extract From PDF',
						value: 'pdf',
						action: 'Extract from PDF',
						description: 'Extracts the content and metadata from a PDF file',
					},
					{
						name: 'Extract From RTF',
						value: 'rtf',
						action: 'Extract from RTF',
						description: 'Transform a table in an RTF file into output items',
					},
					{
						name: 'Extract From Text File',
						value: 'text',
						action: 'Extract from text file',
						description: 'Extracts the content of a text file',
					},
					{
						name: 'Extract From XML',
						value: 'xml',
						action: 'Extract from XML',
						description: 'Extracts the content of an XML file',
					},
					{
						name: 'Extract From XLS',
						value: 'xls',
						action: 'Extract from XLS',
						description: 'Transform an Excel file into output items',
					},
					{
						name: 'Extract From XLSX',
						value: 'xlsx',
						action: 'Extract from XLSX',
						description: 'Transform an Excel file into output items',
					},
					{
						name: 'Move File to Base64 String',
						value: 'binaryToPropery',
						action: 'Move file to base64 string',
						description: 'Convert a file into a base64-encoded string',
					},
				],
				default: 'csv',
			},
			...spreadsheet.description,
			...moveTo.description,
			...pdf.description,
		],
	};

	async execute(this: IExecuteFunctions) {
		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0);
		let returnData: INodeExecutionData[] = [];

		if (spreadsheet.operations.includes(operation)) {
			returnData = await spreadsheet.execute.call(this, items, 'operation');
		}

		if (['binaryToPropery', 'fromJson', 'text', 'fromIcs', 'xml'].includes(operation)) {
			returnData = await moveTo.execute.call(this, items, operation);
		}

		if (operation === 'pdf') {
			returnData = await pdf.execute.call(this, items);
		}

		return [returnData];
	}
}
