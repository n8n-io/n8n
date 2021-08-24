import {
	INodeProperties,
} from 'n8n-workflow';

export const manageModelsOperations = [
	{
		displayName: 'Operation',
		description: 'The operation that should be executed',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'manageModels',
				],
			},
		},
		options: [
			{
				name: 'Add New Model(s)',
				description: 'Add New Model(s)',
				value: 'addNewModels',
			},
			{
				name: 'Get All Entities',
				description: 'Get All Entities',
				value: 'getAllEntities',
			},
			{
				name: 'Get Entity',
				description: 'Get Entity',
				value: 'getEntity',
			},
			{
				name: 'Revoke Model',
				description: 'Revoke Model',
				value: 'revokeModel',
			},
		],
		default: 'addNewModels',
	},
] as INodeProperties[];

export const manageModelsFields = [
	{
		displayName: 'Size',
		name: 'size',
		description: 'Page Size',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'manageModels',
				],
				operation: [
					'getAllEntities',
				],
			},
		},
	},
	{
		displayName: 'Page',
		name: 'page',
		description: 'Page number',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'manageModels',
				],
				operation: [
					'getAllEntities',
				],
			},
		},
	},
	{
		displayName: 'DTMI',
		name: 'dtmi',
		description: 'The DTMI of the model',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'manageModels',
				],
				operation: [
					'getEntity',
					'revokeModel',
				],
			},
		},
	},
	{
		displayName: 'Standard',
		name: 'models',
		description: 'Collection of models',
		type: 'fixedCollection',
		placeholder: 'Add Model',
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'manageModels',
				],
				operation: [
					'addNewModels',
				],
			},
		},
		options: [
			{
				displayName: 'Value',
				name: 'model',
				values: [
					{
						displayName: 'Body (JSON)',
						name: 'models',
						description: 'JSON object representing request body.',
						type: 'json',
						required: true,
						default: '',
					},
				],
			},
		],
	},
] as INodeProperties[];
