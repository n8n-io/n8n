import type { INodeProperties, INodeTypeDescription, IWebhookDescription } from 'n8n-workflow';

export const defaultWebhookDescription: IWebhookDescription = {
	name: 'default',
	httpMethod: '={{$parameter["httpMethod"] || "GET"}}',
	isFullPath: true,
	responseCode:
		'={{$parameter["responseCode"] === "customCode" ? $parameter["customCode"] : $parameter["responseCode"]}}',
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
	{
		name: 'webhookJwtAuth',
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
			displayName: 'Binary Property',
			name: 'binaryPropertyName',
			type: 'string',
			default: 'data',
			displayOptions: {
				hide: {
					'@version': [1],
				},
			},
			description:
				'Name of the binary property to write the data of the received file to, only relevant if binary data is received',
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
			description: 'Comma-separated list of IP addresses to allow. If empty, all IPs are allowed.',
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
		{ name: '100', value: 100, description: 'Continue - Initial part of request received' },
		{
			name: '101',
			value: 101,
			description: 'Switching Protocols - Requester asked to switch protocols',
		},
		{ name: '200', value: 200, description: 'OK - Request has succeeded' },
		{ name: '201', value: 201, description: 'Created - Request has been fulfilled' },
		{ name: '202', value: 202, description: 'Accepted - Request received, not completed yet' },
		{
			name: '203',
			value: 203,
			description: 'Non-Authoritative Information - Request processed, info not from origin',
		},
		{ name: '204', value: 204, description: 'No Content - Request processed, no content returned' },
		{
			name: '205',
			value: 205,
			description: 'Reset Content - Request processed, clear form for further input',
		},
		{
			name: '206',
			value: 206,
			description: 'Partial Content - Partial GET request was successful',
		},
		{
			name: '300',
			value: 300,
			description: 'Multiple Choices - Requested resource has different choices',
		},
		{
			name: '301',
			value: 301,
			description: 'Moved Permanently - Requested resource moved permanently',
		},
		{ name: '302', value: 302, description: 'Found - Requested resource moved temporarily' },
		{
			name: '303',
			value: 303,
			description: 'See Other - Requested resource can be found elsewhere',
		},
		{ name: '304', value: 304, description: 'Not Modified - Resource has not been modified' },
		{
			name: '305',
			value: 305,
			description: 'Use Proxy - Requested resource must be accessed through proxy',
		},
		{
			name: '307',
			value: 307,
			description: 'Temporary Redirect - Resource resides temporarily under different URI',
		},
		{ name: '400', value: 400, description: 'Bad Request - Request could not be understood' },
		{ name: '401', value: 401, description: 'Unauthorized - Request requires user authentication' },
		{ name: '402', value: 402, description: 'Payment Required - Reserved for future use' },
		{
			name: '403',
			value: 403,
			description: 'Forbidden - Server understood, but refuses to fulfill',
		},
		{ name: '404', value: 404, description: 'Not Found - Server has not found a match' },
		{
			name: '405',
			value: 405,
			description: 'Method Not Allowed - Method not allowed for resource',
		},
		{
			name: '406',
			value: 406,
			description: "Not Acceptable - Resource can't generate acceptable response",
		},
		{
			name: '407',
			value: 407,
			description: 'Proxy Authentication Required - Client must authenticate with proxy',
		},
		{
			name: '408',
			value: 408,
			description: 'Request Timeout - Server timed out waiting for request',
		},
		{
			name: '409',
			value: 409,
			description: 'Conflict - Request could not be completed due to conflict',
		},
		{ name: '410', value: 410, description: 'Gone - Requested resource is no longer available' },
		{
			name: '411',
			value: 411,
			description: 'Length Required - Required Content-Length header is missing',
		},
		{
			name: '412',
			value: 412,
			description: 'Precondition Failed - Precondition given in request failed',
		},
		{
			name: '413',
			value: 413,
			description: 'Request Entity Too Large - Request is larger than server can handle',
		},
		{
			name: '414',
			value: 414,
			description: 'Request-URI Too Long - URI longer than server can interpret',
		},
		{
			name: '415',
			value: 415,
			description: 'Unsupported Media Type - Entity body in unsupported format',
		},
		{
			name: '416',
			value: 416,
			description: 'Requested Range Not Satisfiable - Invalid Range header in request',
		},
		{
			name: '417',
			value: 417,
			description: 'Expectation Failed - Expectation in Expect header could not be met',
		},
		{
			name: '500',
			value: 500,
			description: 'Internal Server Error - Unexpected condition was encountered',
		},
		{
			name: '501',
			value: 501,
			description: 'Not Implemented - Server does not support functionality',
		},
		{
			name: '502',
			value: 502,
			description: 'Bad Gateway - Server received an invalid response',
		},
		{
			name: '503',
			value: 503,
			description: 'Service Unavailable - Server is currently unable to handle the request',
		},
		{
			name: '504',
			value: 504,
			description: 'Gateway Timeout - Server did not receive a timely response',
		},
		{
			name: '505',
			value: 505,
			description: 'HTTP Version Not Supported - Server does not support the HTTP protocol version',
		},
		{
			name: '506',
			value: 506,
			description:
				'Variant Also Negotiates - Transparent content negotiation for the request results in a circular reference',
		},
		{
			name: '507',
			value: 507,
			description:
				'Insufficient Storage - The server is unable to store the representation needed to complete the request',
		},
		{
			name: '508',
			value: 508,
			description:
				'Loop Detected - The server detected an infinite loop while processing a request',
		},
		{
			name: '510',
			value: 510,
			description: 'Not Extended - Further extensions are needed to fulfill the request',
		},
		{
			name: '511',
			value: 511,
			description:
				'Network Authentication Required - Client needs to authenticate to gain network access',
		},
		{
			name: 'Custom Code',
			value: 'customCode',
			description: 'Write any HTTP code',
		},
	],
	default: 200,
	description: 'The HTTP Response code to return',
};
