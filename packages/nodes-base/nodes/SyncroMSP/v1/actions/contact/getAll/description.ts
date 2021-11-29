import {
	ContactProperties,
} from '../../Interfaces';

export const contactGetAllDescription: ContactProperties = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
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
				displayName: 'Page',
				name: 'page',
				type: 'number',
				default: 1,
				description: 'Returns provided page of results, each page contains 25 results',
			},
			{
				displayName: 'Search Query',
				name: 'query',
				type: 'string',
				default: '',
				placeholder: 'John Doe',
				description: 'Search query, it can be anything related to contact data like name etc.',
			},
		],
	},
];
