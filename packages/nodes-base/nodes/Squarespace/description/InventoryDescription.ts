import {
	INodeProperties
} from 'n8n-workflow';

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

export const inventoryFields: INodeProperties[] = [
	...getOperations,
	...getAllOperations,
];
