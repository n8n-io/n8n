import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class Odoo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Odoo',
		name: 'oura',
		icon: 'file:odoo.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Odoo API',
		defaults: {
			name: 'Odoo',
			color: '#714B67',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'odooApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Profile',
						value: 'profile',
					},
					{
						name: 'Summary',
						value: 'summary',
					},
				],
				default: 'summary',
				description: 'Resource to consume.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const length = items.length;

		let responseData;
		const returnData: IDataObject[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		return [[]];
	}
}
