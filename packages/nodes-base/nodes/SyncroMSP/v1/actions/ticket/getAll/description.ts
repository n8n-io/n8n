import {
	TicketProperties,
} from '../../Interfaces';

export const ticketGetAllDescription: TicketProperties = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'ticket',
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
		displayName: 'Limit',
		name: 'per_page',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		default: 25,
		description: 'limit the number of rows returned',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: [
					'ticket',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Search Query',
				name: 'query',
				type: 'string',
				default: '',
				placeholder: 'John Doe',
				description: 'Search query, it can be anything related to ticket data like user etc.',
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
