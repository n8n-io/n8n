import {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeProperties
} from 'n8n-workflow';

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
					}
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Returns information based on the binId you provide.',
				routing: {
					request: {
						method: 'GET',
						url: '=/developers/postbin/api/bin/{{$parameter["binId"]}}',
					},
				}
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Deletes this bin and all of it\'s posts.',
				routing: {
					request: {
						method: 'DELETE',
						url: '=/developers/postbin/api/bin/{{$parameter["binId"]}}'
					},
				}
			},
			{
				name: 'Test',
				value: 'test',
				description: 'Test your API by sending a request to the bin.',
				routing: {
					request: {
						method: 'POST',
						url: '=/developers/postbin/{{$parameter["binId"]}}'
					},
					output: {
						postReceive: [
							{
								type: 'set',
								properties: {
									value: '={{ { "status": "Sent" } }}',
								},
							}
						]
					}
				}
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
]

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
					'request'
				],
				operation: [
					'get',
					'delete',
					'test',
					'shift',
				]
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
	         ]
	     }
	 },
	 routing: {
		send: {
			property: 'content',
			type: 'body'
		}
	 }
	},
]
