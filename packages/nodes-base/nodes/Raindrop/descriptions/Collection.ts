import {
	INodeProperties,
} from 'n8n-workflow';

export const collectionOperations = [
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
					'collection',
				],
			},
		},
	},
] as INodeProperties[];

export const collectionFields = [
	// ----------------------------------
	//       collection: get
	// ----------------------------------
	{
		displayName: 'Collection ID',
		name: 'collectionId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getCollections',
		},
		default: [],
		required: true,
		description: 'The ID of the collection to retrieve.',
		displayOptions: {
			show: {
				resource: [
					'collection',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------
	//       collection: getAll
	// ----------------------------------
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
		default: 'parent',
		displayOptions: {
			show: {
				resource: [
					'collection',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				name: 'Parent',
				value: 'parent',
				description: 'Root-level collections.',
			},
			{
				name: 'Children',
				value: 'children',
				description: 'Nested collections.',
			},
		],
	},

] as INodeProperties[];
