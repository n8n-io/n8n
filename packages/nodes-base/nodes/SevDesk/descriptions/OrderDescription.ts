import {
	INodeProperties,
} from 'n8n-workflow';

export const orderOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'order',
				],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Returns a single order',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'There are a multitude of parameter which can be used to filter. A few of them are attached but for a complete list please check out <a href="https://5677.extern.sevdesk.dev/apiOverview/index.html#/doc-orders#filtering">this</a> list.',
			},
		],
		default: 'get',
	},
];

export const orderFields: INodeProperties[] = [
	// ----------------------------------------
	//              order: delete
	// ----------------------------------------
	{
		displayName: 'Order ID',
		name: 'orderId',
		description: 'Id of order resource to delete',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//                order: get
	// ----------------------------------------
	{
		displayName: 'Order ID',
		name: 'orderId',
		description: 'ID of order to return',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'order',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//              order: getAll
	// ----------------------------------------
	{
		displayName: 'Status',
		name: 'status',
		description: 'Status of the order',
		type: 'number',
		default: 0,
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
	},
	{
		displayName: 'orderNumber',
		name: 'orderNumber',
		description: 'Retrieve all orders with this order number',
		type: 'string',
		default: '',
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
	},
	{
		displayName: 'startDate',
		name: 'startDate',
		description: 'Retrieve all orders with a date equal or higher',
		type: 'number',
		default: 0,
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
	},
	{
		displayName: 'endDate',
		name: 'endDate',
		description: 'Retrieve all orders with a date equal or lower',
		type: 'number',
		default: 0,
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
	},
	{
		displayName: 'Contact[id]',
		name: 'contact[id]',
		description: 'Retrieve all orders with this contact. Must be provided with contact[objectName].',
		type: 'number',
		default: 0,
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
	},
	{
		displayName: 'contact[objectName]',
		name: 'contact[objectName]',
		description: 'Only required if contact[id] was provided. "Contact" should be used as value.',
		type: 'string',
		default: '',
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
					'order',
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
	},
];
