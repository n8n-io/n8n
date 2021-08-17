import {
	INodeProperties,
} from 'n8n-workflow';

export const problemOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'problem',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a problem',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a problem',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a problem',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all problems',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a problem',
			},
		],
		default: 'create',
	},
] as INodeProperties[];

export const problemFields = [
	// ----------------------------------------
	//             problem: create
	// ----------------------------------------
	{
		displayName: 'Description',
		name: 'description',
		description: 'Content of the problem in HTML',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'problem',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Requester ID',
		name: 'requester_id',
		description: 'ID of the initiator of the problem',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'problem',
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
		description: 'Subject of the problem',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'problem',
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
					'problem',
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
				description: 'ID of the agent to whom the problem is assigned',
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
				description: 'ID of the department initiating the problem',
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
				description: 'ID of the agent group to which the problem is assigned',
				typeOptions: {
					loadOptionsMethod: [
						'getAgentGroups',
					],
				},
			},
			{
				displayName: 'Impact',
				name: 'impact',
				type: 'options',
				default: 'Low',
				options: [
					{
						name: 'Low',
						value: 'Low',
					},
					{
						name: 'Medium',
						value: 'Medium',
					},
					{
						name: 'High',
						value: 'High',
					},
				],
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
						name: 'Change Requested',
						value: 2,
					},
					{
						name: 'Closed',
						value: 3,
					},
				],
			},
		],
	},

	// ----------------------------------------
	//             problem: delete
	// ----------------------------------------
	{
		displayName: 'Problem ID',
		name: 'problemId',
		description: 'ID of the problem to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'problem',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//               problem: get
	// ----------------------------------------
	{
		displayName: 'Problem ID',
		name: 'problemId',
		description: 'ID of the problem to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'problem',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//             problem: getAll
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
					'problem',
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
					'problem',
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
	//             problem: update
	// ----------------------------------------
	{
		displayName: 'Problem ID',
		name: 'problemId',
		description: 'ID of the problem to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'problem',
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
					'problem',
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
				description: 'ID of the agent to whom the problem is assigned',
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
				description: 'ID of the department initiating the problem',
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
				description: 'Content of the problem in HTML',
			},
			{
				displayName: 'Group ID',
				name: 'group_id',
				type: 'options',
				default: '',
				description: 'ID of the agent group to which the problem is assigned',
				typeOptions: {
					loadOptionsMethod: [
						'getAgentGroups',
					],
				},
			},
			{
				displayName: 'Impact',
				name: 'impact',
				type: 'options',
				default: 'Low',
				options: [
					{
						name: 'Low',
						value: 'Low',
					},
					{
						name: 'Medium',
						value: 'Medium',
					},
					{
						name: 'High',
						value: 'High',
					},
				],
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				default: 'Low',
				options: [
					{
						name: 'Low',
						value: 'Low',
					},
					{
						name: 'Medium',
						value: 'Medium',
					},
					{
						name: 'High',
						value: 'High',
					},
					{
						name: 'Urgent',
						value: 'Urgent',
					},
				],
			},
			{
				displayName: 'Requester ID',
				name: 'requester_id',
				type: 'string',
				default: '',
				description: 'ID of the initiator of the problem',
				typeOptions: {
					loadOptionsMethod: [
						'getRequesters',
					],
				},
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
						name: 'Change Requested',
						value: 2,
					},
					{
						name: 'Closed',
						value: 3,
					},
				],
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: 'Subject of the problem',
			},
		],
	},
] as INodeProperties[];
