import type { INodeProperties } from 'n8n-workflow';

export const releaseOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['release'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a release',
				action: 'Create a release',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a release',
				action: 'Delete a release',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a release',
				action: 'Get a release',
			},
			{
				name: 'Get many',
				value: 'getAll',
				description: 'Retrieve many releases',
				action: 'Get many releases',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a release',
				action: 'Update a release',
			},
		],
		default: 'create',
	},
];

export const releaseFields: INodeProperties[] = [
	// ----------------------------------------
	//             release: create
	// ----------------------------------------
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['release'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Release type',
		name: 'releaseType',
		type: 'options',
		default: 1,
		displayOptions: {
			show: {
				resource: ['release'],
				operation: ['create'],
			},
		},
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
		displayName: 'Priority',
		name: 'priority',
		type: 'options',
		default: 1,
		displayOptions: {
			show: {
				resource: ['release'],
				operation: ['create'],
			},
		},
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
		displayName: 'Status',
		name: 'status',
		type: 'options',
		default: 1,
		displayOptions: {
			show: {
				resource: ['release'],
				operation: ['create'],
			},
		},

		options: [
			{
				name: 'Open',
				value: 1,
			},
			{
				name: 'On hold',
				value: 2,
			},
			{
				name: 'In progress',
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
		displayName: 'Planned start date',
		name: 'plannedStartDate',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['release'],
				operation: ['create'],
			},
		},
	},
	{
		displayName: 'Planned end date',
		name: 'plannedEndDate',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['release'],
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
				resource: ['release'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Department name or ID',
				name: 'department_id',
				type: 'options',
				default: '',
				description:
					'ID of the department initiating the release. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getDepartments',
				},
			},
			{
				displayName: 'Description',
				name: 'description',
				description: 'HTML supported',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Group name or ID',
				name: 'group_id',
				type: 'options',
				default: '',
				description:
					'ID of the agent group to which the release is assigned. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getAgentGroups',
				},
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
				resource: ['release'],
				operation: ['delete'],
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
				resource: ['release'],
				operation: ['get'],
			},
		},
	},

	// ----------------------------------------
	//             release: getAll
	// ----------------------------------------
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['release'],
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
				resource: ['release'],
				operation: ['getAll'],
				returnAll: [false],
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
				resource: ['release'],
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
				resource: ['release'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Department name or ID',
				name: 'department_id',
				type: 'options',
				default: '',
				description:
					'ID of the department initiating the release. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getDepartments',
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
				displayName: 'Group name or ID',
				name: 'group_id',
				type: 'options',
				default: '',
				description:
					'ID of the agent group to which the release is assigned. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				typeOptions: {
					loadOptionsMethod: 'getAgentGroups',
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
				displayName: 'Release type',
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
						name: 'On hold',
						value: 2,
					},
					{
						name: 'In progress',
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
			},
		],
	},
];
