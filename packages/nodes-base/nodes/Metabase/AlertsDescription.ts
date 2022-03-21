import {
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

export const alertsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'alerts',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all the alerts',
				routing: {
					request: {
						method: 'GET',
						url: '/api/alert/',
					},
				},
			},
			{
				name: 'Get Alert',
				value: 'getAlert',
				description: 'Get specific alert',
				routing: {
					request: {
						method: 'GET',
						url: '={{"/api/alert/" + $parameter.alertId}}',
					},
				},
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
];

export const alertsFields: INodeProperties[] = [
	{
		displayName: 'Alert Id',
		name: 'alertId',
		type: 'string',
		required: true,
		placeholder: '0',
		displayOptions: {
			show: {
				resource: [
					'alerts',
				],
								operation: [
										'getAlert',
								],
			},
		},
		default: '',
	},
];
