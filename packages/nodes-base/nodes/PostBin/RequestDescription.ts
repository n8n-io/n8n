import {
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
					'request'
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Returns information based on the binId and reqId you provide.',
			},
			{
				name: 'Shift',
				value: 'shift',
				description: 'Removes the first request form the bin.'
			}
		],
		default: 'get',
		description: 'The operation to perform'
	}
]

export const requestFields: INodeProperties[] = [
	{
		displayName: 'Request ID',
		name: 'requestId',
		type: 'string',
		default: '',
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
