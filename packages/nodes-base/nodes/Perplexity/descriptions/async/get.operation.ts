import type { INodeProperties } from 'n8n-workflow';

export const properties: INodeProperties[] = [
	{
		displayName: 'Request ID',
		name: 'requestId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				operation: ['asyncGet'],
			},
		},
		description: 'The ID of the asynchronous chat completion request',
		placeholder: 'e.g. abc-123-def-456',
	},
	{
		displayName: 'Simplify Output',
		name: 'simplify',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['asyncGet'],
			},
		},
		default: false,
		description: 'Whether to return only essential fields',
		routing: {
			output: {
				postReceive: [
					{
						type: 'set',
						enabled: '={{ $value }}',
						properties: {
							value:
								'={{ $response.body?.status === "COMPLETED" ? { id: $response.body?.id, status: $response.body?.status, model: $response.body?.model, response: $response.body?.response } : { id: $response.body?.id, status: $response.body?.status, model: $response.body?.model, created_at: $response.body?.created_at, started_at: $response.body?.started_at, completed_at: $response.body?.completed_at, failed_at: $response.body?.failed_at, error_message: $response.body?.error_message } }}',
						},
					},
				],
			},
		},
	},
];
