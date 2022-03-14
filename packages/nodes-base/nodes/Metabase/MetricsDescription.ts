import {
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

export const metricsOperations: INodeProperties[] = [
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
				name: 'Get All',
				value: 'getAll',
				description: 'Get all the metrics',
				routing: {
					request: {
						method: 'GET',
						url: '/api/metric/',
					},
				},
			},
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
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
];

export const metricsFields: INodeProperties[] = [
	{
		displayName: 'Metric Id',
		name: 'metricId',
		type: 'string',
		required: true,
		placeholder: '0',
		displayOptions: {
			show: {
				resource: [
					'metrics',
				],
								operation: [
										'get',
								],
			},
		},
		default: '',
	},
];
