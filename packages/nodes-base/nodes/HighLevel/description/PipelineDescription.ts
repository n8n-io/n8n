import {
	INodeProperties
} from 'n8n-workflow';

export const pipelineOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'pipeline',
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				routing: {
					request: {
						method: 'GET',
						url: '/pipelines',
					},
					// HighLevel API V1.1.20 does not support /pipelines pagination
					// send: {
					// 	paginate: true,
					// },
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'pipelines',
								},
							},
						],
					},
				}
			},
		],
		default: 'create',
	},
];


const getAllOperations: Array<INodeProperties> = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'pipeline',
				],
				operation: [
					'getAll',
				],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: [
					'pipeline',
				],
				operation: [
					'getAll',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 20,
		routing: {
			send: {
				type: 'query',
				property: 'limit',
			},
			output: {
				maxResults: '={{$value}}', // Set maxResults to the value of current parameter
			},
		},
		description: 'Max number of results to return',
	},
];

export const pipelineFields: INodeProperties[] = [
	...getAllOperations,
];
