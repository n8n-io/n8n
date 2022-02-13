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
				name: 'Create',
				value: 'create',
				description: 'Creates an order position for an order.',
			},
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
	//             orderPo: create
	// ----------------------------------------
	{
		displayName: 'Order',
		name: 'order',
		description: 'The order to which the position belongs.',
		type: 'collection',
		required: true,
		default: {},
		displayOptions: {
			show: {
				resource: [
					'orderPo',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'ID',
				name: 'id',
				description: 'Unique identifier of the order',
				type: 'string',
				default: 0,
			},
			{
				displayName: 'Object Name',
				name: 'objectName',
				description: 'Model name, which is "Order"',
				type: 'string',
				default: 'Order',
			},
		],
	},
	{
		displayName: 'Quantity',
		name: 'quantity',
		description: 'Quantity of the article/part',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'orderPo',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Unity',
		name: 'unity',
		description: 'The unit in which the part is measured',
		type: 'collection',
		required: true,
		default: {},
		displayOptions: {
			show: {
				resource: [
					'orderPo',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'ID',
				name: 'id',
				description: 'Unique identifier of the unit',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Object Name',
				name: 'objectName',
				type: 'string',
				description: 'Model name, which is "Unity"',
				default: 'Unity',
			},
		],
	},
	{
		displayName: 'Tax Rate',
		name: 'taxRate',
		description: 'Tax rate of the position',
		type: 'number',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'orderPo',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'orderPo',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Part',
				name: 'part',
				description: 'Part from your inventory which is used in the position.',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'ID',
						name: 'id',
						description: 'Unique identifier of the part',
						type: 'number',
						default: 0,
					},
					{
						displayName: 'Object Name',
						name: 'objectName',
						description: 'Model name, which is "Part"',
						type: 'string',
						default: 'Part',
					},
				],
			},
			{
				displayName: 'Price',
				name: 'price',
				description: 'Price of the article/part. Is either gross or net, depending on the sevDesk account setting.',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Price Tax',
				name: 'priceTax',
				description: 'Tax on the price of the part',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Price Gross',
				name: 'priceGross',
				description: 'Gross price of the part',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Name',
				name: 'name',
				description: 'Name of the article/part',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Position Number',
				name: 'positionNumber',
				description: 'Position number of your position. Can be used to order multiple positions.',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Text',
				name: 'text',
				description: 'A text describing your position',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Discount',
				name: 'discount',
				description: 'An optional discount of the position',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Optional',
				name: 'optional',
				description: 'Defines if the position is optional',
				type: 'boolean',
				default: false,
			},
		],
	},
	// ----------------------------------------
	//             orderPo: getAll
	// ----------------------------------------
	// {
	// 	displayName: 'Order[id]',
	// 	name: 'order[id]',
	// 	description: 'Retrieve all order positions belonging to this order. Must be provided with voucher[objectName].',
	// 	type: 'number',
	// 	default: 0,
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'orderPo',
	// 			],
	// 			operation: [
	// 				'getAll',
	// 			],
	// 		},
	// 	},
	// },
	// {
	// 	displayName: 'order[objectName]',
	// 	name: 'order[objectName]',
	// 	description: 'Only required if order[id] was provided. \'Order\' should be used as value.',
	// 	type: 'string',
	// 	default: '',
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'orderPo',
	// 			],
	// 			operation: [
	// 				'getAll',
	// 			],
	// 		},
	// 	},
	// },
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
