import {
	INodeProperties,
} from 'n8n-workflow';

export const metricsOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'metrics',
				],
			},
		},
		options: [
			{
				name: 'Get Daily Metrics',
				value: 'getDailyMetrics',
				description: 'Retrieve financial metrics broken down by day for either the current month or the last',
			},
			{
				name: 'Get Monthly Metrics',
				value: 'getMonthlyMetrics',
				description: 'Retrieve all monthly financial metrics for your company',
			},
		],
		default: 'getDailyMetrics',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const metricsFields = [

	/* -------------------------------------------------------------------------- */
	/*                                metrics:getDailyMetrics                     */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Month',
		name: 'month',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'metrics',
				],
				operation: [
					'getDailyMetrics',
				],
			},
		},
		description: 'Can only be the current or previous month. Format should be YYYY-MM',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				resource: [
					'metrics',
				],
				operation: [
					'getDailyMetrics',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Plan ID',
				name: 'plan_id',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getPlanIds',
				},
				default: '',
				description: 'Only return the Metrics for this Plan ID',
			},
			{
				displayName: 'Metrics',
				name: 'metrics',
				type: 'string',
				default: '',
				description: 'Comma-separated list of metrics trends to return (the default is to return all metrics)',
			},
		]
	},


	/* -------------------------------------------------------------------------- */
	/*                                metrics:getMonthlyMetrics                   */
	/* -------------------------------------------------------------------------- */

	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				resource: [
					'metrics',
				],
				operation: [
					'getMonthlyMetrics',
				],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Plan ID',
				name: 'plan_id',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getPlanIds',
				},
				default: '',
				description: 'Only return the Metrics for this Plan ID',
			},
			{
				displayName: 'Metrics',
				name: 'metrics',
				type: 'string',
				default: '',
				description: 'Comma-separated list of metrics trends to return (the default is to return all metrics)',
			},
		]
	},
] as INodeProperties[];
