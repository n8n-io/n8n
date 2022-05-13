import {
	INodeProperties
} from 'n8n-workflow';

import {
	buildRequestURL
} from './GenericFunctions';

// Operations for the `Request` resource
export const requestOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'request',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Returns information based on the binId and reqId you provide.',
				routing: {
					request: {
						method: 'GET',
						url: '=/developers/postbin/api/bin/{{$parameter["binId"]}}/req/{{$parameter["requestId"]}}',
					},
					send: {
						preSend: [
							// Parse binId before sending to make sure it's in the right format
							buildRequestURL,
						],
					},
				},
			},
			{
				name: 'Shift',
				value: 'shift',
				description: 'Removes the first request form the bin.',
				routing: {
					request: {
						method: 'GET',
						url: '=/developers/postbin/api/bin/{{$parameter["binId"]}}/req/shift',
					},
					send: {
						preSend: [
							// Parse binId before sending to make sure it's in the right format
							buildRequestURL,
						],
					},
				},
			},
		],
		default: 'get',
		description: 'The operation to perform',
	},
];

// Properties of the `Request` resource
export const requestFields: INodeProperties[] = [
	{
		name: 'binId',
		displayName: 'Bin ID',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'request',
				],
				operation: [
					'get',
					'shift',
				],
			},
		},
		description: 'Unique identifier for each bin.',
	},
	{
		name: 'requestId',
		displayName: 'Request ID',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'request',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'Unique identifier for each request.',
	},
];
