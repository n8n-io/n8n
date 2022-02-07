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
		displayName: 'Hook ID',
		name: 'id',
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
		name: 'assetUid',
		type: 'string',
		required: true,
		default: '',
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
		displayName: 'Status',
		name: 'status',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'hook',
				],
				operation: [
					'getLogs',
				],
			},
		},
		default: '',
		options: [
			{
				name: 'Any',
				value: '',
			},
			{
				name: 'Failed',
				value: '0',
			},
			{
				name: 'Pending',
				value: '1',
			},
			{
				name: 'Success',
				value: '2',
			},
		],
		description: 'Hook status to filter for (0=failed, 1=pending, 2=success)',
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
				],
			},
		},
		description: 'If checked, all results will be returned instead of just the first page - WARNING, this can cause a lot of data to be returned!',
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
				],
				returnAll: [
					false,
				],
			},
		},
		default: 1000,
		description: 'Max records to return (up to 30000)',
	},
];
