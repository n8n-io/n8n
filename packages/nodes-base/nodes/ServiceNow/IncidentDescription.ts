import {
	INodeProperties,
} from 'n8n-workflow';

export const incidentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'incident',
				],
			},
		},
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
				resource: [
					'incident',
				],
				operation: [
					'create',
				],
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
				resource: [
					'incident',
				],
				operation: [
					'create',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Assigned To',
				name: 'assigned_to',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
					loadOptionsDependsOn: [
						'additionalFields.assignment_group',
					],
				},
				default: '',
				description: 'Which user is the incident assigned to. Requires the selection of an assignment group',
			},
			{
				displayName: 'Assignment Group',
				name: 'assignment_group',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getAssignmentGroups',
				},
				default: '',
				description: 'The assignment group of the incident',
			},
			{
				displayName: 'Business Service',
				name: 'business_service',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getBusinessServices',
				},
				default: '',
				description: 'The business service',
			},
			{
				displayName: 'Caller ID',
				name: 'caller_id',
				type: 'string',
				default: '',
				description: 'The unique identifier of the caller of the incident',
			},
			{
				displayName: 'Category',
				name: 'category',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getIncidentCategories',
				},
				default: '',
				description: 'The category of the incident',
			},
			{
				displayName: 'Close Notes',
				name: 'close_notes',
				type: 'string',
				default: '',
				description: 'The close notes for the incident',
			},
			{
				displayName: 'Configuration Items',
				name: 'cmdb_ci',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getConfigurationItems',
				},
				default: '',
				description: 'Configuration Items, \'cmdb_ci\' in metadata',
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
				description: 'The contact type',
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
				default: '',
				description: 'The impact of the incident',
			},
			{
				displayName: 'Resolution Code',
				name: 'close_code',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getIncidentResolutionCodes',
				},
				default: '',
				description: 'The resolution code of the incident. \'close_code\' in metadata',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getIncidentStates',
				},
				default: '',
				description: 'The state of the incident',
			},
			{
				displayName: 'Subcategory',
				name: 'subcategory',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getIncidentSubcategories',
					loadOptionsDependsOn: [
						'additionalFields.category',
					],
				},
				default: '',
				description: 'The subcategory of the incident',
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
				default: '',
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
				operation: [
					'getAll',
				],
				resource: [
					'incident',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'incident',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 50,
		description: 'The max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				resource: [
					'incident',
				],
				operation: [
					'getAll',
				],
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
				displayName: 'Fields',
				name: 'sysparm_fields',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getColumns',
				},
				default: '',
				description: 'A list of fields to return',
			},
			{
				displayName: 'Filter',
				name: 'sysparm_query',
				type: 'string',
				default: '',
				description: 'An encoded query string used to filter the results. <a href="https://developer.servicenow.com/dev.do#!/learn/learning-plans/quebec/servicenow_application_developer/app_store_learnv2_rest_quebec_more_about_query_parameters">More info</a>',
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
				resource: [
					'incident',
				],
				operation: [
					'delete',
					'get',
				],
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
				resource: [
					'incident',
				],
				operation: [
					'get',
				],
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
				displayName: 'Fields',
				name: 'sysparm_fields',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getColumns',
				},
				default: '',
				description: 'A list of fields to return',
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
				resource: [
					'incident',
				],
				operation: [
					'update',
				],
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
				resource: [
					'incident',
				],
				operation: [
					'update',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Assigned To',
				name: 'assigned_to',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
					loadOptionsDependsOn: [
						'additionalFields.assignment_group',
					],
				},
				default: '',
				description: 'Which user is the incident assigned to. Requires the selection of an assignment group',
			},
			{
				displayName: 'Assignment Group',
				name: 'assignment_group',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getAssignmentGroups',
				},
				default: '',
				description: 'The assignment group of the incident',
			},
			{
				displayName: 'Business Service',
				name: 'business_service',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getBusinessServices',
				},
				default: '',
				description: 'The business service',
			},
			{
				displayName: 'Caller ID',
				name: 'caller_id',
				type: 'string',
				default: '',
				description: 'The unique identifier of the caller of the incident',
			},
			{
				displayName: 'Category',
				name: 'category',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getIncidentCategories',
				},
				default: '',
				description: 'The category of the incident',
			},
			{
				displayName: 'Close Notes',
				name: 'close_notes',
				type: 'string',
				default: '',
				description: 'The close notes for the incident',
			},
			{
				displayName: 'Configuration Items',
				name: 'cmdb_ci',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getConfigurationItems',
				},
				default: '',
				description: 'Configuration Items, \'cmdb_ci\' in metadata',
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
				description: 'The contact type',
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
				default: '',
				description: 'The impact of the incident',
			},
			{
				displayName: 'Resolution Code',
				name: 'close_code',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getIncidentResolutionCodes',
				},
				default: '',
				description: 'The resolution code of the incident. \'close_code\' in metadata',
			},
			{
				displayName: 'On Hold Reason',
				name: 'hold_reason',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getIncidentHoldReasons',
				},
				default: '',
				description: 'The on hold reason for the incident. It applies if the state is <code>On Hold</code>',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getIncidentStates',
				},
				default: '',
				description: 'The state of the incident',
			},
			{
				displayName: 'Subcategory',
				name: 'subcategory',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getIncidentSubcategories',
					loadOptionsDependsOn: [
						'additionalFields.category',
					],
				},
				default: '',
				description: 'The subcategory of the incident',
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
				default: '',
				description: 'The urgency of the incident',
			},
		],
	},
];
