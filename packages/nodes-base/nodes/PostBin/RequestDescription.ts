import { INodeProperties } from 'n8n-workflow';

import { buildBinTestURL, buildRequestURL } from './GenericFunctions';

// Operations for the `Request` resource
export const requestOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['request'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a request',
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
				action: 'Get a request',
			},
			{
				name: 'Remove First',
				value: 'removeFirst',
				description: 'Remove the first request from bin',
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
				action: 'Remove First a request',
			},
			{
				name: 'Send',
				value: 'send',
				description: 'Send a test request to the bin',
				routing: {
					request: {
						method: 'POST',
					},
					send: {
						preSend: [
							// Parse binId before sending to make sure it's in the right format
							buildBinTestURL,
						],
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "requestId": $response.body } }}',
								},
							},
						],
					},
				},
				action: 'Send a request',
			},
		],
		default: 'get',
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
				resource: ['request'],
				operation: ['get', 'removeFirst', 'send'],
			},
		},
		description: 'Unique identifier for each bin',
	},
	{
		name: 'binContent',
		displayName: 'Bin Content',
		type: 'string',
		default: '',
		typeOptions: {
			rows: 5,
		},
		displayOptions: {
			show: {
				resource: ['request'],
				operation: ['send'],
			},
		},
		// Content is sent in the body of POST requests
		routing: {
			send: {
				property: 'content',
				type: 'body',
			},
		},
	},
	{
		name: 'requestId',
		displayName: 'Request ID',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['request'],
				operation: ['get'],
			},
		},
		description: 'Unique identifier for each request',
	},
];
