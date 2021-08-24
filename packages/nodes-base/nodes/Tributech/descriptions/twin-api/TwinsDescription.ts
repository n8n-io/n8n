import {
	INodeProperties,
} from 'n8n-workflow';

export const twinsOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		description: 'The operation that should be executed',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'twins',
				],
			},
		},
		options: [
			{
				name: 'Add Twin',
				value: 'postTwin',
				description: 'Add a new twin',
			},
			{
				name: 'Delete Twin by Id',
				value: 'deleteTwinById',
				description: 'Delete a twin',
			},
			{
				name: 'Get All Twins',
				value: 'getAllTwins',
				description: 'Get all stored twins',
			},
			{
				name: 'Get Twin By Id',
				value: 'getTwinById',
				description: 'Get a twin by id',
			},
			{
				name: 'Get Twins By Model Id',
				value: 'getTwinsByModelId',
				description: 'Get all stored twins of model',
			},
			{
				name: 'Update Twin by Id',
				value: 'updateTwinById',
				description: 'Update a twin',
			},
		],
		default: 'getAllTwins',
	},
] as INodeProperties[];

export const twinsFields = [
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'twins',
				],
				operation: [
					'getAllTwins',
					'getTwinsByModelId',
				],
			},
		},
		options: [
			{
				displayName: 'pageNumber',
				name: 'pageNumber',
				description: 'The page number. Default:1',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'pageSize',
				name: 'pageSize',
				description: 'The page size. Default:100',
				type: 'number',
				default: 0,
			},
		],
	},
	{
		displayName: 'DTID',
		// nodelinter-ignore-next-line
		name: 'dtid',
		description: 'The digital twin identifier.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'twins',
				],
				operation: [
					'getTwinById',
					'updateTwinById',
					'deleteTwinById',
				],
			},
		},
	},
	{
		displayName: 'DTMI',
		name: 'dtmi',
		description: 'The digital twin model identifier.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'twins',
				],
				operation: [
					'getTwinsByModelId',
				],
			},
		},
	},
	{
		displayName: 'Twin (JSON)',
		name: 'twin',
		description: 'Twin passed as JSON-Object',
		type: 'json',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'twins',
				],
				operation: [
					'postTwin',
					'updateTwinById',
				],
			},
		},
	},

] as INodeProperties[];
