import {
	INodeProperties,
} from 'n8n-workflow';

export const hookOperations: INodeProperties[] = [
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
];

export const hookFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                hook:get                                    */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Form ID',
		name: 'formId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'loadForms',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'hook',
				],
				operation: [
					'get',
					'retryOne',
					'retryAll',
					'getLogs',
				],
			},
		},
		description: 'Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg)',
	},
	{
		displayName: 'Hook ID',
		name: 'hookId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'hook',
				],
				operation: [
					'get',
					'retryOne',
					'retryAll',
					'getLogs',
				],
			},
		},
		default: '',
		description: 'Hook ID (starts with h, e.g. hVehywQ2oXPYGHJHKtqth4)',
	},
	/* -------------------------------------------------------------------------- */
	/*                                hook:getAll                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Form ID',
		name: 'formId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'loadForms',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'hook',
				],
				operation: [
					'getAll',
				],
			},
		},
		description: 'Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg)',
	},
	{
		displayName: 'Hook Log ID',
		name: 'logId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'hook',
				],
				operation: [
					'retryOne',
				],
			},
		},
		default: '',
		description: 'Hook log ID (starts with hl, e.g. hlSbGKaUKzTVNoWEVMYbLHe)',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		required: true,
		default: false,
		displayOptions: {
			show: {
				resource: [
					'hook',
				],
				operation: [
					'getAll',
					'getLogs',
				],
			},
		},
		description: 'Whether to return all results',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		required: false,
		typeOptions: {
			maxValue: 3000,
		},
		displayOptions: {
			show: {
				resource: [
					'hook',
				],
				operation: [
					'getAll',
					'getLogs',
				],
				returnAll: [
					false,
				],
			},
		},
		default: 1000,
		description: 'The number of results to return',
	},
];
