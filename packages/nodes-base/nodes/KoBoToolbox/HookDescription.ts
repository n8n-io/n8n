import type { INodeProperties } from 'n8n-workflow';

export const hookOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['hook'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a single hook definition',
				action: 'Get a hook',
			},
			{
				name: 'Get many',
				value: 'getAll',
				description: 'List many hooks on a form',
				action: 'Get many hooks',
			},
			{
				name: 'Logs',
				value: 'getLogs',
				description: 'Get hook logs',
				action: 'Get logs for a hook',
			},
			{
				name: 'Retry all',
				value: 'retryAll',
				description: 'Retry all failed attempts for a given hook',
				action: 'Retry all hooks',
			},
			{
				name: 'Retry one',
				value: 'retryOne',
				description: 'Retry a specific hook',
				action: 'Retry one hook',
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
		displayName: 'Form name or ID',
		name: 'formId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'loadForms',
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['hook'],
				operation: ['get', 'retryOne', 'retryAll', 'getLogs', 'getAll'],
			},
		},
		description:
			'Form ID (e.g. aSAvYreNzVEkrWg5Gdcvg). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Hook ID',
		name: 'hookId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['hook'],
				operation: ['get', 'retryOne', 'retryAll', 'getLogs'],
			},
		},
		default: '',
		description: 'Hook ID (starts with h, e.g. hVehywQ2oXPYGHJHKtqth4)',
	},
	/* -------------------------------------------------------------------------- */
	/*                                hook:getAll                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Hook log ID',
		name: 'logId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['hook'],
				operation: ['retryOne'],
			},
		},
		default: '',
		description: 'Hook log ID (starts with hl, e.g. hlSbGKaUKzTVNoWEVMYbLHe)',
	},
	{
		displayName: 'Return all',
		name: 'returnAll',
		type: 'boolean',
		required: true,
		default: false,
		displayOptions: {
			show: {
				resource: ['hook'],
				operation: ['getAll'],
			},
		},
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			maxValue: 3000,
		},
		displayOptions: {
			show: {
				resource: ['hook'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		default: 1000,
		description: 'Max number of results to return',
	},
	/* -------------------------------------------------------------------------- */
	/*                                hook:getLogs                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Log status',
		name: 'status',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['hook'],
				operation: ['getLogs'],
			},
		},
		default: '',
		description: 'Only retrieve logs with a specific status',
		options: [
			{
				name: 'All',
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
	},
	{
		displayName: 'Start date',
		name: 'startDate',
		type: 'dateTime',
		displayOptions: {
			show: {
				resource: ['hook'],
				operation: ['getLogs'],
			},
		},
		default: '',
		description: 'Minimum date for the hook log to retrieve',
	},
	{
		displayName: 'End date',
		name: 'endDate',
		type: 'dateTime',
		displayOptions: {
			show: {
				resource: ['hook'],
				operation: ['getLogs'],
			},
		},
		default: '',
		description: 'Maximum date for the hook log to retrieve',
	},
];
