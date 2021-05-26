import {
	INodeProperties,
} from 'n8n-workflow';

export const collectionOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'collection',
				],
			},
		},
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
		],
		default: 'create',
		description: 'Operation to perform',
	},
] as INodeProperties[];

export const collectionFields = [
	// ----------------------------------------
	//            collection: create
	// ----------------------------------------
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'collection',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'collection',
				],
				operation: [
					'create',
				],
			},
		},
	},
	{
		displayName: 'Slug',
		name: 'slug',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'collection',
				],
				operation: [
					'create',
				],
			},
		},
	},
	
	// ----------------------------------------
	//            collection: delete
	// ----------------------------------------
	{
		displayName: 'Collection ID',
		name: 'collectionId',
		description: 'ID of the collection to delete.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'collection',
				],
				operation: [
					'delete',
				],
			},
		},
	},
	
	// ----------------------------------------
	//             collection: get
	// ----------------------------------------
	{
		displayName: 'Collection ID',
		name: 'collectionId',
		description: 'ID of the collection to retrieve.',
		type: 'string',
		required: true,
		default: '',
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
] as INodeProperties[];
