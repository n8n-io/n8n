import {
	INodeProperties,
 } from 'n8n-workflow';

export const codeOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'code',
				],
			},
		},
		options: [
			{
				name: 'Javascript',
				value: 'javascript',
				description: 'Run Javascript via API',
			},
			{
				name: 'Python',
				value: 'python',
				description: 'Run Python via API',
			},
		],
		default: 'javascript',
	},
] as INodeProperties[];

export const codeFields = [
	// code: javascript
	{
		displayName: 'Code',
		name: 'code',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'javascript',
				],
				resource: [
					'code',
				],
			},
		},
		default: '',
		description: 'Your javascript code',
	},
	// code: javascript
	{
		displayName: 'Code',
		name: 'code',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'python',
				],
				resource: [
					'code',
				],
			},
		},
		default: '',
		description: 'Your python code',
	},
] as INodeProperties[];
