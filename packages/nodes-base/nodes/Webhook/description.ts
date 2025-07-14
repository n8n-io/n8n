import type { INodeProperties, INodeTypeDescription, IWebhookDescription } from 'n8n-workflow';

import { getResponseCode, getResponseData } from './utils';

export const defaultWebhookDescription: IWebhookDescription = {
	name: 'default',
	httpMethod: '={{$parameter["httpMethod"] || "GET"}}',
	isFullPath: true,
	responseCode: `={{(${getResponseCode})($parameter)}}`,
	responseMode: '={{$parameter["responseMode"]}}',
	responseData: `={{(${getResponseData})($parameter)}}`,
	responseBinaryPropertyName: '={{$parameter["responseBinaryPropertyName"]}}',
	responseContentType: '={{$parameter["options"]["responseContentType"]}}',
	responsePropertyName: '={{$parameter["options"]["responsePropertyName"]}}',
	responseHeaders: '={{$parameter["options"]["responseHeaders"]}}',
	path: '={{$parameter["path"]}}',
};

export const credentialsProperty = (
	propertyName = 'authentication',
): INodeTypeDescription['credentials'] => [
	{
		name: 'httpBasicAuth',
		required: true,
		displayOptions: {
			show: {
				[propertyName]: ['basicAuth'],
			},
		},
	},
	{
		name: 'httpHeaderAuth',
		required: true,
		displayOptions: {
			show: {
				[propertyName]: ['headerAuth'],
			},
		},
	},
	{
		name: 'jwtAuth',
		required: true,
		displayOptions: {
			show: {
				[propertyName]: ['jwtAuth'],
			},
		},
	},
];

export const authenticationProperty = (propertyName = 'authentication'): INodeProperties => ({
	displayName: 'Authentication',
	name: propertyName,
	type: 'options',
	options: [
		{
			name: 'Basic Auth',
			value: 'basicAuth',
		},
		{
			name: 'Header Auth',
			value: 'headerAuth',
		},
		{
			name: 'JWT Auth',
			value: 'jwtAuth',
		},
		{
			name: 'None',
			value: 'none',
		},
	],
	default: 'none',
	description: 'The way to authenticate',
});

export const httpMethodsProperty: INodeProperties = {
	displayName: 'HTTP Method',
	name: 'httpMethod',
	type: 'options',
	options: [
		{
			name: 'DELETE',
			value: 'DELETE',
		},
		{
			name: 'GET',
			value: 'GET',
		},
		{
			name: 'HEAD',
			value: 'HEAD',
		},
		{
			name: 'PATCH',
			value: 'PATCH',
		},
		{
			name: 'POST',
			value: 'POST',
		},
		{
			name: 'PUT',
			value: 'PUT',
		},
	],
	default: 'GET',
	description: 'The HTTP method to listen to',
};

export const responseCodeProperty: INodeProperties = {
	displayName: 'Response Code',
	name: 'responseCode',
	type: 'number',
	displayOptions: {
		hide: {
			responseMode: ['responseNode'],
		},
	},
	typeOptions: {
		minValue: 100,
		maxValue: 599,
	},
	default: 200,
	description: 'The HTTP Response code to return',
};

const responseModeOptions = [
	{
		name: 'Immediately',
		value: 'onReceived',
		description: 'As soon as this node executes',
	},
	{
		name: 'When Last Node Finishes',
		value: 'lastNode',
		description: 'Returns data of the last-executed node',
	},
	{
		name: "Using 'Respond to Webhook' Node",
		value: 'responseNode',
		description: 'Response defined in that node',
	},
];

export const responseModeProperty: INodeProperties = {
	displayName: 'Respond',
	name: 'responseMode',
	type: 'options',
	options: responseModeOptions,
	default: 'onReceived',
	description: 'When and how to respond to the webhook',
	displayOptions: {
		show: {
			'@version': [1, 1.1, 2],
		},
	},
};

export const responseModePropertyStreaming: INodeProperties = {
	displayName: 'Respond',
	name: 'responseMode',
	type: 'options',
	options: [
		...responseModeOptions,
		{
			name: 'Streaming Response',
			value: 'streaming',
			description: 'Returns data in real time from streaming enabled nodes',
		},
	],
	default: 'onReceived',
	description: 'When and how to respond to the webhook',
	displayOptions: {
		hide: {
			'@version': [1, 1.1, 2],
		},
	},
};

export const responseDataProperty: INodeProperties = {
	displayName: 'Response Data',
	name: 'responseData',
	type: 'options',
	displayOptions: {
		show: {
			responseMode: ['lastNode'],
		},
	},
	options: [
		{
			name: 'All Entries',
			value: 'allEntries',
			description: 'Returns all the entries of the last node. Always returns an array.',
		},
		{
			name: 'First Entry JSON',
			value: 'firstEntryJson',
			description:
				'Returns the JSON data of the first entry of the last node. Always returns a JSON object.',
		},
		{
			name: 'First Entry Binary',
			value: 'firstEntryBinary',
			description:
				'Returns the binary data of the first entry of the last node. Always returns a binary file.',
		},
		{
			name: 'No Response Body',
			value: 'noData',
			description: 'Returns without a body',
		},
	],
	default: 'firstEntryJson',
	description:
		'What data should be returned. If it should return all items as an array or only the first item as object.',
};

export const responseBinaryPropertyNameProperty: INodeProperties = {
	displayName: 'Property Name',
	name: 'responseBinaryPropertyName',
	type: 'string',
	required: true,
	default: 'data',
	displayOptions: {
		show: {
			responseData: ['firstEntryBinary'],
		},
	},
	description: 'Name of the binary property to return',
};

export const optionsProperty: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	placeholder: 'Add option',
	default: {},
	options: [
		{
			displayName: 'Binary File',
			name: 'binaryData',
			type: 'boolean',
			displayOptions: {
				show: {
					'/httpMethod': ['PATCH', 'PUT', 'POST'],
					'@version': [1],
				},
			},
			default: false,
			description: 'Whether the webhook will receive binary data',
		},
		{
			displayName: 'Put Output File in Field',
			name: 'binaryPropertyName',
			type: 'string',
			default: 'data',
			displayOptions: {
				show: {
					binaryData: [true],
					'@version': [1],
				},
			},
			hint: 'The name of the output binary field to put the file in',
			description:
				'If the data gets received via "Form-Data Multipart" it will be the prefix and a number starting with 0 will be attached to it',
		},
		{
			displayName: 'Field Name for Binary Data',
			name: 'binaryPropertyName',
			type: 'string',
			default: 'data',
			displayOptions: {
				hide: {
					'@version': [1],
				},
			},
			description:
				'The name of the output field to put any binary file data in. Only relevant if binary data is received.',
		},
		{
			displayName: 'Ignore Bots',
			name: 'ignoreBots',
			type: 'boolean',
			default: false,
			description: 'Whether to ignore requests from bots like link previewers and web crawlers',
		},
		{
			displayName: 'IP(s) Whitelist',
			name: 'ipWhitelist',
			type: 'string',
			placeholder: 'e.g. 127.0.0.1',
			default: '',
			description: 'Comma-separated list of allowed IP addresses. Leave empty to allow all IPs.',
		},
		{
			displayName: 'No Response Body',
			name: 'noResponseBody',
			type: 'boolean',
			default: false,
			description: 'Whether to send any body in the response',
			displayOptions: {
				hide: {
					rawBody: [true],
				},
				show: {
					'/responseMode': ['onReceived'],
				},
			},
		},
		{
			displayName: 'Raw Body',
			name: 'rawBody',
			type: 'boolean',
			displayOptions: {
				show: {
					'@version': [1],
				},
				hide: {
					binaryData: [true],
					noResponseBody: [true],
				},
			},
			default: false,
			// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
			description: 'Raw body (binary)',
		},
		{
			displayName: 'Raw Body',
			name: 'rawBody',
			type: 'boolean',
			displayOptions: {
				hide: {
					noResponseBody: [true],
					'@version': [1],
				},
			},
			default: false,
			description: 'Whether to return the raw body',
		},
		{
			displayName: 'Response Data',
			name: 'responseData',
			type: 'string',
			displayOptions: {
				show: {
					'/responseMode': ['onReceived'],
				},
				hide: {
					noResponseBody: [true],
				},
			},
			default: '',
			placeholder: 'success',
			description: 'Custom response data to send',
		},
		{
			displayName: 'Response Content-Type',
			name: 'responseContentType',
			type: 'string',
			displayOptions: {
				show: {
					'/responseData': ['firstEntryJson'],
					'/responseMode': ['lastNode'],
				},
			},
			default: '',
			placeholder: 'application/xml',
			// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-json
			description:
				'Set a custom content-type to return if another one as the "application/json" should be returned',
		},
		{
			displayName: 'Response Headers',
			name: 'responseHeaders',
			placeholder: 'Add Response Header',
			description: 'Add headers to the webhook response',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			default: {},
			options: [
				{
					name: 'entries',
					displayName: 'Entries',
					values: [
						{
							displayName: 'Name',
							name: 'name',
							type: 'string',
							default: '',
							description: 'Name of the header',
						},
						{
							displayName: 'Value',
							name: 'value',
							type: 'string',
							default: '',
							description: 'Value of the header',
						},
					],
				},
			],
		},
		{
			displayName: 'Property Name',
			name: 'responsePropertyName',
			type: 'string',
			displayOptions: {
				show: {
					'/responseData': ['firstEntryJson'],
					'/responseMode': ['lastNode'],
				},
			},
			default: 'data',
			description: 'Name of the property to return the data of instead of the whole JSON',
		},
	],
};

export const responseCodeSelector: INodeProperties = {
	displayName: 'Response Code',
	name: 'responseCode',
	type: 'options',
	options: [
		{ name: '200', value: 200, description: 'OK - Request has succeeded' },
		{ name: '201', value: 201, description: 'Created - Request has been fulfilled' },
		{ name: '204', value: 204, description: 'No Content - Request processed, no content returned' },
		{
			name: '301',
			value: 301,
			description: 'Moved Permanently - Requested resource moved permanently',
		},
		{ name: '302', value: 302, description: 'Found - Requested resource moved temporarily' },
		{ name: '304', value: 304, description: 'Not Modified - Resource has not been modified' },
		{ name: '400', value: 400, description: 'Bad Request - Request could not be understood' },
		{ name: '401', value: 401, description: 'Unauthorized - Request requires user authentication' },
		{
			name: '403',
			value: 403,
			description: 'Forbidden - Server understood, but refuses to fulfill',
		},
		{ name: '404', value: 404, description: 'Not Found - Server has not found a match' },
		{
			name: 'Custom Code',
			value: 'customCode',
			description: 'Write any HTTP code',
		},
	],
	default: 200,
	description: 'The HTTP response code to return',
};

export const responseCodeOption: INodeProperties = {
	displayName: 'Response Code',
	name: 'responseCode',
	placeholder: 'Add Response Code',
	type: 'fixedCollection',
	default: {
		values: {
			responseCode: 200,
		},
	},
	options: [
		{
			name: 'values',
			displayName: 'Values',
			values: [
				responseCodeSelector,
				{
					displayName: 'Code',
					name: 'customCode',
					type: 'number',
					default: 200,
					placeholder: 'e.g. 400',
					typeOptions: {
						minValue: 100,
					},
					displayOptions: {
						show: {
							responseCode: ['customCode'],
						},
					},
				},
			],
		},
	],
	displayOptions: {
		show: {
			'@version': [{ _cnd: { gte: 2 } }],
		},
		hide: {
			'/responseMode': ['responseNode'],
		},
	},
};
