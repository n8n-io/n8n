import type { INodeProperties } from 'n8n-workflow';

export const reflogFields: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['reflog'],
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
				operation: ['reflog'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		displayOptions: {
			show: {
				operation: ['reflog'],
			},
		},
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Reference',
				name: 'reference',
				type: 'string',
				default: '',
				placeholder: 'HEAD',
				description:
					'The reference to show the reflog for (e.g., HEAD, branch name). Leave empty for HEAD.',
			},
		],
	},
];
