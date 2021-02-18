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
	//       collection: create
	// ----------------------------------
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		description: 'Title of the collection to be created.',
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		default: {},
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
		options: [
			{
				displayName: 'Cover',
				name: 'cover',
				type: 'string',
				default: '',
				description: 'URL of an image to be used as cover for the collection.',
			},
			{
				displayName: 'Public',
				name: 'public',
				type: 'boolean',
				default: false,
				description: 'Whether the collection will be accessible without authentication.',
			},
			{
				displayName: 'Parent ID',
				name: 'parent.$id', // TODO: `.` blocks rendering
				type: 'string',
				default: '',
				description: 'ID of this collection\'s parent collection, if it is a child collection.',
			},
			{
				displayName: 'Sort Order',
				name: 'sort',
				type: 'number',
				default: 1,
				description: 'Descending sort order of this collection. The number is the position of the collection<br>among all the collections with the same parent ID.',
			},
			{
				displayName: 'View',
				name: 'view',
				type: 'options',
				default: 'list',
				description: 'View style of this collection.',
				options: [
					{
						name: 'List',
						value: 'list',
					},
					{
						name: 'Simple',
						value: 'simple',
					},
					{
						name: 'Grid',
						value: 'grid',
					},
					{
						name: 'Masonry',
						value: 'Masonry',
					},
				],
			},
		],
	},

	// ----------------------------------
	//       collection: delete
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
		description: 'The ID of the collection to delete.',
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

	// ----------------------------------
	//       collection: update
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
		description: 'The ID of the collection to update.',
		displayOptions: {
			show: {
				resource: [
					'collection',
				],
				operation: [
					'update',
				],
			},
		},
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'collection',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Cover',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				placeholder: '',
				description: 'Name of the binary property containing the data<br>for the image to be uploaded as a cover.',
			},
			{
				displayName: 'Public',
				name: 'public',
				type: 'boolean',
				default: false,
				description: 'Whether the collection will be accessible without authentication.',
			},
			{
				displayName: 'Parent ID',
				name: 'parent$id', // TODO: `.` blocks rendering
				type: 'string',
				default: '',
				description: 'ID of this collection\'s parent collection, if it is a child collection.',
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
				description: 'Title of the collection to be created.',
			},
			{
				displayName: 'View',
				name: 'view',
				type: 'options',
				default: 'list',
				description: 'View style of this collection.',
				options: [
					{
						name: 'List',
						value: 'list',
					},
					{
						name: 'Simple',
						value: 'simple',
					},
					{
						name: 'Grid',
						value: 'grid',
					},
					{
						name: 'Masonry',
						value: 'Masonry',
					},
				],
			},
		],
	},
] as INodeProperties[];
