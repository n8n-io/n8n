import {
	INodeProperties,
} from 'n8n-workflow';

export const siteOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'site',
				],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a site',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a site',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Returns all sites',
			},
		],
		default: 'delete',
		description: 'The operation to perform.',
	},
];

export const siteFields: INodeProperties[] = [
	{
		displayName: 'Site ID',
		name: 'siteId',
		required: true,
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'site',
				],
				operation: [
					'get',
					'delete',
				],
			},
		},
	},
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
					'site',
				],
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
				operation: [
					'getAll',
				],
				resource: [
					'site',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 200,
		},
		default: 50,
		description: 'How many results to return',
	},
];
