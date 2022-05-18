import {
	INodeProperties
} from 'n8n-workflow';

import {
	buildBinTestURL,
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
				description: 'Return data based on request ID and bin ID',
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
				name: 'Remove First',
				value: 'removeFirst',
				description: 'Remove the first request from the bin',
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
			{
				name: 'Send',
				value: 'send',
				description: 'Test your API by sending the bin a request',
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
									value: '={{ { "status": "Sent" } }}',
								},
							},
						],
					},
				},
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
				resource: [
					'request',
				],
				operation: [
					'get',
					'removeFirst',
					'send',
				],
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
			 resource: [
				 'request',
			 ],
			 operation: [
				 'send',
			 ],
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
				resource: [
					'request',
				],
				operation: [
					'get',
				],
			},
		},
		description: 'Unique identifier for each request',
	},
];
