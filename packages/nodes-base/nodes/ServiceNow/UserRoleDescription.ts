import type { INodeProperties } from 'n8n-workflow';

export const userRoleOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['userRole'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many user roles',
			},
		],
		default: 'getAll',
	},
];

export const userRoleFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                userRole:getAll                      */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['userRole'],
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
				resource: ['userRole'],
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
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['userRole'],
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
];
