import {
	INodeProperties,
} from 'n8n-workflow';

export const TagsDescription = [
			// ----------------------------------
			//         Operation: tag
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['tag'],
						api: ['rest']
					}
				},
				options: [
					{
						name: 'Add',
						value: 'add',
						description: 'Add a tag to an object.'
					},
					{
						name: 'List',
						value: 'list',
						description: 'Get data of all tags of an object.'
					},
					{
						name: 'Search',
						value: 'search',
						description: 'Search tags.'
					},
					{
						name: 'Remove',
						value: 'remove',
						description: 'Delete a tag from an object.'
					},
				],
				default: 'add',
				description: 'The operation to perform.'
			},
			// ----------------------------------
			//         Fields: tag
			// ----------------------------------
			{
				displayName: 'Tag Name',
				name: 'item',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['add', 'remove'],
						resource: ['tag'],
						api: ['rest'],
					}
				},
				description: 'The name of the tag.'
			},
			{
				displayName: 'Object',
				name: 'object',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['add', 'remove', 'list'],
						resource: ['tag'],
						api: ['rest'],
					}
				},
				description: 'The object the tag is added to.'
			},
			{
				displayName: 'Object ID',
				name: 'o_id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['add', 'remove', 'list'],
						resource: ['tag'],
						api: ['rest'],
					}
				},
				description: 'The id of the object.'
			},
			{
				displayName: 'Search Term',
				name: 'term',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['search'],
						resource: ['tag'],
						api: ['rest'],
					}
				},
				description: 'The search term to search the tags by.'
			},
] as INodeProperties[];
