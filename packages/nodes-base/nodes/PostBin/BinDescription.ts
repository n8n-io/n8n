import { INodeProperties } from 'n8n-workflow';

import { buildBinAPIURL, transformBinReponse } from './GenericFunctions';

// Operations for the `Bin` resource:
export const binOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['bin'],
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
						postReceive: [transformBinReponse],
					},
				},
				action: 'Create a bin',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a bin',
				routing: {
					request: {
						method: 'GET',
					},
					output: {
						postReceive: [transformBinReponse],
					},
					send: {
						preSend: [
							// Parse binId before sending to make sure it's in the right format
							buildBinAPIURL,
						],
					},
				},
				action: 'Get a bin',
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
				action: 'Delete a bin',
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
				resource: ['bin'],
				operation: ['get', 'delete'],
			},
		},
		description: 'Unique identifier for each bin',
	},
];
