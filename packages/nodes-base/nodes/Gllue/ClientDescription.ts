import {
	INodeProperties,
} from 'n8n-workflow';

export const clientOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'client',
				],
			},
		},
		options: [
			{
				name: 'Simple List with IDs',
				value: 'simple_list_with_ids',
				description: 'Get all items with Simple List',
			},
		],
		default: 'simple_list_with_ids',
		description: 'The operation to perform.',
	},
];

export const clientFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 client:getAll                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Page',
		name: 'page',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'client',
				],
				operation: [
					'simple_list_with_ids',
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 255,
		},
		default: 1,
		description: 'page index in pages',
	},
	{
		displayName: 'Rows per Page',
		name: 'paginateBy',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'client',
				],
				operation: [
					'simple_list_with_ids',
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 25,
		},
		default: 10,
		description: 'How many results to return in one page',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'client',
				],
				operation: [
					'simple_list_with_ids',
				],
			},
		},
		options: [
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: 'type__s=prospect,client&keyword__eq=sony',
				description: 'The query field accepts with gql syntax，type__s=prospect,client&id=1089924&keyword__eq=sony',
			},
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: 'id,name',
				description: 'The fields need to return',
			},
		],
	},
];
