import {
	INodeProperties,
} from 'n8n-workflow';

export const partOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'part',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Creates a single part',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Returns a single part',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all parts in your sevDesk inventory according to the applied filters',
			},
			{
				name: 'Part Get Stock',
				value: 'partGetStock',
				description: 'Returns the current stock amount of the given part',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a single part',
			},
		],
		default: 'get',
	},
];

export const partFields: INodeProperties[] = [
	// ----------------------------------------
	//                part: create
	// ----------------------------------------
	{
		displayName: 'Name',
		name: 'name',
		description: 'Name of the part',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'part',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Part Number',
		name: 'partNumber',
		description: 'The part number',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'part',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Stock',
		name: 'stock',
		description: 'The stock of the part',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'part',
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
					'part',
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
		description: 'The tax rate of the part',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'part',
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
					'part',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Text',
				name: 'text',
				description: 'A text describing the part',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Category',
				name: 'category',
				description: 'Category of the part. For all categories, send a GET to /Category?objectType=Part',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'ID',
						name: 'id',
						description: 'Unique identifier of the category',
						type: 'number',
						default: 0,
					},
					{
						displayName: 'Object Name',
						name: 'objectName',
						type: 'string',
						description: 'Model name, which is "Category"',
						default: 'Category',
					},
				],
			},
			{
				displayName: 'Stock enabled',
				name: 'stockEnabled',
				description: 'Defines if the stock should be enabled',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Price',
				name: 'price',
				description: 'Price for which the part is sold',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Additional Unity',
				name: 'secondUnity',
				description: 'An additional unit in which the part is measured',
				type: 'collection',
				default: {},
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
				displayName: 'Purchase Price',
				name: 'pricePurchase',
				description: 'Purchase price of the part',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Status',
				name: 'status',
				description: 'Status of the part. 50 <-> Inactive - 100 <-> Active',
				type: 'number',
				default: 100,
			},
			{
				displayName: 'Internal Comment',
				name: 'internalComment',
				description: 'An internal comment for the part. Does not appear on invoices and orders.',
				type: 'string',
				default: '',
			},
		],
	},

	// ----------------------------------------
	//                part: get
	// ----------------------------------------
	{
		displayName: 'Part ID',
		name: 'partId',
		description: 'ID of part for which you want the current stock',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'part',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//               part: getAll
	// ----------------------------------------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: [
					'part',
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
					'part',
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
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'part',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Part Number',
				name: 'partNumber',
				description: 'Retrieve all parts with this part number',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Name',
				name: 'name',
				description: 'Retrieve all parts with this name',
				type: 'string',
				default: '',
			},
		],
	},

	// ----------------------------------------
	//            part: partGetStock
	// ----------------------------------------
	{
		displayName: 'Part ID',
		name: 'partId',
		description: 'ID of part for which you want the current stock',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'part',
				],
				operation: [
					'partGetStock',
				],
			},
		},
	},
	// ----------------------------------------
	//                part: update
	// ----------------------------------------
	{
		displayName: 'Part ID',
		name: 'partId',
		description: 'ID of part for which you want the current stock',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'part',
				],
				operation: [
					'update',
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
					'part',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				description: 'Name of the part',
				type: 'string',
				default: '',

			},
			{
				displayName: 'Part Number',
				name: 'partNumber',
				description: 'The part number',
				type: 'string',
				default: '',

			},
			{
				displayName: 'Stock',
				name: 'stock',
				description: 'The stock of the part',
				type: 'number',
				default: 0,

			},
			{
				displayName: 'Unity',
				name: 'unity',
				description: 'The unit in which the part is measured',
				type: 'collection',
				default: {},

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
				description: 'The tax rate of the part',
				type: 'number',
				default: 0,

			},
			{
				displayName: 'Text',
				name: 'text',
				description: 'A text describing the part',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Category',
				name: 'category',
				description: 'Category of the part. For all categories, send a GET to /Category?objectType=Part',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'ID',
						name: 'id',
						description: 'Unique identifier of the category',
						type: 'number',
						default: 0,
					},
					{
						displayName: 'Object Name',
						name: 'objectName',
						type: 'string',
						description: 'Model name, which is "Category"',
						default: 'Category',
					},
				],
			},
			{
				displayName: 'Stock enabled',
				name: 'stockEnabled',
				description: 'Defines if the stock should be enabled',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Price',
				name: 'price',
				description: 'Price for which the part is sold',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Additional Unity',
				name: 'secondUnity',
				description: 'An additional unit in which the part is measured',
				type: 'collection',
				default: {},
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
				displayName: 'Purchase Price',
				name: 'pricePurchase',
				description: 'Purchase price of the part',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'Status',
				name: 'status',
				description: 'Status of the part. 50 <-> Inactive - 100 <-> Active',
				type: 'number',
				default: 100,
			},
			{
				displayName: 'Internal Comment',
				name: 'internalComment',
				description: 'An internal comment for the part. Does not appear on invoices and orders.',
				type: 'string',
				default: '',
			},
		],
	},
];
