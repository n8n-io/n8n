import {
	INodeProperties,
} from 'n8n-workflow';

export const twinsOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
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
				name: 'Get All Twins',
				value: 'getAllTwins',
			},
			{
				name: 'Get Twins By Model Id',
				value: 'getTwinsByModelId',
			},
			{
				name: 'Get Twin By Id',
				value: 'getTwinById',
			},
			{
				name: 'Add Twin',
				value: 'postTwin',
			},
			{
				name: 'Update Twin by Id',
				value: 'updateTwinById',
			},
			{
				name: 'Delete Twin by Id',
				value: 'deleteTwinById',
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
