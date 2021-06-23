import {
	INodeProperties,
} from 'n8n-workflow';

export const configurationItemsOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'configurationItems',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
			},
		],
		default: 'get',
		description: 'The operation to perform',
	},
] as INodeProperties[];

export const configurationItemsFields = [

	/* -------------------------------------------------------------------------- */
	/*                             configurationItems:getAll                      */
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
					'configurationItems',
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
					'configurationItems',
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
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'configurationItems',
				],
				operation: [
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
						value: 'true'
					},
					{
						name: 'Actual values',
						value: 'false'
					},
					{
						name: 'Both',
						value: 'all'
					},
				],
				default: 'false',
				description: 'Choose which values to return.',
			},
			{
				displayName: 'Query',
				name: 'sysparm_query',
				type: 'boolean',
				default: false,
				description: 'An encoded query string used to filter the results.',
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
				displayName: 'View',
				name: 'sysparm_view',
				type: 'boolean',
				default: false,
				description: 'Render the response according to the specified UI view (overridden by Fields option).',
			},
		],
	},
] as INodeProperties[];
