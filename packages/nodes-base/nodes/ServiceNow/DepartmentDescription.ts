import type { INodeProperties } from 'n8n-workflow';

export const departmentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['department'],
			},
		},
		options: [
			{
				name: 'Get many',
				value: 'getAll',
				action: 'Get many departments',
			},
		],
		default: 'getAll',
	},
];

export const departmentFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                department:getAll                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['department'],
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
				resource: ['department'],
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
		placeholder: 'Add field',
		displayOptions: {
			show: {
				resource: ['department'],
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
];
