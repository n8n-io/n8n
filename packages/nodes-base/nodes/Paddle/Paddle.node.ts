import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class Paddle implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Paddle',
		name: 'paddle',
		icon: 'file:paddle.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Paddle API',
		defaults: {
			name: 'Paddle',
			color: '#45567c',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'paddleApi',
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
						name: 'Coupon',
						value: 'coupon',

					},
					{
						name: 'Payments',
						value: 'payments',
					},
					{
						name: 'Plan',
						value: 'plan',
					},
					{
						name: 'Product',
						value: 'product',
					},
					{
						name: 'Order',
						value: 'order',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'coupon',
				description: 'Resource to consume.',
			},

		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		let responseData;
		const qs: IDataObject = {};
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {

			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as unknown as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
