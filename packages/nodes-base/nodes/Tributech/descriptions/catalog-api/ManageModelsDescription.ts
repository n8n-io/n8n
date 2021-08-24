import {
	INodeProperties,
} from 'n8n-workflow';

export const manageModelsOperations = [
	{
		displayName: 'Operation',
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
				value: 'addNewModels',
			},
			{
				name: 'Get All Entities',
				value: 'getAllEntities',
			},
			{
				name: 'Get Entity',
				value: 'getEntity',
			},
			{
				name: 'Revoke Model',
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
		description: '',
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
		description: '',
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
		description: '',
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
						type: 'json',
						required: true,
						default: '',
					},
				],
			},
		],
	},
] as INodeProperties[];
