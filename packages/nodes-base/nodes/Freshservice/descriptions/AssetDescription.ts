import {
	INodeProperties,
} from 'n8n-workflow';

export const assetOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'asset',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an asset',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an asset',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve an asset',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all assets',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an asset',
			},
		],
		default: 'create',
	},
] as INodeProperties[];

export const assetFields = [
	// ----------------------------------------
	//              asset: create
	// ----------------------------------------
	{
		displayName: 'Asset Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'asset',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Asset Type Name/ID',
		name: 'asset_type_id',
		type: 'options',
		description: 'Choose from the list or specify an ID. You can also specify the ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
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
					'asset',
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
					'asset',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Agent Name/ID',
				name: 'agent_id',
				type: 'options',
				default: '',
				description: 'ID of the agent who manages the asset. Choose from the list or specify an ID. You can also specify the ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
				typeOptions: {
					loadOptionsMethod: [
						'getAgents',
					],
				},
			},
			{
				displayName: 'Department Name/ID',
				name: 'department_id',
				type: 'options',
				default: '',
				description: 'Choose from the list or specify an ID. You can also specify the ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
				typeOptions: {
					loadOptionsMethod: [
						'getDepartments',
					],
				},
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Impact',
				name: 'impact',
				type: 'options',
				default: 'low',
				options: [
					{
						name: 'Low',
						value: 'low',
					},
					{
						name: 'Medium',
						value: 'medium',
					},
					{
						name: 'High',
						value: 'hihg',
					},
				],
			},
			{
				displayName: 'Location ID',
				name: 'location_id',
				type: 'options',
				description: 'Choose from the list or specify an ID. You can also specify the ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
				default: '',
				typeOptions: {
					loadOptionsMethod: [
						'getLocations',
					],
				},
			},
			{
				displayName: 'Usage Type',
				name: 'usage_type',
				type: 'options',
				default: 'loaner',
				options: [
					{
						name: 'Loaner',
						value: 'loaner',
					},
					{
						name: 'Permanent',
						value: 'permanent',
					},
				],
			},
		],
	},

	// ----------------------------------------
	//              asset: delete
	// ----------------------------------------
	{
		displayName: 'Asset Display ID',
		name: 'assetDisplayId',
		description: 'Display ID of the asset to delete. Do not confuse with asset ID.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'asset',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//                asset: get
	// ----------------------------------------
	{
		displayName: 'Asset Display ID',
		name: 'assetDisplayId',
		description: 'Display ID of the asset to retrieve. Do not confuse with asset ID.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'asset',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//              asset: getAll
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
					'asset',
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
					'asset',
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
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'asset',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Agent Name/ID',
				name: 'agent_id',
				type: 'options',
				default: '',
				description: 'ID of the agent by whom the asset is managed. Choose from the list or specify an ID. You can also specify the ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
				typeOptions: {
					loadOptionsMethod: [
						'getAgents',
					],
				},
			},
			{
				displayName: 'Asset State',
				name: 'asset_state',
				type: 'string',
				default: '',
				description: 'Status of the asset to filter by. For example, "In use".',
			},
			{
				displayName: 'Asset Type Name/ID',
				name: 'asset_type_id',
				type: 'options',
				default: '',
				description: 'ID of the asset type to filter by. Choose from the list or specify an ID. You can also specify the ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
				typeOptions: {
					loadOptionsMethod: [
						'getAssetTypes',
					],
				},
			},
			{
				displayName: 'Department Name/ID',
				name: 'department_id',
				type: 'options',
				default: '',
				description: 'ID of the department to which the asset belongs. Choose from the list or specify an ID. You can also specify the ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
				typeOptions: {
					loadOptionsMethod: [
						'getDepartments',
					],
				},
			},
			{
				displayName: 'Location Name/ID',
				name: 'location_id',
				type: 'options',
				default: '',
				description: 'ID of the location to filter by. Choose from the list or specify an ID. You can also specify the ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
				typeOptions: {
					loadOptionsMethod: [
						'getLocations',
					],
				},
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Display name of the asset to filter by',
			},
		],
	},

	// ----------------------------------------
	//              asset: update
	// ----------------------------------------
	{
		displayName: 'Asset Display ID',
		name: 'assetDisplayId',
		description: 'Display ID of the asset to update. Do not confuse with asset ID.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'asset',
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
					'asset',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Agent Name/ID',
				name: 'agent_id',
				type: 'options',
				default: '',
				description: 'ID of the agent who manages the asset. Choose from the list or specify an ID. You can also specify the ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
				typeOptions: {
					loadOptionsMethod: [
						'getAgents',
					],
				},
			},
			{
				displayName: 'Asset Type Name/ID',
				name: 'asset_type_id',
				type: 'options',
				default: '',
				description: 'ID of the asset type. Choose from the list or specify an ID. You can also specify the ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
				typeOptions: {
					loadOptionsMethod: [
						'getAssetTypes',
					],
				},
			},
			{
				displayName: 'Department Name/ID',
				name: 'department_id',
				type: 'options',
				description: 'Choose from the list or specify an ID. You can also specify the ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
				default: '',
				typeOptions: {
					loadOptionsMethod: [
						'getDepartments',
					],
				},
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Impact',
				name: 'impact',
				type: 'options',
				default: 'low',
				options: [
					{
						name: 'Low',
						value: 'low',
					},
					{
						name: 'Medium',
						value: 'medium',
					},
					{
						name: 'High',
						value: 'hihg',
					},
				],
			},
			{
				displayName: 'Location Name/ID',
				name: 'location_id',
				type: 'options',
				description: 'Choose from the list or specify an ID. You can also specify the ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>.',
				default: '',
				typeOptions: {
					loadOptionsMethod: [
						'getLocations',
					],
				},
			},
			{
				displayName: 'Asset Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Name of the asset',
			},
			{
				displayName: 'Usage Type',
				name: 'usage_type',
				type: 'options',
				default: 'loaner',
				options: [
					{
						name: 'Loaner',
						value: 'loaner',
					},
					{
						name: 'Permanent',
						value: 'permanent',
					},
				],
			},
		],
	},
] as INodeProperties[];
