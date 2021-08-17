import {
	INodeProperties,
} from 'n8n-workflow';

import {
	LANGUAGES,
} from '../constants';

export const agentOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'agent',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create an agent',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an agent',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve an agent',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all agents',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an agent',
			},
		],
		default: 'create',
	},
] as INodeProperties[];

export const agentFields = [
	// ----------------------------------------
	//              agent: create
	// ----------------------------------------
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'agent',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'First Name',
		name: 'first_name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'agent',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Roles',
		name: 'roles',
		description: 'Role to assign to the agent',
		type: 'fixedCollection',
		placeholder: 'Add Role',
		typeOptions: {
			multipleValues: true,
		},
		required: true,
		default: {},
		displayOptions: {
			show: {
				resource: [
					'agent',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Role Properties',
				name: 'roleProperties',
				values: [
					{
						displayName: 'Role Name',
						name: 'role',
						description: 'Name of the role to assign to the agent',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: [
								'getAgentRoles',
							],
						},
						required: true,
						default: '',
					},
					{
						displayName: 'Scope',
						name: 'assignment_scope',
						description: 'Scope in which the agent may use the permissions granted by the role',
						type: 'options',
						options: [
							{
								name: 'Entire Helpdesk',
								value: 'entire_helpdesk',
							},
							{
								name: 'Member Groups',
								value: 'member_groups',
							},
							{
								name: 'Specified Groups',
								value: 'specified_groups',
							},
							{
								name: 'Assigned Items',
								value: 'assigned_items',
							},
						],
						required: true,
						default: 'specified_groups',
					},
					{
						displayName: 'Groups',
						name: 'groups',
						description: 'Groups in which the permissions granted by the role apply. Required only when Scope is Specified Groups - ignored otherwise.',
						type: 'multiOptions',
						typeOptions: {
							loadOptionsMethod: [
								'getAgentGroupsForRoles',
							],
						},
						default: [],
					},
				],
			},
		],
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
					'agent',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Background Information',
				name: 'background_information',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Department IDs',
				name: 'department_ids',
				type: 'multiOptions',
				default: [],
				description: 'IDs of the departments to which the agent belongs',
				typeOptions: {
					loadOptionsMethod: [
						'getDepartments',
					],
				},
			},
			{
				displayName: 'Job Title',
				name: 'job_title',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'options',
				default: '',
				options: LANGUAGES,
			},
			{
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				default: '',
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
				displayName: 'Member Of',
				name: 'member_of',
				type: 'multiOptions',
				default: [],
				description: 'Comma-separated IDs of the groups that the agent is a member of',
				typeOptions: {
					loadOptionsMethod: [
						'getAgentGroups',
					],
				},
			},
			{
				displayName: 'Mobile Phone',
				name: 'mobile_phone_number',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Observer Of',
				name: 'observer_of',
				type: 'multiOptions',
				default: [],
				description: 'Comma-separated IDs of the groups that the agent is an observer of',
				typeOptions: {
					loadOptionsMethod: [
						'getAgentGroups',
					],
				},
			},
			{
				displayName: 'Scoreboard Level ID',
				name: 'scoreboard_level_id',
				type: 'options',
				description: 'ID of the level of the agent in the Arcade',
				default: 1,
				options: [
					{
						name: 'Beginner',
						value: 1,
					},
					{
						name: 'Intermediate',
						value: 2,
					},
					{
						name: 'Professional',
						value: 3,
					},
					{
						name: 'Expert',
						value: 4,
					},
					{
						name: 'Master',
						value: 5,
					},
					{
						name: 'Guru',
						value: 6,
					},
				],
			},
			{
				displayName: 'Time Format',
				name: 'time_format',
				type: 'options',
				default: '12h',
				options: [
					{
						name: '12-Hour Format',
						value: '12h',
					},
					{
						name: '24-Hour Format',
						value: '24h',
					},
				],
			},
			{
				displayName: 'Work Phone',
				name: 'work_phone_number',
				type: 'string',
				default: '',
			},
		],
	},

	// ----------------------------------------
	//              agent: delete
	// ----------------------------------------
	{
		displayName: 'Agent ID',
		name: 'agentId',
		description: 'ID of the agent to delete',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'agent',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------------
	//                agent: get
	// ----------------------------------------
	{
		displayName: 'Agent ID',
		name: 'agentId',
		description: 'ID of the agent to retrieve',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'agent',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------------
	//              agent: getAll
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
					'agent',
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
					'agent',
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
					'agent',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Department ID',
				name: 'department_id',
				type: 'options',
				default: '',
				description: 'ID of the department to which the agent belongs',
				typeOptions: {
					loadOptionsMethod: [
						'getDepartments',
					],
				},
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
			},
			{
				displayName: 'First Name',
				name: 'first_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Job Title',
				name: 'job_title',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'options',
				default: '',
				options: LANGUAGES,
			},
			{
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				default: '',
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
				displayName: 'Mobile Phone Number',
				name: 'mobile_phone_number',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Concatenation of <code>first_name</code> and <code>last_name</code> with a single space between fields',
			},
			{
				displayName: 'Work Phone Number',
				name: 'work_phone_number',
				type: 'string',
				default: '',
			},
		],
	},

	// ----------------------------------------
	//              agent: update
	// ----------------------------------------
	{
		displayName: 'Agent ID',
		name: 'agentId',
		description: 'ID of the agent to update',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'agent',
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
					'agent',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Background Information',
				name: 'background_information',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Department IDs',
				name: 'department_ids',
				type: 'multiOptions',
				default: [],
				description: 'IDs of the departments to which the agent belongs',
				typeOptions: {
					loadOptionsMethod: [
						'getDepartments',
					],
				},
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
			},
			{
				displayName: 'First Name',
				name: 'first_name',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Job Title',
				name: 'job_title',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'options',
				default: '',
				options: LANGUAGES,
			},
			{
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				default: '',
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
				displayName: 'Member Of',
				name: 'member_of',
				type: 'multiOptions',
				default: [],
				description: 'Comma-separated IDs of the groups that the agent is a member of',
				typeOptions: {
					loadOptionsMethod: [
						'getAgentGroups',
					],
				},
			},
			{
				displayName: 'Mobile Phone',
				name: 'mobile_phone_number',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Observer Of',
				name: 'observer_of',
				type: 'multiOptions',
				default: [],
				description: 'Comma-separated IDs of the groups that the agent is an observer of',
				typeOptions: {
					loadOptionsMethod: [
						'getAgentGroups',
					],
				},
			},
			{
				displayName: 'Scoreboard Level ID',
				name: 'scoreboard_level_id',
				type: 'options',
				description: 'ID of the level of the agent in the Arcade',
				default: 1,
				options: [
					{
						name: 'Beginner',
						value: 1,
					},
					{
						name: 'Intermediate',
						value: 2,
					},
					{
						name: 'Professional',
						value: 3,
					},
					{
						name: 'Expert',
						value: 4,
					},
					{
						name: 'Master',
						value: 5,
					},
					{
						name: 'Guru',
						value: 6,
					},
				],
			},
			{
				displayName: 'Time Format',
				name: 'time_format',
				type: 'options',
				default: '12h',
				options: [
					{
						name: '12-Hour Format',
						value: '12h',
					},
					{
						name: '24-Hour Format',
						value: '24h',
					},
				],
			},
			{
				displayName: 'Work Phone',
				name: 'work_phone_number',
				type: 'string',
				default: '',
			},
		],
	},
] as INodeProperties[];
