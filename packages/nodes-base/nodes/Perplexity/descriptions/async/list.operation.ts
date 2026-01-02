import type { INodeProperties } from 'n8n-workflow';

export const properties: INodeProperties[] = [
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: ['asyncList'],
			},
		},
		default: 20,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		routing: {
			request: {
				qs: {
					limit: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Next Token',
		name: 'nextToken',
		type: 'string',
		typeOptions: {
			password: true,
		},
		displayOptions: {
			show: {
				operation: ['asyncList'],
			},
		},
		default: '',
		description: 'Token for fetching the next page of results',
		routing: {
			request: {
				qs: {
					next_token: '={{ $value }}',
				},
			},
		},
	},
	{
		displayName: 'Simplify Output',
		name: 'simplify',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['asyncList'],
			},
		},
		default: false,
		description: 'Whether to return only essential fields',
		routing: {
			output: {
				postReceive: [
					{
						type: 'set',
						enabled: '={{ $value }}',
						properties: {
							value:
								'={{ { requests: $response.body?.requests, next_token: $response.body?.next_token } }}',
						},
					},
				],
			},
		},
	},
];
