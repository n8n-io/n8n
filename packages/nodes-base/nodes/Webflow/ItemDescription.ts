import {
	INodeProperties,
} from 'n8n-workflow';

export const itemOperations: INodeProperties[] = [
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
];

export const itemFields: INodeProperties[] = [
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
		description: 'ID of the site containing the collection whose items to add to.',
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
		description: 'ID of the collection to add an item to.',
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
		description: 'Whether the item should be published on the live site.',
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
		description: 'ID of the site containing the collection whose items to operate on.',
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
		description: 'ID of the collection whose items to operate on.',
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
		description: 'ID of the item to operate on.',
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
		description: 'ID of the site containing the collection whose items to update.',
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
		description: 'ID of the collection whose items to update.',
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
		description: 'ID of the item to update.',
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
		description: 'Whether the item should be published on the live site.',
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
						description: 'Field to set for the item to update.',
					},
					{
						displayName: 'Field Value',
						name: 'fieldValue',
						type: 'string',
						default: '',
						description: 'Value to set for the item to update.',
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
		description: 'ID of the site containing the collection whose items to retrieve.',
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
		description: 'ID of the collection whose items to retrieve.',
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
];
