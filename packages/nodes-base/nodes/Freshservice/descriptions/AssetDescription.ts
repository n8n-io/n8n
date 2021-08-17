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
		displayName: 'Asset Type ID',
		name: 'asset_type_id',
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
				displayName: 'Agent ID',
				name: 'agent_id',
				type: 'options',
				default: '',
				description: 'ID of the agent who manages the asset',
				typeOptions: {
					loadOptionsMethod: [
						'getAgents',
					],
				},
			},
			{
				displayName: 'Department ID',
				name: 'department_id',
				type: 'options',
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
				displayName: 'Location ID',
				name: 'location_id',
				type: 'options',
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
		description: 'Display ID of the asset to delete',
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
		description: 'Display ID of the asset to retrieve',
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
				displayName: 'Agent ID',
				name: 'agent_id',
				type: 'options',
				default: '',
				description: 'ID of the agent by whom the asset is managed',
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
				displayName: 'Asset Type ID',
				name: 'asset_type_id',
				type: 'options',
				default: '',
				description: 'ID of the asset type to filter by',
				typeOptions: {
					loadOptionsMethod: [
						'getAssetTypes',
					],
				},
			},
			{
				displayName: 'Department ID',
				name: 'department_id',
				type: 'options',
				default: '',
				description: 'ID of the department to which the asset belongs',
				typeOptions: {
					loadOptionsMethod: [
						'getDepartments',
					],
				},
			},
			{
				displayName: 'Location ID',
				name: 'location_id',
				type: 'options',
				default: '',
				description: 'ID of the location to filter by',
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
		description: 'Display ID of the asset to update',
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
				displayName: 'Agent ID',
				name: 'agent_id',
				type: 'options',
				default: '',
				description: 'ID of the agent who manages the asset',
				typeOptions: {
					loadOptionsMethod: [
						'getAgents',
					],
				},
			},
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
				displayName: 'Department ID',
				name: 'department_id',
				type: 'options',
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
				displayName: 'Location ID',
				name: 'location_id',
				type: 'options',
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
