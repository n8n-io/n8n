import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
} from 'n8n-workflow';

export class Paypal implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Paypal',
		name: 'Paypal',
		icon: 'file:paypal.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Paypal API',
		defaults: {
			name: 'Paypal',
			color: '#356ae6',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'paypalApi',
				required: true,
			}
		],
		properties: [],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return [this.helpers.returnJsonArray({})];
	}
}
