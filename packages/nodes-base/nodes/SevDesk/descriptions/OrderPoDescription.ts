import {
	INodeProperties,
} from 'n8n-workflow';

export const orderPoOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'orderPo',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all order positions depending on the filters defined in the query',
			},
		],
		default: 'getAll',
	},
];

export const orderPoFields: INodeProperties[] = [
	// ----------------------------------------
	//             orderPo: getAll
	// ----------------------------------------
	{
		displayName: 'Order[id]',
		name: 'order[id]',
		description: 'Retrieve all order positions belonging to this order. Must be provided with voucher[objectName].',
		type: 'number',
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'orderPo',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'order[objectName]',
		name: 'order[objectName]',
		description: 'Only required if order[id] was provided. \'Order\' should be used as value.',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'orderPo',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: [
					'orderPo',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'orderPo',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
	},
];
