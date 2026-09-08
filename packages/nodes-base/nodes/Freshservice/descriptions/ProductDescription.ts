import type { INodeProperties } from 'n8n-workflow';

export const productOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['product'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a product',
				action: 'Create a product',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a product',
				action: 'Delete a product',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a product',
				action: 'Get a product',
			},
			{
				name: 'Get many',
				value: 'getAll',
				description: 'Retrieve many products',
				action: 'Get many products',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a product',
				action: 'Update a product',
			},
		],
		default: 'create',
	},
];

export const productFields: INodeProperties[] = [
	// ----------------------------------------
	//             product: create
	// ----------------------------------------
	{
		displayName: 'Asset type name or ID',
		name: 'assetTypeId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: 'getAssetTypes',
		},
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'HTML supported',
			},
			{
				displayName: 'Manufacturer',
				name: 'manufacturer',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Mode of procurement',
				name: 'mode_of_procurement',
				type: 'options',
				default: 'Buy',
				options: [
					{
						name: 'Buy',
						value: 'Buy',
					},
					{
						name: 'Lease',
						value: 'Lease',
					},
					{
						name: 'Both',
						value: 'Both',
					},
				],
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'In Production',
				options: [
					{
						name: 'In production',
						value: 'In Production',
					},
					{
						name: 'In pipeline',
						value: 'In Pipeline',
					},
					{
						name: 'Retired',
						value: 'Retired',
					},
				],
			},
		],
	},

	// ----------------------------------------
	//             product: delete
	// ----------------------------------------
	{
		displayName: 'Product ID',
		name: 'productId',
		description: 'ID of the product to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['delete'],
			},
		},
	},

	// ----------------------------------------
	//               product: get
	// ----------------------------------------
	{
		displayName: 'Product ID',
		name: 'productId',
		description: 'ID of the product to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//             product: getAll
	// ----------------------------------------
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['getAll'],
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
				resource: ['product'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
	},

	// ----------------------------------------
	//             product: update
	// ----------------------------------------
	{
		displayName: 'Product ID',
		name: 'productId',
		description: 'ID of the product to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['update'],
			},
		},
	},
	{
		displayName: 'Update fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				resource: ['product'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Asset type name or ID',
				name: 'asset_type_id',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				default: '',
				typeOptions: {
					loadOptionsMethod: 'getAssetTypes',
				},
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'HTML supported',
			},
			{
				displayName: 'Manufacturer',
				name: 'manufacturer',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Mode of procurement',
				name: 'mode_of_procurement',
				type: 'options',
				default: 'Buy',
				options: [
					{
						name: 'Buy',
						value: 'Buy',
					},
					{
						name: 'Lease',
						value: 'Lease',
					},
					{
						name: 'Both',
						value: 'Both',
					},
				],
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'In Production',
				options: [
					{
						name: 'In production',
						value: 'In Production',
					},
					{
						name: 'In pipeline',
						value: 'In Pipeline',
					},
					{
						name: 'Retired',
						value: 'Retired',
					},
				],
			},
		],
	},
];
