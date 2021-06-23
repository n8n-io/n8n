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
		displayName: 'Short description',
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
				displayName: 'Assigned to',
				name: 'assigned_to',
				type: 'string',
				default: '',
				description: 'What user is the incident assigned to.',
			},
			{
				displayName: 'Assignment group',
				name: 'assignment_group',
				type: 'string',
				default: '',
				description: 'The assignment group of the incident.',
			},
			{
				displayName: 'Business service',
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
				type: 'string',
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
				displayName: 'Contact type',
				name: 'contact_type',
				type: 'string',
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
				type: 'number',
				default: '',
				description: 'The impact of the incident.',
			},
			{
				displayName: 'Resolution code',
				name: 'close_code',
				type: 'string',
				default: '',
				description: 'The resolution code of the incident. \'close_code\' in metadata.',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'number',
				default: '',
				description: 'The state of the incident.',
			},
			{
				displayName: 'Subcategory',
				name: 'subcategory',
				type: 'string',
				default: '',
				description: 'The subcategory of the incident.',
			},
			{
				displayName: 'Urgency',
				name: 'urgency',
				type: 'number',
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
		displayName: 'ID',
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
					'get',
					'getAll',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Display values',
				name: 'sysparm_display_value',
				type: 'options',
				options: [
					{
						name: 'Display values',
						value: 'true',
					},
					{
						name: 'Actual values',
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
				displayName: 'Exclude reference link',
				name: 'sysparm_exclude_reference_link',
				type: 'boolean',
				default: false,
				description: 'Exclude Table API links for reference fields.',
			},
			{
				displayName: 'Fields',
				name: 'sysparm_fields',
				type: 'string',
				default: '',
				description: 'A comma-separated list of fields to return.',
			},
			{
				displayName: 'Query',
				name: 'sysparm_query',
				type: 'boolean',
				default: false,
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
		displayName: 'ID',
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
				displayName: 'Assigned to',
				name: 'assigned_to',
				type: 'string',
				default: '',
				description: 'The user who is assigned to the incident.',
			},
			{
				displayName: 'Close notes',
				name: 'close_notes',
				type: 'string',
				default: '',
				description: 'The close notes for the incident.',
			},
			{
				displayName: 'On hold reason',
				name: 'hold_reason',
				type: 'number',
				default: '',
				description: 'The on hold reason for the incident.',
			},
			{
				displayName: 'Resolution code',
				name: 'close_code',
				type: 'string',
				default: '',
				description: 'The resolution code of the incident. \'close_code\' in metadata.',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'number',
				default: '',
				description: 'The state of the incident.',
			},
		],
	},
] as INodeProperties[];
