import {
	INodeProperties,
} from 'n8n-workflow';

export const validationOperations = [
	{
		displayName: 'Operation',
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
				name: 'Validation Controller Get Schema',
				value: 'validationControllerGetSchema',
			},
			{
				name: 'Validation Controller Validate Graph',
				value: 'validationControllerValidateGraph',
			},
			{
				name: 'Validation Controller Validate Instance',
				value: 'validationControllerValidateInstance',
			},
		],
		default: 'validationControllerGetSchema',
	},
] as INodeProperties[];

export const validationFields = [

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
					'validation',
				],
				operation: [
					'validationControllerGetSchema',
				],
			},
		},
	},
	{
		displayName: 'Body (JSON)',
		name: 'body',
		type: 'json',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'validation',
				],
				operation: [
					'validationControllerValidateGraph',
					'validationControllerValidateInstance',
				],
			},
		},
	},
] as INodeProperties[];
