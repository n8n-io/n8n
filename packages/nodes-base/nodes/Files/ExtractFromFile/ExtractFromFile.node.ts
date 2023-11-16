import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import * as fromFile from '../../SpreadsheetFile/v2/fromFile.operation';

const spreadsheetOperations = ['csv', 'html', 'rtf', 'ods', 'xls', 'xlsx'];

const spreadsheetOperationsDescription = fromFile.description
	.filter((property) => property.name !== 'fileFormat')
	.map((property) => {
		const newProperty = { ...property };
		newProperty.displayOptions = {
			show: {
				operation: spreadsheetOperations,
			},
		};

		if (newProperty.name === 'options') {
			newProperty.options = (newProperty.options as INodeProperties[]).map((option) => {
				let newOption = option;
				if (['delimiter', 'fromLine', 'maxRowCount', 'enableBOM'].includes(option.name)) {
					newOption = { ...option, displayOptions: { show: { '/operation': ['csv'] } } };
				}
				return newOption;
			});
		}
		return newProperty;
	});

export class ExtractFromFile implements INodeType {
	// eslint-disable-next-line n8n-nodes-base/node-class-description-missing-subtitle
	description: INodeTypeDescription = {
		displayName: 'Extract From File',
		name: 'extractFromFile',
		icon: 'fa:file-export',
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
						value: 'toJson',
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
						name: 'Convert Binary File to Encoded Data',
						value: 'binaryToEncodedData',
						action: 'Convert binary file to encoded data',
					},
				],
				default: 'csv',
			},
			...spreadsheetOperationsDescription,
		],
	};

	async execute(this: IExecuteFunctions) {
		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0);
		let returnData: INodeExecutionData[] = [];

		if (spreadsheetOperations.includes(operation)) {
			returnData = await fromFile.execute.call(this, items, operation);
		}

		return [returnData];
	}
}
