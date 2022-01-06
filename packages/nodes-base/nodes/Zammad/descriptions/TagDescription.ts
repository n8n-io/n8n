import {
	INodeProperties,
} from 'n8n-workflow';

export const tagDescription: INodeProperties[] = [
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
				description: 'Retrieve all tags on an object',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove a tag from an object',
			},
			{
				name: 'Search',
				value: 'search', // TODO combine with get
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
			},
		},
	},
	{
		displayName: 'Object ID',
		name: 'o_id',
		type: 'string',
		default: '',
		required: true,
		description: 'Object to add the tag to',
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
			},
		},
	},
];
