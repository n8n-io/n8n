import {
	INodeProperties,
} from 'n8n-workflow';

export const incidentOperations = [
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
		description: 'The operation to perform',
	},
] as INodeProperties[];

export const incidentFields = [
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
		description: 'Short description of the incident.',
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
					loadOptionsMethod: 'getUsers'
				},
				default: '',
				description: 'What user is the incident assigned to.',
			},
			{
				displayName: 'Assignment Group',
				name: 'assignment_group',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getAssignmentGroups'
				},
				default: '',
				description: 'The assignment group of the incident.',
			},
			{
				displayName: 'Business Service',
				name: 'business_service',
				type: 'string',
				default: '',
				description: 'The business service.',
			},
			{
				displayName: 'Caller ID',
				name: 'caller_id',
				type: 'string',
				default: '',
				description: 'The unique identifier of the caller of the incident.',
			},
			{
				displayName: 'Category',
				name: 'category',
				type: 'options',
				options: [
					{
						name: "Inquiry / Help",
						value: "Inquiry / Help",
					},
					{
						name: "Software",
						value: "Software",
					},
					{
						name: "Hardware",
						value: "Hardware",
					},
					{
						name: "Network",
						value: "Network",
					},
					{
						name: "Database",
						value: "Database",
					},
				],
				default: '',
				description: 'The category of the incident.',
			},
			{
				displayName: 'Close note',
				name: 'close_notes',
				type: 'string',
				default: '',
				description: 'The close notes for the incident.',
			},
			{
				displayName: 'Configuration Items',
				name: 'cmdb_ci',
				type: 'string',
				default: '',
				description: 'Configuration Items, \'cmdb_ci\' in metadata.',
			},
			{
				displayName: 'Contact Type',
				name: 'contact_type',
				type: 'options',
				options: [
					{
						name: "Email",
						value: "Email",
					},
					{
						name: "Phone",
						value: "Phone",
					},
					{
						name: "Self Service",
						value: "Self-service",
					},
					{
						name: "Walk In",
						value: "Walk-in",
					},
				],
				default: '',
				description: 'The contact type.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'The description of the incident.',
			},
			{
				displayName: 'Impact',
				name: 'impact',
				type: 'options',
				options: [
					{
						name: "Low",
						value: 1,
					},
					{
						name: "Medium",
						value: 2,
					},
					{
						name: "High",
						value: 3,
					},
				],
				default: '',
				description: 'The impact of the incident.',
			},
			{
				displayName: 'Resolution Code',
				name: 'close_code',
				type: 'options',
				options: [
					{
						name: "Solved (Work Around)",
						value: "Solved (Work Around)",
					},
					{
						name: "Solved (Permanently)",
						value: "Solved (Permanently)",
					},
					{
						name: "Solved Remotely (Work Around)",
						value: "Solved Remotely (Work Around)",
					},
					{
						name: "Solved Remotely (Permanently)",
						value: "Solved Remotely (Permanently)",
					},
					{
						name: "Not Solved (Not Reproducible)",
						value: "Not Solved (Not Reproducible)",
					},
					{
						name: "Not Solved (Too Costly)",
						value: "Not Solved (Too Costly)",
					},
					{
						name: "Closed/Resolved By Caller",
						value: "Closed/Resolved by Caller",
					},
				],
				default: '',
				description: 'The resolution code of the incident. \'close_code\' in metadata.',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'options',
				options: [
					{
						name: "New",
						value: 1,
						description: "Incident is logged but not yet investigated."
					},
					{
						name: "In Progress",
						value: 2,
						description: "Incident is assigned and is being investigated."
					},
					{
						name: "On Hold",
						value: 3,
						description: "The responsibility for the incident shifts temporarily to another entity to provide further information, evidence, or a resolution."
					},
					{
						name: "Resolved",
						value: 6,
						description: "A satisfactory fix is provided for the incident to ensure that it does not occur again."
					},
					{
						name: "Closed",
						value: 7,
						description: "Incident is marked Closed after it is in the Resolved state for a specific duration and it is confirmed that the incident is satisfactorily resolved."
					},
					{
						name: "Canceled",
						value: 8,
						description: "Incident was triaged but found to be a duplicate incident, an unnecessary incident, or not an incident at all."
					},
				],
				default: '',
				description: 'The state of the incident.',
			},
			{
				displayName: 'Subcategory',
				name: 'subcategory',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getSubcategories',
					loadOptionsDependsOn: [
						'additionalFields.category',
					],
				},
				default: '',
				description: 'The subcategory of the incident.',
			},
			{
				displayName: 'Urgency',
				name: 'urgency',
				type: 'options',
				options: [
					{
						name: "Low",
						value: 1,
					},
					{
						name: "Medium",
						value: 2,
					},
					{
						name: "High",
						value: 3,
					},
				],
				default: '',
				description: 'The urgency of the incident.',
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
		description: 'If all results should be returned or only up to a given limit.',
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
		default: 100,
		description: 'How many results to return.',
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
		description: 'Unique identifier of the incident.',
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
					'getAll',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Display Values',
				name: 'sysparm_display_value',
				type: 'options',
				options: [
					{
						name: 'Display Values',
						value: 'true',
					},
					{
						name: 'Actual Values',
						value: 'false',
					},
					{
						name: 'Both',
						value: 'all',
					},
				],
				default: 'false',
				description: 'Choose which values to return.',
			},
			{
				displayName: 'Exclude Reference Link',
				name: 'sysparm_exclude_reference_link',
				type: 'boolean',
				default: false,
				description: 'Exclude Table API links for reference fields.',
			},
			{
				displayName: 'Fields',
				name: 'sysparm_fields',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getColumns',
				},
				default: '',
				description: 'A list of fields to return.',
			},
			{
				displayName: 'Query',
				name: 'sysparm_query',
				type: 'string',
				default: '',
				description: 'An encoded query string used to filter the results.',
			},
			{
				displayName: 'View',
				name: 'sysparm_view',
				type: 'boolean',
				default: false,
				description: 'Render the response according to the specified UI view (overridden by Fields option).',
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
		description: 'Unique identifier of the incident.',
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
					loadOptionsMethod: 'getUsers'
				},
				default: '',
				description: 'What user is the incident assigned to.',
			},
			{
				displayName: 'Close Notes',
				name: 'close_notes',
				type: 'string',
				default: '',
				description: 'The close notes for the incident.',
			},
			{
				displayName: 'On Hold Reason',
				name: 'hold_reason',
				type: 'number',
				default: '',
				description: 'The on hold reason for the incident.',
			},
			{
				displayName: 'Resolution Code',
				name: 'close_code',
				type: 'string',
				default: '',
				description: 'The resolution code of the incident. \'close_code\' in metadata.',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'options',
				options: [
					{
						name: "New",
						value: 1,
						description: "Incident is logged but not yet investigated."
					},
					{
						name: "In Progress",
						value: 2,
						description: "Incident is assigned and is being investigated."
					},
					{
						name: "On Hold",
						value: 3,
						description: "The responsibility for the incident shifts temporarily to another entity to provide further information, evidence, or a resolution."
					},
					{
						name: "Resolved",
						value: 6,
						description: "A satisfactory fix is provided for the incident to ensure that it does not occur again."
					},
					{
						name: "Closed",
						value: 7,
						description: "Incident is marked Closed after it is in the Resolved state for a specific duration and it is confirmed that the incident is satisfactorily resolved."
					},
					{
						name: "Canceled",
						value: 8,
						description: "Incident was triaged but found to be a duplicate incident, an unnecessary incident, or not an incident at all."
					},
				],
				default: '',
				description: 'The state of the incident.',
			},
		],
	},
] as INodeProperties[];
