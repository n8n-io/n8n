import {
	ContactProperties,
} from '../../Interfaces';

export const contactGetAllDescription: ContactProperties = [
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'contact',
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
				description: 'Search query, it can be anything related to contact data like name etc.',
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
