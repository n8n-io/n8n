import {
	INodeProperties,
} from 'n8n-workflow';

export const raindropOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'raindrop',
				],
			},
		},
	},
] as INodeProperties[];

export const raindropFields = [
	// ----------------------------------
	//       raindrop: create
	// ----------------------------------
	{
		displayName: 'Link',
		name: 'link',
		type: 'string',
		required: true,
		default: '',
		description: 'Link of the raindrop to be created.',
		displayOptions: {
			show: {
				resource: [
					'raindrop',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'raindrop',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			// TODO: Add more options
			{
				displayName: 'Created',
				name: 'create',
				type: 'dateTime',
				default: '',
				description: 'Date and time when the raindrop was created.',
			},
			{
				displayName: 'Sort Order',
				name: 'sort',
				type: 'number',
				default: 1,
				description: 'Descending sort order of this collection. The number is the position of the collection<br>among all the collections with the same parent ID.',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Title of the raindrop to be created.',
			},
		],
	},
] as INodeProperties[];
