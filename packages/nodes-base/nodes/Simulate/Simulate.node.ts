import { sleep, jsonParse, NodeOperationError } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';

export class Simulate implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Simulate',
		name: 'simulate',
		icon: 'fa:arrow-right',
		group: ['organization'],
		version: 1,
		description: 'Simulate a node',
		subtitle: '={{$parameter.subtitle || undefined}}',
		defaults: {
			name: 'Simulate',
			color: '#b0b0b0',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Icon',
				name: 'icon',
				type: 'options',
				default: '',
				options: [],
			},
			{
				displayName: 'Subtitle',
				name: 'subtitle',
				type: 'string',
				default: '',
				placeholder: "e.g. 'record: read'",
			},
			{
				displayName: 'Output',
				name: 'output',
				type: 'options',
				default: 'all',
				noDataExpression: true,
				options: [
					{
						name: 'All',
						description: 'Returns all the input items',
						value: 'all',
					},
					{
						name: 'Specify',
						description: 'Specify how many of input items to return',
						value: 'specify',
					},
					{
						name: 'Custom',
						description: 'Specify output as JSON',
						value: 'custom',
					},
				],
			},
			{
				displayName: 'Number of Items',
				name: 'numberOfItems',
				type: 'number',
				default: 1,
				description:
					'Number input of items to return, if greater then input length all items will be returned',
				displayOptions: {
					show: {
						output: ['specify'],
					},
				},
				typeOptions: {
					minValue: 1,
				},
			},
			{
				displayName: 'JSON',
				name: 'jsonOutput',
				type: 'json',
				typeOptions: {
					rows: 5,
				},
				default: '[\n  {\n  "my_field_1": "value",\n  "my_field_2": 1\n  }\n]',
				validateType: 'array',
				displayOptions: {
					show: {
						output: ['custom'],
					},
				},
			},
			{
				displayName: 'Execution Duration (MS)',
				name: 'executionDuration',
				type: 'number',
				default: 150,
				description: 'Execution duration in milliseconds',
				typeOptions: {
					minValue: 0,
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		let returnItems: INodeExecutionData[] = [];

		const output = this.getNodeParameter('output', 0) as string;

		if (output === 'all') {
			returnItems = items;
		} else if (output === 'specify') {
			const numberOfItems = this.getNodeParameter('numberOfItems', 0) as number;

			returnItems = items.slice(0, numberOfItems);
		} else if (output === 'custom') {
			let jsonOutput = this.getNodeParameter('jsonOutput', 0);

			if (typeof jsonOutput === 'string') {
				try {
					jsonOutput = jsonParse<IDataObject>(jsonOutput);
				} catch (error) {
					throw new NodeOperationError(this.getNode(), 'Invalid JSON');
				}
			}

			if (!Array.isArray(jsonOutput)) {
				jsonOutput = [jsonOutput];
			}

			for (const item of jsonOutput as IDataObject[]) {
				returnItems.push({ json: item });
			}
		}

		const executionDuration = this.getNodeParameter('executionDuration', 0) as number;

		if (executionDuration > 0) {
			await sleep(executionDuration);
		}

		return [returnItems];
	}
}
