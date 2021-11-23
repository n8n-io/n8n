import {
	CustomerProperties,
} from '../../Interfaces';

export const customerGetAllDescription: CustomerProperties = [
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'customer',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				description: 'Search query',
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				default: 25,
				description: 'Returns provided page of results, each page contains 25 results',
			},
		],
	},
];
