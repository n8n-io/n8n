import {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeProperties
} from 'n8n-workflow';

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
						url: '=/developers/postbin/api/bin/{{$parameter["binId"]}}/req/{{$parameter["requestId"]}}'
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
						url: '=/developers/postbin/api/bin/{{$parameter["binId"]}}/req/shift'
					},
				}
			}
		],
		default: 'get',
		description: 'The operation to perform'
	}
]

export const requestFields: INodeProperties[] = [
	{
		name: 'requestId',
		displayName: 'Request ID',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'request'
				],
				operation: [
					'get',
				]
			}
		},
		description: 'Unique identifier for each request.',
	}
]
