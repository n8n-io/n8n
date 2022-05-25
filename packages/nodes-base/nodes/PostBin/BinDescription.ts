import {
	IExecuteSingleFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeProperties
} from 'n8n-workflow';

import {
	buildBinAPIURL,
} from './GenericFunctions';


// Operations for the `Bin` resource:
export const binOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
				show: {
						resource: [
							'bin',
						],
				},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create bin',
				routing: {
					request: {
						method: 'POST',
						url: '/developers/postbin/api/bin',
					},
					output: {
						postReceive: [
							async function (this: IExecuteSingleFunctions, items: INodeExecutionData[], response: IN8nHttpFullResponse,): Promise<INodeExecutionData[]> {
								items.forEach(item => item.json = {
									'binId': item.json.binId,
									'now_timestamp': item.json.now,
									'now_iso': new Date(item.json.now as string).toISOString(),
									'expires_timestamp': item.json.expires,
									'expires_iso': new Date(item.json.expires as string).toISOString(),
								});
								return items;
							},
						],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a bin',
				routing: {
					request: {
						method: 'GET',
					},
					send: {
						preSend: [
							// Parse binId before sending to make sure it's in the right format
							buildBinAPIURL,
						],
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a bin',
				routing: {
					request: {
						method: 'DELETE',
					},
					send: {
						preSend: [
							// Parse binId before sending to make sure it's in the right format
							buildBinAPIURL,
						],
					},
				},
			},
		],
		default: 'create',
	},
];

// Properties of the `Bin` resource
export const binFields: INodeProperties[] = [
	{
		name: 'binId',
		displayName: 'Bin ID',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'bin',
				],
				operation: [
					'get',
					'delete',
				],
			},
		},
		description: 'Unique identifier for each bin',
	},
];
