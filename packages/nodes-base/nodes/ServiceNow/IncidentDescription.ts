import type { INodeProperties } from 'n8n-workflow';

export const incidentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['incident'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create an incident',
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete an incident',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get an incident',
			},
			{
				name: 'Get many',
				value: 'getAll',
				action: 'Get many incidents',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update an incident',
			},
		],
		default: 'get',
	},
];

export const incidentFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                incident:create                          */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Short description',
		name: 'short_description',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['incident'],
				operation: ['create'],
			},
		},
		required: true,
		description: 'Short description of the incident',
	},
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		displayOptions: {
			show: {
				resource: ['incident'],
				operation: ['create'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Assignee name or ID',
				name: 'assigned_to',
				type: 'options',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getUsers',
					loadOptionsDependsOn: ['additionalFields.assignment_group'],
				},
				default: '',
				description:
					'Which user is the incident assigned to. Requires the selection of an assignment group. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Assignment group name or ID',
				name: 'assignment_group',
				type: 'options',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getAssignmentGroups',
				},
				default: '',
				description:
					'The assignment group of the incident. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Business service name or ID',
				name: 'business_service',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getBusinessServices',
				},
				default: '',
			},
			{
				displayName: 'Caller ID',
				name: 'caller_id',
				type: 'string',
				default: '',
				description: 'The unique identifier of the caller of the incident',
			},
			{
				displayName: 'Category name or ID',
				name: 'category',
				type: 'options',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getIncidentCategories',
				},
				default: '',
				description:
					'The category of the incident. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Close notes',
				name: 'close_notes',
				type: 'string',
				default: '',
				description: 'The close notes for the incident',
			},
			{
				displayName: 'Configuration item names or IDs',
				name: 'cmdb_ci',
				type: 'multiOptions',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getConfigurationItems',
				},
				default: [],
				description:
					'Configuration Items, \'cmdb_ci\' in metadata. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Contact type',
				name: 'contact_type',
				type: 'options',
				options: [
					{
						name: 'Email',
						value: 'email',
					},
					{
						name: 'Phone',
						value: 'phone',
					},
					{
						name: 'Self service',
						value: 'self-service',
					},
					{
						name: 'Walk in',
						value: 'walk-in',
					},
				],
				default: '',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'The description of the incident',
			},
			{
				displayName: 'Impact',
				name: 'impact',
				type: 'options',
				options: [
					{
						name: 'Low',
						value: 3,
					},
					{
						name: 'Medium',
						value: 2,
					},
					{
						name: 'High',
						value: 1,
					},
				],
				default: 1,
				description: 'The impact of the incident',
			},
			{
				displayName: 'Resolution code name or ID',
				name: 'close_code',
				type: 'options',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getIncidentResolutionCodes',
				},
				default: '',
				description:
					'The resolution code of the incident, \'close_code\' in metadata. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'State name or ID',
				name: 'state',
				type: 'options',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getIncidentStates',
				},
				default: '',
				description:
					'The state of the incident. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Subcategory name or ID',
				name: 'subcategory',
				type: 'options',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getIncidentSubcategories',
					loadOptionsDependsOn: ['additionalFields.category'],
				},
				default: '',
				description:
					'The subcategory of the incident. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Urgency',
				name: 'urgency',
				type: 'options',
				options: [
					{
						name: 'Low',
						value: 3,
					},
					{
						name: 'Medium',
						value: 2,
					},
					{
						name: 'High',
						value: 1,
					},
				],
				default: 1,
				description: 'The urgency of the incident',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                incident:getAll                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['incident'],
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
				operation: ['getAll'],
				resource: ['incident'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		displayOptions: {
			show: {
				resource: ['incident'],
				operation: ['getAll'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Exclude reference link',
				name: 'sysparm_exclude_reference_link',
				type: 'boolean',
				default: false,
				description: 'Whether to exclude Table API links for reference fields',
			},
			{
				displayName: 'Field names or IDs',
				name: 'sysparm_fields',
				type: 'multiOptions',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getColumns',
				},
				default: [],
				description:
					'A list of fields to return. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				hint: 'String of comma separated values or an array of strings can be set in an expression',
			},
			{
				displayName: 'Filter',
				name: 'sysparm_query',
				type: 'string',
				default: '',
				description:
					'An encoded query string used to filter the results. <a href="https://developer.servicenow.com/dev.do#!/learn/learning-plans/quebec/servicenow_application_developer/app_store_learnv2_rest_quebec_more_about_query_parameters">More info</a>.',
			},
			{
				displayName: 'Return values',
				name: 'sysparm_display_value',
				type: 'options',
				options: [
					{
						name: 'Actual values',
						value: 'false',
					},
					{
						name: 'Both',
						value: 'all',
					},
					{
						name: 'Display values',
						value: 'true',
					},
				],
				default: 'false',
				description: 'Choose which values to return',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                incident:get/delete                       */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Incident ID',
		name: 'id',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['incident'],
				operation: ['delete', 'get'],
			},
		},
		required: true,
		description: 'Unique identifier of the incident',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		displayOptions: {
			show: {
				resource: ['incident'],
				operation: ['get'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Exclude reference link',
				name: 'sysparm_exclude_reference_link',
				type: 'boolean',
				default: false,
				description: 'Whether to exclude Table API links for reference fields',
			},
			{
				displayName: 'Field names or IDs',
				name: 'sysparm_fields',
				type: 'multiOptions',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getColumns',
				},
				default: [],
				description:
					'A list of fields to return. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				hint: 'String of comma separated values or an array of strings can be set in an expression',
			},
			{
				displayName: 'Return values',
				name: 'sysparm_display_value',
				type: 'options',
				options: [
					{
						name: 'Actual values',
						value: 'false',
					},
					{
						name: 'Both',
						value: 'all',
					},
					{
						name: 'Display values',
						value: 'true',
					},
				],
				default: 'false',
				description: 'Choose which values to return',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                incident:update                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Incident ID',
		name: 'id',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['incident'],
				operation: ['update'],
			},
		},
		required: true,
		description: 'Unique identifier of the incident',
	},
	{
		displayName: 'Update fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		displayOptions: {
			show: {
				resource: ['incident'],
				operation: ['update'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Assigned to name or ID',
				name: 'assigned_to',
				type: 'options',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getUsers',
					loadOptionsDependsOn: ['additionalFields.assignment_group'],
				},
				default: '',
				description:
					'Which user is the incident assigned to. Requires the selection of an assignment group. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Assignment group name or ID',
				name: 'assignment_group',
				type: 'options',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getAssignmentGroups',
				},
				default: '',
				description:
					'The assignment group of the incident. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Business service name or ID',
				name: 'business_service',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getBusinessServices',
				},
				default: '',
			},
			{
				displayName: 'Caller ID',
				name: 'caller_id',
				type: 'string',
				default: '',
				description: 'The unique identifier of the caller of the incident',
			},
			{
				displayName: 'Category name or ID',
				name: 'category',
				type: 'options',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getIncidentCategories',
				},
				default: '',
				description:
					'The category of the incident. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Close notes',
				name: 'close_notes',
				type: 'string',
				default: '',
				description: 'The close notes for the incident',
			},
			{
				displayName: 'Configuration item names or IDs',
				name: 'cmdb_ci',
				type: 'multiOptions',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getConfigurationItems',
				},
				default: [],
				description:
					'Configuration Items, \'cmdb_ci\' in metadata. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Contact type',
				name: 'contact_type',
				type: 'options',
				options: [
					{
						name: 'Email',
						value: 'email',
					},
					{
						name: 'Phone',
						value: 'phone',
					},
					{
						name: 'Self service',
						value: 'self-service',
					},
					{
						name: 'Walk in',
						value: 'walk-in',
					},
				],
				default: '',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'The description of the incident',
			},
			{
				displayName: 'Impact',
				name: 'impact',
				type: 'options',
				options: [
					{
						name: 'Low',
						value: 3,
					},
					{
						name: 'Medium',
						value: 2,
					},
					{
						name: 'High',
						value: 1,
					},
				],
				default: 1,
				description: 'The impact of the incident',
			},
			{
				displayName: 'Resolution code name or ID',
				name: 'close_code',
				type: 'options',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getIncidentResolutionCodes',
				},
				default: '',
				// nodelinter-ignore-next-line
				description:
					'The resolution code of the incident. \'close_code\' in metadata. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'On hold reason name or ID',
				name: 'hold_reason',
				type: 'options',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getIncidentHoldReasons',
				},
				default: '',
				description:
					'The on hold reason for the incident. It applies if the state is <code>On Hold</code>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'State name or ID',
				name: 'state',
				type: 'options',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getIncidentStates',
				},
				default: '',
				description:
					'The state of the incident. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Subcategory name or ID',
				name: 'subcategory',
				type: 'options',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getIncidentSubcategories',
					loadOptionsDependsOn: ['additionalFields.category'],
				},
				default: '',
				description:
					'The subcategory of the incident. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Urgency',
				name: 'urgency',
				type: 'options',
				options: [
					{
						name: 'Low',
						value: 3,
					},
					{
						name: 'Medium',
						value: 2,
					},
					{
						name: 'High',
						value: 1,
					},
				],
				default: 1,
				description: 'The urgency of the incident',
			},
			{
				displayName: 'Work notes',
				name: 'work_notes',
				type: 'string',
				default: '',
				description: 'Work notes for the incident',
			},
		],
	},
];
