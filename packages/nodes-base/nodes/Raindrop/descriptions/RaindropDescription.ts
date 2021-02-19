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
		displayName: 'Collection ID',
		name: 'collectionId',
		type: 'options',
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
		typeOptions: {
			loadOptionsMethod: 'getCollections',
		},
		default: '',
	},
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
		placeholder: 'Add Field',
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
			{
				displayName: 'Important',
				name: 'important',
				type: 'boolean',
				default: false,
				description: 'Whether this raindrop is marked as favorite.',
			},
			{
				displayName: 'Order',
				name: 'order',
				type: 'number',
				default: 0,
				description: 'Sort order for the raindrop. For example, to move it to first place, enter 0.',
			},
			{
				displayName: 'Tag IDs',
				name: 'tags',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsDependsOn: [
						'collectionId',
					],
					loadOptionsMethod: 'getTags',
				},
				default: [],
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Title of the raindrop to create.',
			},
		],
	},

	// ----------------------------------
	//       raindrop: delete
	// ----------------------------------
	{
		displayName: 'Raindrop ID',
		name: 'raindropId',
		type: 'string',
		default: '',
		required: true,
		description: 'The ID of the raindrop to delete.',
		displayOptions: {
			show: {
				resource: [
					'raindrop',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	// ----------------------------------
	//       raindrop: get
	// ----------------------------------
	{
		displayName: 'Raindrop ID',
		name: 'raindropId',
		type: 'string',
		default: '',
		required: true,
		description: 'The ID of the raindrop to retrieve.',
		displayOptions: {
			show: {
				resource: [
					'raindrop',
				],
				operation: [
					'get',
				],
			},
		},
	},

	// ----------------------------------
	//       raindrop: getAll
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
		description: 'The ID of the collection from which to retrieve all raindrops.',
		displayOptions: {
			show: {
				resource: [
					'raindrop',
				],
				operation: [
					'getAll',
				],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'raindrop',
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
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'raindrop',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 10,
		},
		default: 5,
		description: 'How many results to return.',
	},

	// ----------------------------------
	//       raindrop: update
	// ----------------------------------
	{
		displayName: 'Raindrop ID',
		name: 'raindropId',
		type: 'string',
		default: '',
		required: true,
		description: 'The ID of the raindrop to update.',
		displayOptions: {
			show: {
				resource: [
					'raindrop',
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
					'raindrop',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'Collection ID',
				name: 'collectionId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getCollections',
				},
				default: '',
			},
			{
				displayName: 'Important',
				name: 'important',
				type: 'boolean',
				default: false,
				description: 'Whether this raindrop is marked as favorite.',
			},
			{
				displayName: 'Order',
				name: 'order',
				type: 'number',
				default: 0,
				description: 'For example if you want to move raindrop to the first place set this field to 0',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				description: 'Raindrop tags. Multiple can be set separated by comma.',
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
