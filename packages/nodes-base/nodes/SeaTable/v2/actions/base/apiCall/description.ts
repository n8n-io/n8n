import type { BaseProperties } from '../../Interfaces';

export const baseApiCallDescription: BaseProperties = [
	{
		displayName: 'Table Name',
		name: 'tableName',
		type: 'options',
		placeholder: 'Select a table',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getTableNames',
		},
		displayOptions: {
			show: {
				resource: ['base'],
				operation: ['apiCall'],
			},
		},
		default: '',
		description:
			'The name of SeaTable table to access. Choose from the list, or specify a name using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
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
				name: 'POST',
				value: 'POST',
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
];
