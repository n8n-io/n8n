import type { INodeProperties } from 'n8n-workflow';

export const videoCategoryOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['videoCategory'],
			},
		},
		options: [
			{
				name: 'Get many',
				value: 'getAll',
				description: 'Retrieve many video categories',
				action: 'Get many video categories',
			},
		],
		default: 'getAll',
	},
];

export const videoCategoryFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 videoCategory:getAll                       */
	/* -------------------------------------------------------------------------- */
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Region code',
		name: 'regionCode',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		required: true,
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['videoCategory'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getCountriesCodes',
		},
		default: '',
	},
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['videoCategory'],
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
				resource: ['videoCategory'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 50,
		},
		default: 25,
		description: 'Max number of results to return',
	},
];
