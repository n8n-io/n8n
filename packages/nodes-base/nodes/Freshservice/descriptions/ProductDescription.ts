import {
	INodeProperties,
} from 'n8n-workflow';

export const productOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'product',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a product',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a product',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a product',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all products',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a product',
			},
		],
		default: 'create',
	},
] as INodeProperties[];

export const productFields = [
	// ----------------------------------------
	//             product: create
	// ----------------------------------------
	{
		displayName: 'Asset Type ID',
		name: 'asset_type_id',
		description: 'ID of the asset type',
		type: 'options',
		required: true,
		default: '',
		typeOptions: {
			loadOptionsMethod: [
				'getAssetTypes',
			],
		},
		displayOptions: {
			show: {
				resource: [
					'product',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Name',
		name: 'name',
		description: 'Name of the product',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'product',
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
					'product',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the product in HTML',
			},
			{
				displayName: 'Description Text',
				name: 'description_text',
				type: 'string',
				default: '',
				description: 'Description of the product in plain text',
			},
			{
				displayName: 'Manufacturer',
				name: 'manufacturer',
				type: 'string',
				default: '',
				description: 'Manufacturer of the product',
			},
			{
				displayName: 'Mode of Procurement',
				name: 'mode_of_procurement',
				type: 'string',
				default: '',
				description: 'Mode of procurement of the product',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'string',
				default: '',
				description: 'Status of the product',
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
				resource: [
					'product',
				],
				operation: [
					'delete',
				],
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
				resource: [
					'product',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//             product: getAll
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
					'product',
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
		description: 'How many results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: [
					'product',
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
				resource: [
					'product',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'product',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Asset Type ID',
				name: 'asset_type_id',
				type: 'options',
				default: '',
				description: 'ID of the asset type',
				typeOptions: {
					loadOptionsMethod: [
						'getAssetTypes',
					],
				},
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the product in HTML',
			},
			{
				displayName: 'Description Text',
				name: 'description_text',
				type: 'string',
				default: '',
				description: 'Description of the product in plain text',
			},
			{
				displayName: 'Manufacturer',
				name: 'manufacturer',
				type: 'string',
				default: '',
				description: 'Manufacturer of the product',
			},
			{
				displayName: 'Mode of Procurement',
				name: 'mode_of_procurement',
				type: 'string',
				default: '',
				description: 'Mode of procurement of the product',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name of the product',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'string',
				default: '',
				description: 'Status of the product',
			},
		],
	},
] as INodeProperties[];
