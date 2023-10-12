import type { INodeProperties, INodeTypeDescription, IWebhookDescription } from 'n8n-workflow';

export const defaultWebhookDescription: IWebhookDescription = {
	name: 'default',
	httpMethod: '={{$parameter["httpMethod"]}}',
	isFullPath: true,
	responseCode: '={{$parameter["responseCode"]}}',
	responseMode: '={{$parameter["responseMode"]}}',
	responseData:
		'={{$parameter["responseData"] || ($parameter.options.noResponseBody ? "noData" : undefined) }}',
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

export const responseModeProperty: INodeProperties = {
	displayName: 'Respond',
	name: 'responseMode',
	type: 'options',
	options: [
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
	],
	default: 'onReceived',
	description: 'When and how to respond to the webhook',
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
	placeholder: 'Add Option',
	default: {},
	options: [
		{
			displayName: 'Binary Data',
			name: 'binaryData',
			type: 'boolean',
			displayOptions: {
				show: {
					'/httpMethod': ['PATCH', 'PUT', 'POST'],
				},
			},
			default: false,
			description: 'Whether the webhook will receive binary data',
		},
		{
			displayName: 'Binary Property',
			name: 'binaryPropertyName',
			type: 'string',
			default: 'data',
			required: true,
			displayOptions: {
				show: {
					binaryData: [true],
				},
			},
			description:
				'Name of the binary property to write the data of the received file to. If the data gets received via "Form-Data Multipart" it will be the prefix and a number starting with 0 will be attached to it.',
		},
		{
			displayName: 'Ignore Bots',
			name: 'ignoreBots',
			type: 'boolean',
			default: false,
			description: 'Whether to ignore requests from bots like link previewers and web crawlers',
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
