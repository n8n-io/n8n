import type { INodeProperties } from 'n8n-workflow';

export const customApiCallFields: INodeProperties[] = [
	{
		displayName: 'Method',
		name: 'method',
		type: 'options',
		options: [
			{ name: 'DELETE', value: 'DELETE' },
			{ name: 'GET', value: 'GET' },
			{ name: 'POST', value: 'POST' },
		],
		default: 'GET',
		description: 'The HTTP method to use',
		displayOptions: { show: { resource: ['customApiCall'] } },
	},
	{
		displayName: 'Endpoint',
		name: 'endpoint',
		type: 'string',
		required: true,
		default: '',
		placeholder: '/v2/bot/profile/{userId}',
		description:
			'The LINE API endpoint path (e.g. <code>/v2/bot/profile/{userId}</code>). The base URL <code>https://api.line.me</code> is added automatically.',
		displayOptions: { show: { resource: ['customApiCall'] } },
	},
	{
		displayName: 'Query Parameters',
		name: 'queryParameters',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		default: {},
		description: 'Query string parameters to append to the request URL',
		displayOptions: { show: { resource: ['customApiCall'] } },
		options: [
			{
				name: 'parameter',
				displayName: 'Parameter',
				values: [
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Request Body',
		name: 'body',
		type: 'json',
		default: '{}',
		description: 'The JSON body to send with the request',
		typeOptions: { rows: 6 },
		displayOptions: { show: { resource: ['customApiCall'], method: ['POST'] } },
	},
];
