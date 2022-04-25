import { INodeTypeDescription } from 'n8n-workflow';

export const versionDescription: INodeTypeDescription = {
	displayName: 'HTTP Request',
	name: 'httpRequest',
	icon: 'fa:at',
	group: ['input'],
	version: 2,
	subtitle: '={{$parameter["requestMethod"] + ": " + $parameter["url"]}}',
	description: 'Makes an HTTP request and returns the response data',
	defaults: {
		name: 'HTTP Request',
		color: '#2200DD',
	},
	inputs: ['main'],
	outputs: ['main'],
	credentials: [
		{
			name: 'httpBasicAuth',
			required: true,
			displayOptions: {
				show: {
					authenticateWith: [
						'genericAuth',
					],
					genericAuthType: [
						'basicAuth',
					],
				},
			},
		},
		{
			name: 'httpDigestAuth',
			required: true,
			displayOptions: {
				show: {
					authenticateWith: [
						'genericAuth',
					],
					genericAuthType: [
						'digestAuth',
					],
				},
			},
		},
		{
			name: 'httpHeaderAuth',
			required: true,
			displayOptions: {
				show: {
					authenticateWith: [
						'genericAuth',
					],
					genericAuthType: [
						'headerAuth',
					],
				},
			},
		},
		{
			name: 'httpQueryAuth',
			required: true,
			displayOptions: {
				show: {
					authenticateWith: [
						'genericAuth',
					],
					genericAuthType: [
						'queryAuth',
					],
				},
			},
		},
		{
			name: 'oAuth1Api',
			required: true,
			displayOptions: {
				show: {
					authenticateWith: [
						'genericAuth',
					],
					genericAuthType: [
						'oAuth1',
					],
				},
			},
		},
		{
			name: 'oAuth2Api',
			required: true,
			displayOptions: {
				show: {
					authenticateWith: [
						'genericAuth',
					],
					genericAuthType: [
						'oAuth2',
					],
				},
			},
		},
	],
	properties: [
		// @TODO refactored/new 'parameter-notice' component
		// retrieving scopes for OAuth cred

		// @TODO refactored/new 'node-credentials' component
		// retrieving cred based on nodeCredentialType
		{
			displayName: 'Authenticate with',
			name: 'authenticateWith',
			type: 'options',
			required: true,
			options: [
				{
					name: 'Node Credential',
					value: 'nodeCredential',
					description: 'Easiest. Use a credential from another node, like Google Sheets.',
				},
				{
					name: 'Generic Auth',
					value: 'genericAuth',
					description: 'Fully customizable. Choose between Basic, Header, OAuth2 and more.',
				},
				{
					name: 'None',
					value: 'none',
				},
			],
			default: 'none',
		},
		{
			displayName: 'Node Credential Type',
			name: 'nodeCredentialType',
			type: 'options',
			required: true,
			typeOptions: {
				loadOptionsMethod: 'getNodeCredentialTypes',
			},
			options: [],
			default: '',
			placeholder: 'None',
			displayOptions: {
				show: {
					authenticateWith: [
						'nodeCredential',
					],
				},
			},
		},
		{
			displayName: 'Generic Auth Type',
			name: 'genericAuthType',
			type: 'options',
			required: true,
			displayOptions: {
				show: {
					authenticateWith: [
						'genericAuth',
					],
				},
			},
			options: [
				{
					name: 'Basic Auth',
					value: 'basicAuth',
				},
				{
					name: 'Digest Auth',
					value: 'digestAuth',
				},
				{
					name: 'Header Auth',
					value: 'headerAuth',
				},
				{
					name: 'Query Auth',
					value: 'queryAuth',
				},
				{
					name: 'OAuth1',
					value: 'oAuth1',
				},
				{
					name: 'OAuth2',
					value: 'oAuth2',
				},
			],
			default: 'basicAuth',
		},
		{
			displayName: 'Request Method',
			name: 'requestMethod',
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
					name: 'OPTIONS',
					value: 'OPTIONS',
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
		},
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'http://example.com/index.html',
			description: 'The URL to make the request to',
			required: true,
		},
		{
			displayName: 'Ignore SSL Issues',
			name: 'allowUnauthorizedCerts',
			type: 'boolean',
			default: false,
			description: 'Whether to connect even if SSL certificate validation is not possible',
		},
		{
			displayName: 'Response Format',
			name: 'responseFormat',
			type: 'options',
			options: [
				{
					name: 'File',
					value: 'file',
				},
				{
					name: 'JSON',
					value: 'json',
				},
				{
					name: 'String',
					value: 'string',
				},
			],
			default: 'json',
			description: 'The format in which the data gets returned from the URL',
		},
		{
			displayName: 'Property Name',
			name: 'dataPropertyName',
			type: 'string',
			default: 'data',
			required: true,
			displayOptions: {
				show: {
					responseFormat: [
						'string',
					],
				},
			},
			description: 'Name of the property to which to write the response data',
		},
		{
			displayName: 'Binary Property',
			name: 'dataPropertyName',
			type: 'string',
			default: 'data',
			required: true,
			displayOptions: {
				show: {
					responseFormat: [
						'file',
					],
				},
			},
			description: 'Name of the binary property to which to write the data of the read file',
		},

		{
			displayName: 'JSON/RAW Parameters',
			name: 'jsonParameters',
			type: 'boolean',
			default: false,
			description: 'If the query and/or body parameter should be set via the value-key pair UI or JSON/RAW',
		},

		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add Option',
			default: {},
			options: [
				{
					displayName: 'Batch Interval',
					name: 'batchInterval',
					type: 'number',
					typeOptions: {
						minValue: 0,
					},
					default: 1000,
					description: 'Time (in milliseconds) between each batch of requests. 0 for disabled.',
				},
				{
					displayName: 'Batch Size',
					name: 'batchSize',
					type: 'number',
					typeOptions: {
						minValue: -1,
					},
					default: 50,
					description: 'Input will be split in batches to throttle requests. -1 for disabled. 0 will be treated as 1.',
				},
				{
					displayName: 'Body Content Type',
					name: 'bodyContentType',
					type: 'options',
					displayOptions: {
						show: {
							'/requestMethod': [
								'PATCH',
								'POST',
								'PUT',
							],
						},
					},
					options: [
						{
							name: 'JSON',
							value: 'json',
						},
						{
							name: 'RAW/Custom',
							value: 'raw',
						},
						{
							name: 'Form-Data Multipart',
							value: 'multipart-form-data',
						},
						{
							name: 'Form Urlencoded',
							value: 'form-urlencoded',
						},
					],
					default: 'json',
					description: 'Content-Type to use to send body parameters',
				},
				{
					displayName: 'Full Response',
					name: 'fullResponse',
					type: 'boolean',
					default: false,
					description: 'Returns the full reponse data instead of only the body',
				},
				{
					displayName: 'Follow All Redirects',
					name: 'followAllRedirects',
					type: 'boolean',
					default: false,
					description: 'Follow non-GET HTTP 3xx redirects',
				},
				{
					displayName: 'Follow GET Redirect',
					name: 'followRedirect',
					type: 'boolean',
					default: true,
					description: 'Follow GET HTTP 3xx redirects',
				},
				{
					displayName: 'Ignore Response Code',
					name: 'ignoreResponseCode',
					type: 'boolean',
					default: false,
					description: 'Succeeds also when status code is not 2xx',
				},
				{
					displayName: 'MIME Type',
					name: 'bodyContentCustomMimeType',
					type: 'string',
					default: '',
					placeholder: 'text/xml',
					description: 'Specify the mime type for raw/custom body type',
					required: false,
					displayOptions: {
						show: {
							'/requestMethod': [
								'PATCH',
								'POST',
								'PUT',
							],
						},
					},
				},
				{
					displayName: 'Proxy',
					name: 'proxy',
					type: 'string',
					default: '',
					placeholder: 'http://myproxy:3128',
					description: 'HTTP proxy to use',
				},
				{
					displayName: 'Split Into Items',
					name: 'splitIntoItems',
					type: 'boolean',
					default: false,
					description: 'Outputs each element of an array as own item.',
					displayOptions: {
						show: {
							'/responseFormat': [
								'json',
							],
						},
					},
				},
				{
					displayName: 'Timeout',
					name: 'timeout',
					type: 'number',
					typeOptions: {
						minValue: 1,
					},
					default: 10000,
					description: 'Time in ms to wait for the server to send response headers (and start the response body) before aborting the request',
				},
				{
					displayName: 'Use Querystring',
					name: 'useQueryString',
					type: 'boolean',
					default: false,
					description: 'Set this option to true if you need arrays to be serialized as foo=bar&foo=baz instead of the default foo[0]=bar&foo[1]=baz',
				},
			],
		},


		// Body Parameter
		{
			displayName: 'Send Binary Data',
			name: 'sendBinaryData',
			type: 'boolean',
			displayOptions: {
				show: {
					// TODO: Make it possible to use dot-notation
					// 'options.bodyContentType': [
					// 	'raw',
					// ],
					jsonParameters: [
						true,
					],
					requestMethod: [
						'PATCH',
						'POST',
						'PUT',
					],
				},
			},
			default: false,
			description: 'Whether binary data should be sent as body',
		},
		{
			displayName: 'Binary Property',
			name: 'binaryPropertyName',
			type: 'string',
			required: true,
			default: 'data',
			displayOptions: {
				hide: {
					sendBinaryData: [
						false,
					],
				},
				show: {
					jsonParameters: [
						true,
					],
					requestMethod: [
						'PATCH',
						'POST',
						'PUT',
					],
				},
			},
			description: `Name of the binary property which contains the data for the file to be uploaded. For Form-Data Multipart, they can be provided in the format: <code>"sendKey1:binaryProperty1,sendKey2:binaryProperty2</code>`,
		},
		{
			displayName: 'Body Parameters',
			name: 'bodyParametersJson',
			type: 'json',
			displayOptions: {
				hide: {
					sendBinaryData: [
						true,
					],
				},
				show: {
					jsonParameters: [
						true,
					],
					requestMethod: [
						'PATCH',
						'POST',
						'PUT',
						'DELETE',
					],
				},
			},
			default: '',
			description: 'Body parameters as JSON or RAW',
		},
		{
			displayName: 'Body Parameters',
			name: 'bodyParametersUi',
			placeholder: 'Add Parameter',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			displayOptions: {
				show: {
					jsonParameters: [
						false,
					],
					requestMethod: [
						'PATCH',
						'POST',
						'PUT',
						'DELETE',
					],
				},
			},
			description: 'The body parameter to send',
			default: {},
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
							description: 'Name of the parameter',
						},
						{
							displayName: 'Value',
							name: 'value',
							type: 'string',
							default: '',
							description: 'Value of the parameter',
						},
					],
				},
			],
		},

		// Header Parameters
		{
			displayName: 'Headers',
			name: 'headerParametersJson',
			type: 'json',
			displayOptions: {
				show: {
					jsonParameters: [
						true,
					],
				},
			},
			default: '',
			description: 'Header parameters as JSON or RAW',
		},
		{
			displayName: 'Headers',
			name: 'headerParametersUi',
			placeholder: 'Add Header',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			displayOptions: {
				show: {
					jsonParameters: [
						false,
					],
				},
			},
			description: 'The headers to send',
			default: {},
			options: [
				{
					name: 'parameter',
					displayName: 'Header',
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
							description: 'Value to set for the header',
						},
					],
				},
			],
		},

		// Query Parameter
		{
			displayName: 'Query Parameters',
			name: 'queryParametersJson',
			type: 'json',
			displayOptions: {
				show: {
					jsonParameters: [
						true,
					],
				},
			},
			default: '',
			description: 'Query parameters as JSON (flat object)',
		},
		{
			displayName: 'Query Parameters',
			name: 'queryParametersUi',
			placeholder: 'Add Parameter',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
			},
			displayOptions: {
				show: {
					jsonParameters: [
						false,
					],
				},
			},
			description: 'Query parameters to send',
			default: {},
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
							description: 'Name of the parameter',
						},
						{
							displayName: 'Value',
							name: 'value',
							type: 'string',
							default: '',
							description: 'Value of the parameter',
						},
					],
				},
			],
		},
	],
};
