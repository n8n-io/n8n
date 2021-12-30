import {
	INodeProperties,
} from 'n8n-workflow';

export const tagsDescription: INodeProperties[] = [
	// ----------------------------------
	//           operations
	// ----------------------------------
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'tag',
				],
				api: [
					'rest',
				],
			},
		},
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add a tag to an object',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get data of all tags of an object',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove a tag from an object',
			},
			{
				name: 'Search',
				value: 'search', // TODO combine with get
				description: 'Search tags',
			},
		],
		default: 'add',
	},

	// ----------------------------------
	//             fields
	// ----------------------------------
	{
		displayName: 'Tag Name',
		name: 'item',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'add',
					'remove',
				],
				resource: [
					'tag',
				],
				api: [
					'rest',
				],
			},
		},
		description: 'The name of the tag',
	},
	{
		displayName: 'Object',
		name: 'object',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'add',
					'remove',
					'getAll',
				],
				resource: [
					'tag',
				],
				api: [
					'rest',
				],
			},
		},
		description: 'The object the tag is added to',
	},
	{
		displayName: 'Object ID',
		name: 'o_id',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'add',
					'remove',
					'getAll',
				],
				resource: [
					'tag',
				],
				api: [
					'rest',
				],
			},
		},
	},
	{
		displayName: 'Search Term',
		name: 'term',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'search',
				],
				resource: [
					'tag',
				],
				api: [
					'rest',
				],
			},
		},
		description: 'The search term to search the tags by',
	},
];
