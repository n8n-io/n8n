import {
	INodeProperties
} from 'n8n-workflow';

import {
	idempotencyHeaderPreSendAction,
	inventoryAdjustmentPreSendAction
} from '../GenericFunctions';

export const inventoryOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'inventory',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				routing: {
					request: {
						method: 'GET',
						url: '=/commerce/inventory/{{$parameter.inventoryId}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'inventory',
								},
							},
						],
					},
				},
			},
			{
				name: 'Get All',
				value: 'getAll',
				routing: {
					request: {
						method: 'GET',
						url: '/commerce/inventory',
					},
					send: {
						paginate: true,
					},
				}
			},
			{
				name: 'Update',
				value: 'update',
				routing: {
					request: {
						method: 'POST',
						url: '=/commerce/inventory/adjustments',
					},
					send: {
						preSend: [
							inventoryAdjustmentPreSendAction,
							idempotencyHeaderPreSendAction
						]
					}
				},
			},
		],
		default: 'create',
	},
];

const getOperations: Array<INodeProperties> = [
	{
		displayName: 'Inventory ID',
		name: 'inventoryId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'inventory',
				],
				operation: [
					'get',
				]
			},
		},
		default: '',
	},
];

const getAllOperations: Array<INodeProperties> = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['inventory'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['inventory'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 50,
		},
		default: 50,
		description: 'Max number of results to return',
	},
];

const updateOperations: Array<INodeProperties> = [
	{
		displayName: 'Inventory ID',
		name: 'inventoryId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['inventory'],
				operation: ['update']
			},
		},
		default: '',
	},
	{
		displayName: 'Unlimited Quantity',
		name: 'unlimited',
		type: 'boolean',
		default: false,
		required: true,
		displayOptions: {
			show: {
				resource: ['inventory'],
				operation: ['update']
			},
		},
	},
	{
		displayName: 'Quantity',
		name: 'quantity',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: {
			show: {
				resource: ['inventory'],
				operation: ['update'],
				unlimited: [false]
			},
		},
	},
];

export const inventoryFields: INodeProperties[] = [
	...getOperations,
	...getAllOperations,
	...updateOperations,
];
