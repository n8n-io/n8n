import {
	RmmProperties,
} from '../../Interfaces';

export const rmmGetAllDescription: RmmProperties = [
	{
		displayName: 'Limit',
		name: 'perPage',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'rmm',
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
		description: 'Limit the number of rows returned',
	},
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
					'getAll',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit',
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'rmm',
				],
				operation: [
					'getAll',
				],
			},
		},
		options : [
			{
				name: 'Active',
				value: 'active',
			},
			{
				name: 'All',
				value: 'all',
			},
			{
				name: 'Resolved',
				value: 'resolved',
			},
		],
		default: 'active',
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

		],
	},
];
