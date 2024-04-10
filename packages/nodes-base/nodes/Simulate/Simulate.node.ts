import { sleep, jsonParse, NodeOperationError } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';

export class Simulate implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Simulate',
		hidden: true,
		name: 'simulate',
		group: ['organization'],
		version: 1,
		description: 'Simulate a node',
		subtitle: '={{$parameter.subtitle || undefined}}',
		icon: 'fa:arrow-right',
		defaults: {
			name: 'Simulate',
			color: '#b0b0b0',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Icon to Display on Canvas',
				name: 'icon',
				type: 'options',
				// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
				description: 'Select a type of node to show corresponding icon',
				default: 'n8n-nodes-base.noOp',
				typeOptions: {
					loadOptionsMethod: 'getNodeTypes',
				},
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
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'Returns all input items',
						value: 'all',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'Specify how many of input items to return',
						value: 'specify',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'Specify output as JSON',
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

	methods = {
		loadOptions: {
			async getNodeTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const types = this.getKnownNodeTypes() as {
					[key: string]: {
						className: string;
					};
				};

				const returnData: INodePropertyOptions[] = [];

				for (const type of Object.keys(types)) {
					returnData.push({
						name: types[type].className,
						value: type,
					});
				}

				return returnData;
			},
		},
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
