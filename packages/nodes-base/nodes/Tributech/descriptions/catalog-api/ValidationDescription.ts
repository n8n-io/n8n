import {
	INodeProperties,
} from 'n8n-workflow';

export const validationOperations = [
	{
		displayName: 'Operation',
		description: 'The operation that should be executed',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'validation',
				],
			},
		},
		options: [
			{
				name: 'Get Schema',
				description: 'Get Schema',
				value: 'getSchema',
			},
			{
				name: 'Validate Graph',
				description: 'Validate Graph',
				value: 'validateGraph',
			},
			{
				name: 'Validate Instance',
				description: 'Validate Instance',
				value: 'validateInstance',
			},
		],
		default: 'getSchema',
	},
] as INodeProperties[];

export const validationFields = [

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
					'validation',
				],
				operation: [
					'getSchema',
				],
			},
		},
	},
	{
		displayName: 'Body (JSON)',
		name: 'body',
		description: 'The payload of the request.',
		type: 'json',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'validation',
				],
				operation: [
					'validateGraph',
					'validateInstance',
				],
			},
		},
	},
] as INodeProperties[];
