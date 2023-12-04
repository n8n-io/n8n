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
		displayName: 'Extract From File',
		name: 'extractFromFile',
		icon: 'file:extractFromFile.svg',
		group: ['input'],
		version: 1,
		description: 'Convert binary data to JSON',
		defaults: {
			name: 'Extract From File',
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
				// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
				options: [
					{
						name: 'Extract From CSV',
						value: 'csv',
						action: 'Extract from CSV',
					},
					{
						name: 'Extract From HTML',
						value: 'html',
						action: 'Extract from HTML',
					},
					{
						name: 'Extract From JSON',
						value: 'fromJson',
						action: 'Extract from JSON',
					},
					{
						name: 'Extract From ODS',
						value: 'ods',
						action: 'Extract from ODS',
					},
					{
						name: 'Extract From PDF',
						value: 'pdf',
						action: 'Extract from PDF',
					},
					{
						name: 'Extract From RTF',
						value: 'rtf',
						action: 'Extract from RTF',
					},
					{
						name: 'Extract From XLS',
						value: 'xls',
						action: 'Extract from XLS',
					},
					{
						name: 'Extract From XLSX',
						value: 'xlsx',
						action: 'Extract from XLSX',
					},
					{
						name: 'Extract From Text File',
						value: 'text',
						action: 'Extract from Text File',
					},
					{
						name: 'Move File to Base64 String',
						value: 'binaryToPropery',
						action: 'Move file to base64 string',
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
			returnData = await spreadsheet.execute.call(this, items, operation);
		}

		if (['binaryToPropery', 'fromJson', 'text'].includes(operation)) {
			returnData = await moveTo.execute.call(this, items, operation);
		}

		if (operation === 'pdf') {
			returnData = await pdf.execute.call(this, items);
		}

		return [returnData];
	}
}
