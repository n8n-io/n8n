import {
	INodeProperties,
} from 'n8n-workflow';

import {
	getSearchFilters,
} from './GenericFunctions';

export const orderOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'order',
				],
			},
		},
		options: [
			{
				name: 'Cancel',
				value: 'cancel',
				description: 'Cancel an order',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an order',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all orders',
			},
			{
				name: 'Ship',
				value: 'ship',
				description: 'Ship an order',
			},
		],
		default: 'cancel',
		description: 'The operation to perform',
	},
];

export const orderFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                   order:cancel			                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Order ID',
		name: 'orderId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'cancel',
					'get',
					'ship',
				],
			},
		},
	},

	/* -------------------------------------------------------------------------- */
	/*                                   order:getAll			                  */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'Whether all results should be returned or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 10,
		},
		default: 5,
		description: 'How many results to return',
	},
	...getSearchFilters(
		'order',
		'getOrderAttributes',
		'getOrderAttributes',
	),

];
