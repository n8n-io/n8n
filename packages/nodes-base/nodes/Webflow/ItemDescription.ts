import {
	INodeProperties,
} from 'n8n-workflow';

export const itemOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'item',
				],
			},
		},
	},
] as INodeProperties[];

export const itemFields = [
	// ----------------------------------
	//         item: create
	// ----------------------------------
	{
		displayName: 'Site ID',
		name: 'siteId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getSites',
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Unique identifier for the Collection you are adding an Item to',
	},
	{
		displayName: 'Collection ID',
		name: 'collectionId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getCollections',
			loadOptionsDependsOn: [
				'siteId',
			],
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Unique identifier for the Collection you are adding an Item to',
	},
	{
		displayName: 'Live',
		name: 'live',
		type: 'boolean',
		required: true,
		default: false,
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'create',
				],
			},
		},
		description: 'Boolean string indicating if the item should be published to the live site',
	},
	{
		displayName: 'Fields',
		name: 'fieldsUi',
		placeholder: 'Add Field',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Field',
				name: 'fieldValues',
				values: [
					{
						displayName: 'Field ID',
						name: 'fieldId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getFields',
							loadOptionsDependsOn: [
								'collectionId',
							],
						},
						default: '',
						description: 'Field to set for the item to create.',
					},
					{
						displayName: 'Field Value',
						name: 'fieldValue',
						type: 'string',
						default: '',
						description: 'Value to set for the item to create.',
					},
				],
			},
		],
	},

	// ----------------------------------
	//         item: get
	// ----------------------------------
	{
		displayName: 'Site ID',
		name: 'siteId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getSites',
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'delete',
					'get',
				],
			},
		},
		description: 'Unique identifier for the Collection you are adding an Item to',
	},
	{
		displayName: 'Collection ID',
		name: 'collectionId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getCollections',
			loadOptionsDependsOn: [
				'siteId',
			],
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'delete',
					'get',
				],
			},
		},
		description: 'Unique identifier for the Collection you are adding an Item to',
	},
	{
		displayName: 'Item ID',
		name: 'itemId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'delete',
					'get',
				],
			},
		},
		description: 'Unique identifier for the Item you are querying',
	},
	// ----------------------------------
	//         item: update
	// ----------------------------------
	{
		displayName: 'Site ID',
		name: 'siteId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getSites',
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'Unique identifier for the Collection you are adding an Item to',
	},
	{
		displayName: 'Collection ID',
		name: 'collectionId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getCollections',
			loadOptionsDependsOn: [
				'siteId',
			],
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'Unique identifier for the Collection you are adding an Item to',
	},
	{
		displayName: 'Item ID',
		name: 'itemId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'Unique identifier for the Item you are querying',
	},
	{
		displayName: 'Live',
		name: 'live',
		type: 'boolean',
		required: true,
		default: false,
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'update',
				],
			},
		},
		description: 'Boolean string indicating if the item should be published to the live site',
	},
	{
		displayName: 'Fields',
		name: 'fieldsUi',
		placeholder: 'Add Field',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Field',
				name: 'fieldValues',
				values: [
					{
						displayName: 'Field ID',
						name: 'fieldId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getFields',
							loadOptionsDependsOn: [
								'collectionId',
							],
						},
						default: '',
						description: 'Field to set for the item to create.',
					},
					{
						displayName: 'Field Value',
						name: 'fieldValue',
						type: 'string',
						default: '',
						description: 'Value to set for the item to create.',
					},
				],
			},
		],
	},
	// ----------------------------------
	//         item:getAll
	// ----------------------------------
	{
		displayName: 'Site ID',
		name: 'siteId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getSites',
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'getAll',
				],
			},
		},
		description: 'Unique identifier for the Collection you are adding an Item to',
	},
	{
		displayName: 'Collection ID',
		name: 'collectionId',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getCollections',
			loadOptionsDependsOn: [
				'siteId',
			],
		},
		default: '',
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'getAll',
				],
			},
		},
		description: 'Unique identifier for the Collection you are adding an Item to',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'item',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'item',
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
			maxValue: 100,
		},
		default: 100,
		description: 'How many results to return.',
	},
] as INodeProperties[];
