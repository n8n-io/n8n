import {
	INodeProperties,
} from 'n8n-workflow';

export const customerOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Get',
				value: 'get',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'allReddit',
				],
			},
		},
	},
] as INodeProperties[];

export const customerFields = [
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the customer to retrieve',
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
				operation: [
					'get',
				],
			},
		},
	},
] as INodeProperties[];
