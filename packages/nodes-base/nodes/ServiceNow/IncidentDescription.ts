import { INodeProperties } from 'n8n-workflow';

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
				name: 'Get Many',
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
		displayName: 'Short Description',
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['incident'],
				operation: ['create'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Asignee Name or ID',
				name: 'assigned_to',
				type: 'options',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getUsers',
					loadOptionsDependsOn: ['additionalFields.assignment_group'],
				},
				default: '',
				description:
					'Which user is the incident assigned to. Requires the selection of an assignment group. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Assignment Group Name or ID',
				name: 'assignment_group',
				type: 'options',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getAssignmentGroups',
				},
				default: '',
				description:
					'The assignment group of the incident. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Business Service Name or ID',
				name: 'business_service',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
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
				displayName: 'Category Name or ID',
				name: 'category',
				type: 'options',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getIncidentCategories',
				},
				default: '',
				description:
					'The category of the incident. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Close Notes',
				name: 'close_notes',
				type: 'string',
				default: '',
				description: 'The close notes for the incident',
			},
			{
				displayName: 'Configuration Item Names or IDs',
				name: 'cmdb_ci',
				type: 'multiOptions',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getConfigurationItems',
				},
				default: [],
				description:
					'Configuration Items, \'cmdb_ci\' in metadata. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Contact Type',
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
						name: 'Self Service',
						value: 'self-service',
					},
					{
						name: 'Walk In',
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
				displayName: 'Resolution Code Name or ID',
				name: 'close_code',
				type: 'options',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getIncidentResolutionCodes',
				},
				default: '',
				description:
					'The resolution code of the incident, \'close_code\' in metadata. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'State Name or ID',
				name: 'state',
				type: 'options',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getIncidentStates',
				},
				default: '',
				description:
					'The state of the incident. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Subcategory Name or ID',
				name: 'subcategory',
				type: 'options',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getIncidentSubcategories',
					loadOptionsDependsOn: ['additionalFields.category'],
				},
				default: '',
				description:
					'The subcategory of the incident. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
		displayName: 'Return All',
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
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				resource: ['incident'],
				operation: ['getAll'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Exclude Reference Link',
				name: 'sysparm_exclude_reference_link',
				type: 'boolean',
				default: false,
				description: 'Whether to exclude Table API links for reference fields',
			},
			{
				displayName: 'Field Names or IDs',
				name: 'sysparm_fields',
				type: 'multiOptions',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getColumns',
				},
				default: [],
				description:
					'A list of fields to return. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
				displayName: 'Return Values',
				name: 'sysparm_display_value',
				type: 'options',
				options: [
					{
						name: 'Actual Values',
						value: 'false',
					},
					{
						name: 'Both',
						value: 'all',
					},
					{
						name: 'Display Values',
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
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				resource: ['incident'],
				operation: ['get'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Exclude Reference Link',
				name: 'sysparm_exclude_reference_link',
				type: 'boolean',
				default: false,
				description: 'Whether to exclude Table API links for reference fields',
			},
			{
				displayName: 'Field Names or IDs',
				name: 'sysparm_fields',
				type: 'multiOptions',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getColumns',
				},
				default: [],
				description:
					'A list of fields to return. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
				hint: 'String of comma separated values or an array of strings can be set in an expression',
			},
			{
				displayName: 'Return Values',
				name: 'sysparm_display_value',
				type: 'options',
				options: [
					{
						name: 'Actual Values',
						value: 'false',
					},
					{
						name: 'Both',
						value: 'all',
					},
					{
						name: 'Display Values',
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
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['incident'],
				operation: ['update'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Assigned To Name or ID',
				name: 'assigned_to',
				type: 'options',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getUsers',
					loadOptionsDependsOn: ['additionalFields.assignment_group'],
				},
				default: '',
				description:
					'Which user is the incident assigned to. Requires the selection of an assignment group. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Assignment Group Name or ID',
				name: 'assignment_group',
				type: 'options',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getAssignmentGroups',
				},
				default: '',
				description:
					'The assignment group of the incident. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Business Service Name or ID',
				name: 'business_service',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
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
				displayName: 'Category Name or ID',
				name: 'category',
				type: 'options',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getIncidentCategories',
				},
				default: '',
				description:
					'The category of the incident. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Close Notes',
				name: 'close_notes',
				type: 'string',
				default: '',
				description: 'The close notes for the incident',
			},
			{
				displayName: 'Configuration Item Names or IDs',
				name: 'cmdb_ci',
				type: 'multiOptions',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getConfigurationItems',
				},
				default: [],
				description:
					'Configuration Items, \'cmdb_ci\' in metadata. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Contact Type',
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
						name: 'Self Service',
						value: 'self-service',
					},
					{
						name: 'Walk In',
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
				displayName: 'Resolution Code Name or ID',
				name: 'close_code',
				type: 'options',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getIncidentResolutionCodes',
				},
				default: '',
				// nodelinter-ignore-next-line
				description:
					'The resolution code of the incident. \'close_code\' in metadata. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'On Hold Reason Name or ID',
				name: 'hold_reason',
				type: 'options',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getIncidentHoldReasons',
				},
				default: '',
				description:
					'The on hold reason for the incident. It applies if the state is <code>On Hold</code>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'State Name or ID',
				name: 'state',
				type: 'options',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getIncidentStates',
				},
				default: '',
				description:
					'The state of the incident. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Subcategory Name or ID',
				name: 'subcategory',
				type: 'options',
				typeOptions: {
					// nodelinter-ignore-next-line
					loadOptionsMethod: 'getIncidentSubcategories',
					loadOptionsDependsOn: ['additionalFields.category'],
				},
				default: '',
				description:
					'The subcategory of the incident. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
];
