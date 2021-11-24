import {
	RmmProperties,
} from '../../Interfaces';

export const rmmGetAllDescription: RmmProperties = [
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
				description: 'Possible values resolved, all, active.',
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
