import { INodeProperties } from 'n8n-workflow';

export const alertsOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['alerts'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get specific alert',
				routing: {
					request: {
						method: 'GET',
						url: '={{"/api/alert/" + $parameter.alertId}}',
					},
				},
				action: 'Get an alert',
			},
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
				action: 'Get all alerts',
			},
		],
		default: 'getAll',
	},
];

export const alertsFields: INodeProperties[] = [
	{
		displayName: 'Alert ID',
		name: 'alertId',
		type: 'string',
		required: true,
		placeholder: '0',
		displayOptions: {
			show: {
				resource: ['alerts'],
				operation: ['get'],
			},
		},
		default: '',
	},
];
