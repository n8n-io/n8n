import {
	INodeProperties,
} from 'n8n-workflow';

export const itemOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'get',
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create an item',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete an item',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get an item',
			},
			{
				name: 'Get All',
				value: 'getAll',
				action: 'Get all items',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update an item',
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
		displayName: 'Site Name or ID',
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
		description: 'ID of the site containing the collection whose items to add to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Collection Name or ID',
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
		description: 'ID of the collection to add an item to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
		description: 'Whether the item should be published on the live site',
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
						displayName: 'Field Name or ID',
						name: 'fieldId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getFields',
							loadOptionsDependsOn: [
								'collectionId',
							],
						},
						default: '',
						description: 'Field to set for the item to create. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
					{
						displayName: 'Field Value',
						name: 'fieldValue',
						type: 'string',
						default: '',
						description: 'Value to set for the item to create',
					},
				],
			},
		],
	},

	// ----------------------------------
	//         item: get
	// ----------------------------------
	{
		displayName: 'Site Name or ID',
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
		description: 'ID of the site containing the collection whose items to operate on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Collection Name or ID',
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
		description: 'ID of the collection whose items to operate on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
		description: 'ID of the item to operate on',
	},
	// ----------------------------------
	//         item: update
	// ----------------------------------
	{
		displayName: 'Site Name or ID',
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
		description: 'ID of the site containing the collection whose items to update. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Collection Name or ID',
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
		description: 'ID of the collection whose items to update. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
		description: 'ID of the item to update',
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
		description: 'Whether the item should be published on the live site',
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
						displayName: 'Field Name or ID',
						name: 'fieldId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getFields',
							loadOptionsDependsOn: [
								'collectionId',
							],
						},
						default: '',
						description: 'Field to set for the item to update. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
					{
						displayName: 'Field Value',
						name: 'fieldValue',
						type: 'string',
						default: '',
						description: 'Value to set for the item to update',
					},
				],
			},
		],
	},
	// ----------------------------------
	//         item:getAll
	// ----------------------------------
	{
		displayName: 'Site Name or ID',
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
		description: 'ID of the site containing the collection whose items to retrieve. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Collection Name or ID',
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
		description: 'ID of the collection whose items to retrieve. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
		description: 'Whether to return all results or only up to a given limit',
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
		description: 'Max number of results to return',
	},
];
