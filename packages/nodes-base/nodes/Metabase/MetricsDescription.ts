import type { INodeProperties } from 'n8n-workflow';

export const metricsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['metrics'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a specific metric',
				routing: {
					request: {
						method: 'GET',
						url: '={{"/api/metric/" + $parameter.metricId}}',
						returnFullResponse: true,
					},
				},
				action: 'Get a metric',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many metrics',
				routing: {
					request: {
						method: 'GET',
						url: '/api/metric/',
					},
				},
				action: 'Get many metrics',
			},
		],
		default: 'getAll',
	},
];

export const metricsFields: INodeProperties[] = [
	{
		displayName: 'Metric ID',
		name: 'metricId',
		type: 'string',
		required: true,
		placeholder: '0',
		displayOptions: {
			show: {
				resource: ['metrics'],
				operation: ['get'],
			},
		},
		default: '',
	},
];
