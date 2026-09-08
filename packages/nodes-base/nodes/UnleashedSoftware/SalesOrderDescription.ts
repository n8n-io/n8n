import type { INodeProperties } from 'n8n-workflow';

export const salesOrderOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['salesOrder'],
			},
		},
		options: [
			{
				name: 'Get many',
				value: 'getAll',
				description: 'Get many sales orders',
				action: 'Get many sales orders',
			},
		],
		default: 'getAll',
	},
];

export const salesOrderFields: INodeProperties[] = [
	/* ------------------------------------------------------------------------- */
	/*                                salesOrder:getAll                          */
	/* ------------------------------------------------------------------------- */
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['salesOrder'],
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
				operation: ['getAll'],
				resource: ['salesOrder'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add filter',
		default: {},
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['salesOrder'],
			},
		},
		options: [
			{
				displayName: 'Customer ID',
				name: 'customerId',
				type: 'string',
				default: '',
				placeholder: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
				description:
					'Only returns orders for a specified Customer GUID. The CustomerId can be specified as a list of comma-separated GUIDs.',
			},
			{
				displayName: 'Customer code',
				name: 'customerCode',
				type: 'string',
				default: '',
				description: 'Returns orders that start with the specific customer code',
			},
			{
				displayName: 'End date',
				name: 'endDate',
				type: 'dateTime',
				default: '',
				description: 'Returns orders with order date before the specified date. UTC.',
			},
			{
				displayName: 'Modified since',
				name: 'modifiedSince',
				type: 'dateTime',
				default: '',
				description: 'Returns orders created or edited after a specified date, must be UTC format',
			},
			{
				displayName: 'Order number',
				name: 'orderNumber',
				type: 'string',
				default: '',
				description:
					'Returns a single order with the specified order number. If set, it overrides all other filters.',
			},
			{
				displayName: 'Order status',
				name: 'orderStatus',
				type: 'multiOptions',
				options: [
					{
						name: 'Backordered',
						value: 'Backordered',
					},
					{
						name: 'Completed',
						value: 'Completed',
					},
					{
						name: 'Deleted',
						value: 'Deleted',
					},
					{
						name: 'Parked',
						value: 'Parked',
					},
					{
						name: 'Placed',
						value: 'Placed',
					},
				],
				default: [],
				description:
					'Returns orders with the specified status. If no orderStatus filter is specified, then we exclude "Deleted" by default.',
			},
			{
				displayName: 'Start date',
				name: 'startDate',
				type: 'dateTime',
				default: '',
				description: 'Returns orders with order date after the specified date. UTC.',
			},
		],
	},
];
