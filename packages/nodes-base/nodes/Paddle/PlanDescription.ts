import type { INodeProperties } from 'n8n-workflow';

export const planOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['plan'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a plan',
				action: 'Get a plan',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many plans',
				action: 'Get many plans',
			},
		],
		default: 'get',
	},
];

export const planFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 plan:get                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Plan ID',
		name: 'planId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['plan'],
				operation: ['get'],
			},
		},
		description: 'Filter: The subscription plan ID',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['plan'],
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
				resource: ['plan'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},
];
