import {
	INodeProperties,
} from 'n8n-workflow';

export const operations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'form',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a form definition',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Retrieve all forms',
			},
		],
		default: 'get',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'submission',
				],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a single submission',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a single submission',
			},
			{
				name: 'Get Validation Status',
				value: 'getValidation',
				description: 'Get the validation status for the submission',
			},
			{
				name: 'Query',
				value: 'query',
				description: 'Query matching submissions',
			},
			{
				name: 'Update Validation Status',
				value: 'setValidation',
				description: 'Set the validation status of the submission',
			},
		],
		default: 'query',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'hook',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a single hook definition',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'List all hooks on a form',
			},
			{
				name: 'Logs',
				value: 'getLogs',
				description: 'Get hook logs',
			},
			{
				name: 'Retry All',
				value: 'retryAll',
				description: 'Retry all failed attempts for a given hook',
			},
			{
				name: 'Retry One',
				value: 'retryOne',
				description: 'Retry a specific hook',
			},
		],
		default: 'getAll',
	},
] as INodeProperties[];
