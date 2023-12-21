import type { BaseProperties } from '../../Interfaces';

export const baseApiCallDescription: BaseProperties = [
	{
		displayName: 'HTTP Method',
		name: 'apiMethod',
		type: 'options',
		options: [
			{
				name: 'POST',
				value: 'POST',
			},
			{
				name: 'GET',
				value: 'GET',
			},
			{
				name: 'PUT',
				value: 'PUT',
			},
			{
				name: 'DELETE',
				value: 'DELETE',
			},
		],
		displayOptions: {
			show: {
				resource: ['base'],
				operation: ['apiCall'],
			},
		},
		required: true,
		default: '',
	},
	{
		displayName: 'Hint: The Authentication header is included automatically.',
		name: 'notice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				resource: ['base'],
				operation: ['apiCall'],
			},
		},
	},
	{
		displayName: 'URL',
		name: 'apiEndpoint',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['apiCall'],
			},
		},
		required: true,
		default: '',
		placeholder: '/dtable-server/...',
		description:
			'The URL has to start with /dtable-server/ or /dtable-db/. All possible requests can be found at the SeaTable API Reference at https://api.seatable.io \
        Please be aware that only request from the section Base Operations that use an Base-Token for the authentication are allowed to use.',
	},
	{
		displayName: 'Query String Parameters',
		name: 'apiParams',
		type: 'fixedCollection',
		default: '',
		typeOptions: {
			multipleValues: true,
		},
		description:
			'These params will be URL-encoded and appended to the URL when making the request.',
		options: [
			{
				name: 'apiParamsValues',
				displayName: 'Parameters',
				values: [
					{
						displayName: 'Key',
						name: 'key',
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
		displayOptions: {
			show: {
				resource: ['base'],
				operation: ['apiCall'],
			},
		},
	},
	{
		displayName: 'Body',
		name: 'apiBody',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['base'],
				operation: ['apiCall'],
			},
		},
		typeOptions: {
			rows: 4,
		},
		default: '',
		description:
			'Only valid JSON is accepted. n8n will pass anything you enter as raw input. For example, {"foo", "bar"} is perfectly valid. Of cause you can use variables from n8n inside your JSON.',
	},
	{
		displayName: 'Response object parameter name',
		name: 'responseObjectName',
		type: 'string',
		placeholder: 'Leave it empty or use a value like "rows", "metadata", "views" etc.',
		required: false,
		displayOptions: {
			show: {
				resource: ['base'],
				operation: ['apiCall'],
			},
		},
		default: '',
		description:
			'When using the SeaTable API, you can specify a parameter to retrieve either the entire array of objects or a specific object within it. This allows you to choose whether to fetch the complete output or only the object related to the provided parameter.',
	},
];
