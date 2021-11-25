import {
	RmmProperties,
} from '../../Interfaces';

export const rmmGetAllDescription: RmmProperties = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'rmm',
				],
				operation: [
					'getAlerts',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'rmm',
				],
				operation: [
					'getAlerts',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Status',
				name: 'status',
				type: 'string',
				default: '',
				placeholder: 'all',
				description: 'Possible values resolved, all, active.',
			},
			{
				displayName: 'Limit',
				name: 'per_page',
				type: 'number',
				default: 25,
				description: 'limit the number of rows returned',
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				default: 1,
				description: 'Returns provided page of results, each page contains 25 results',
			},
		],
	},
];
