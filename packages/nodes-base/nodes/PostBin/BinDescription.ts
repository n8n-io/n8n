import {
	INodeProperties
} from 'n8n-workflow';

import {
	buildBinAPIURL,
	buildBinTestURL
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
				description: 'Create new bin',
				routing: {
					request: {
						method: 'POST',
						url: '/developers/postbin/api/bin',
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Returns information based on the binId you provide.',
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
				description: 'Deletes this bin and all of it\'s posts.',
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
			{
				name: 'Test',
				value: 'test',
				description: 'Test your API by sending a request to the bin.',
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
		default: 'create',
		description: 'The operation to perform.',
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
					'test',
				],
			},
		},
		description: 'Unique identifier for each bin.',
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
				'bin',
			],
			operation: [
				'test',
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
];
