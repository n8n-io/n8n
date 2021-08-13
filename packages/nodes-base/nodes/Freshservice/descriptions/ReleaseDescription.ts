import {
	INodeProperties,
} from 'n8n-workflow';

export const releaseOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'release',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a release',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a release',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a release',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all releases',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a release',
			},
		],
		default: 'create',
	},
] as INodeProperties[];

export const releaseFields = [
	// ----------------------------------------
	//             release: create
	// ----------------------------------------
	{
		displayName: 'Description',
		name: 'description',
		description: 'Description of the release in HTML',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'release',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Subject',
		name: 'subject',
		description: 'Subject of the release',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'release',
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
					'release',
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
				description: 'ID of the agent to whom the release is assigned',
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
				description: 'ID of the department initiating the release',
				typeOptions: {
					loadOptionsMethod: [
						'getDepartments',
					],
				},
			},
			{
				displayName: 'Group ID',
				name: 'group_id',
				type: 'options',
				default: '',
				description: 'ID of the agent group to which the release is assigned',
				typeOptions: {
					loadOptionsMethod: [
						'getAgentGroups',
					],
				},
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				default: 1,
				options: [
					{
						name: 'Low',
						value: 1,
					},
					{
						name: 'Medium',
						value: 2,
					},
					{
						name: 'High',
						value: 3,
					},
					{
						name: 'Urgent',
						value: 4,
					},
				],
			},
			{
				displayName: 'Release Type',
				name: 'release_type',
				type: 'options',
				default: 1,
				options: [
					{
						name: 'Minor',
						value: 1,
					},
					{
						name: 'Standard',
						value: 2,
					},
					{
						name: 'Major',
						value: 3,
					},
					{
						name: 'Emergency',
						value: 4,
					},
				],
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 1,
				options: [
					{
						name: 'Open',
						value: 1,
					},
					{
						name: 'On Hold',
						value: 2,
					},
					{
						name: 'In Progress',
						value: 3,
					},
					{
						name: 'Incomplete',
						value: 4,
					},
					{
						name: 'Completed',
						value: 5,
					},
				],
			},
		],
	},

	// ----------------------------------------
	//             release: delete
	// ----------------------------------------
	{
		displayName: 'Release ID',
		name: 'releaseId',
		description: 'ID of the release to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'release',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//               release: get
	// ----------------------------------------
	{
		displayName: 'Release ID',
		name: 'releaseId',
		description: 'ID of the release to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'release',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//             release: getAll
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
					'release',
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
					'release',
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
	//             release: update
	// ----------------------------------------
	{
		displayName: 'Release ID',
		name: 'releaseId',
		description: 'ID of the release to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'release',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'Update Fields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'release',
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
				description: 'ID of the agent to whom the release is assigned',
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
				description: 'ID of the department initiating the release',
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
				description: 'Description of the release in HTML',
			},
			{
				displayName: 'Group ID',
				name: 'group_id',
				type: 'options',
				default: '',
				description: 'ID of the agent group to which the release is assigned',
				typeOptions: {
					loadOptionsMethod: [
						'getAgentGroups',
					],
				},
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				default: 1,
				options: [
					{
						name: 'Low',
						value: 1,
					},
					{
						name: 'Medium',
						value: 2,
					},
					{
						name: 'High',
						value: 3,
					},
					{
						name: 'Urgent',
						value: 4,
					},
				],
			},
			{
				displayName: 'Release Type',
				name: 'release_type',
				type: 'options',
				default: 1,
				options: [
					{
						name: 'Minor',
						value: 1,
					},
					{
						name: 'Standard',
						value: 2,
					},
					{
						name: 'Major',
						value: 3,
					},
					{
						name: 'Emergency',
						value: 4,
					},
				],
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 1,
				options: [
					{
						name: 'Open',
						value: 1,
					},
					{
						name: 'On Hold',
						value: 2,
					},
					{
						name: 'In Progress',
						value: 3,
					},
					{
						name: 'Incomplete',
						value: 4,
					},
					{
						name: 'Completed',
						value: 5,
					},
				],
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: 'Subject of the release',
			},
		],
	},
] as INodeProperties[];
