import type { Readable } from 'stream';
import type {
	IDataObject,
	IExecuteFunctions,
	IN8nHttpFullResponse,
	IN8nHttpResponse,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { jsonParse, BINARY_ENCODING, NodeOperationError } from 'n8n-workflow';

export class RespondToWebhook implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Respond to Webhook',
		icon: 'file:webhook.svg',
		name: 'respondToWebhook',
		group: ['transform'],
		version: 1,
		description: 'Returns data for Webhook',
		defaults: {
			name: 'Respond to Webhook',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [],
		properties: [
			{
				displayName: 'Respond With',
				name: 'respondWith',
				type: 'options',
				options: [
					{
						name: 'Binary',
						value: 'binary',
					},
					{
						name: 'First Incoming Item',
						value: 'firstIncomingItem',
					},
					{
						name: 'JSON',
						value: 'json',
					},
					{
						name: 'No Data',
						value: 'noData',
					},
					{
						name: 'Text',
						value: 'text',
					},
				],
				default: 'firstIncomingItem',
				description: 'The data that should be returned',
			},
			{
				displayName:
					'When using expressions, note that this node will only run for the first item in the input data.',
				name: 'webhookNotice',
				type: 'notice',
				displayOptions: {
					show: {
						respondWith: ['json', 'text'],
					},
				},
				default: '',
			},
			{
				displayName: 'Response Body',
				name: 'responseBody',
				type: 'json',
				displayOptions: {
					show: {
						respondWith: ['json'],
					},
				},
				default: '',
				placeholder: '{ "key": "value" }',
				description: 'The HTTP Response JSON data',
			},
			{
				displayName: 'Response Body',
				name: 'responseBody',
				type: 'string',
				displayOptions: {
					show: {
						respondWith: ['text'],
					},
				},
				default: '',
				placeholder: 'e.g. Workflow started',
				description: 'The HTTP Response text data',
			},
			{
				displayName: 'Response Data Source',
				name: 'responseDataSource',
				type: 'options',
				displayOptions: {
					show: {
						respondWith: ['binary'],
					},
				},
				options: [
					{
						name: 'Choose Automatically From Input',
						value: 'automatically',
						description: 'Use if input data will contain a single piece of binary data',
					},
					{
						name: 'Specify Myself',
						value: 'set',
						description: 'Enter the name of the input field the binary data will be in',
					},
				],
				default: 'automatically',
			},
			{
				displayName: 'Input Field Name',
				name: 'inputFieldName',
				type: 'string',
				required: true,
				default: 'data',
				displayOptions: {
					show: {
						respondWith: ['binary'],
						responseDataSource: ['set'],
					},
				},
				description: 'The name of the node input field with the binary data',
			},

			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Response Code',
						name: 'responseCode',
						type: 'number',
						typeOptions: {
							minValue: 100,
							maxValue: 599,
						},
						default: 200,
						description: 'The HTTP Response code to return. Defaults to 200.',
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
						displayName: 'Cookies',
						name: 'responseCookies',
						placeholder: 'Add Cookies',
						description: 'Add cookies to the webhook response',
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
										required: true,
										default: '',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										required: true,
										default: '',
										description: 'Value is string encoded',
									},
									{
										displayName: 'Domain', // The value the user sees in the UI
										name: 'domain', // The name used to reference the element UI within the code
										type: 'string',
										default: '',
										description:
											'Domain name for the cookie. Defaults to the domain name of the webhook.',
									},
									{
										displayName: 'Expires', // The value the user sees in the UI
										name: 'expires', // The name used to reference the element UI within the code
										type: 'dateTime',
										default: '',
										description:
											'Expiry date of the cookie in GMT. If not specified or set to 0, creates a session cookie.',
									},
									{
										displayName: 'HTTP Only', // The value the user sees in the UI
										name: 'httpOnly', // The name used to reference the element UI within the code
										type: 'boolean',
										default: true,
										description: 'Whether to allow client side javascript to access this cookie',
									},
									{
										displayName: 'Path', // The value the user sees in the UI
										name: 'path', // The name used to reference the element UI within the code
										type: 'string',
										default: '/',
										description: 'Path for the cookie',
									},
									{
										displayName: 'Secure', // The value the user sees in the UI
										name: 'secure', // The name used to reference the element UI within the code
										type: 'boolean',
										default: true,
										description: 'Whether to mark the cookie to be used with HTTPS only',
									},
									{
										displayName: 'Same-Site', // The value the user sees in the UI
										name: 'sameSite', // The name used to reference the element UI within the code
										type: 'boolean',
										default: true,
										description: 'Whether to set Same-Site enforcement',
									},
								],
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const respondWith = this.getNodeParameter('respondWith', 0) as string;
		const options = this.getNodeParameter('options', 0, {});

		const headers = {} as IDataObject;
		if (options.responseHeaders) {
			for (const header of (options.responseHeaders as IDataObject).entries as IDataObject[]) {
				if (typeof header.name !== 'string') {
					header.name = header.name?.toString();
				}
				headers[header.name?.toLowerCase() as string] = header.value?.toString();
			}
			if (Object.keys(headers).includes('set-cookie')) {
				throw new NodeOperationError(this.getNode(), 'Use cookies option to set cookies.');
			}
		}

		const cookies = {} as IDataObject;
		//console.log(options.responseCookies);
		if (options.responseCookies) {
			for (
				let i = 0;
				i < ((options.responseCookies as IDataObject).entries as IDataObject[]).length;
				i++
			) {
				const cookie = ((options.responseCookies as IDataObject).entries as IDataObject[])[i];
				const cookieOptions = {} as {
					domain?: string;
					expires?: string;
					httpOnly: boolean;
					path?: string;
					secure: boolean;
					sameSite: boolean;
				};
				if (typeof cookie.name !== 'string') {
					cookie.name = cookie?.name?.toString();
				}
				if (!cookie.name) {
					throw new NodeOperationError(this.getNode(), 'Cookie name is not set.');
				}
				if (typeof cookie.value !== 'string') {
					cookie.value = cookie?.value?.toString();
				}
				if (!cookie.value) {
					throw new NodeOperationError(this.getNode(), 'Cookie value is not set.');
				}
				if (typeof cookie.domain !== 'string') {
					cookie.domain = cookie?.domain?.toString();
				}
				if (cookie.domain) {
					cookieOptions.domain = cookie.domain;
				}
				if (typeof cookie.expires !== 'string') {
					cookie.expires = cookie?.expires?.toString();
				}
				if (cookie.expires) {
					cookieOptions.expires = cookie.expires;
				}
				if (typeof cookie.httpOnly !== 'boolean') {
					throw new NodeOperationError(this.getNode(), 'Http Only is not a boolean value');
				} else {
					cookieOptions.httpOnly = cookie.httpOnly;
				}
				if (typeof cookie.path !== 'string') {
					cookie.path = cookie?.path?.toString();
				}
				if (cookie.path) {
					cookieOptions.path = cookie.path;
				}
				if (typeof cookie.secure !== 'boolean') {
					throw new NodeOperationError(this.getNode(), 'Secure is not a boolean value');
				} else {
					cookieOptions.secure = cookie.secure;
				}
				if (typeof cookie.sameSite !== 'boolean') {
					throw new NodeOperationError(this.getNode(), 'Same-site is not a boolean value');
				} else {
					cookieOptions.sameSite = cookie.sameSite;
				}
				interface CookiesValueOptions {
					value: string;
					options: object;
				}

				const cookiesValueOptions: CookiesValueOptions = {
					value: cookie.value,
					options: cookieOptions,
				};

				cookies[cookie.name] = cookiesValueOptions;
			}
		}
		//console.log(cookies);

		let responseBody: IN8nHttpResponse | Readable;
		if (respondWith === 'json') {
			const responseBodyParameter = this.getNodeParameter('responseBody', 0) as string;
			if (responseBodyParameter) {
				responseBody = jsonParse(responseBodyParameter, {
					errorMessage: "Invalid JSON in 'Response Body' field",
				});
			}
		} else if (respondWith === 'firstIncomingItem') {
			responseBody = items[0].json;
		} else if (respondWith === 'text') {
			responseBody = this.getNodeParameter('responseBody', 0) as string;
		} else if (respondWith === 'binary') {
			const item = items[0];

			if (item.binary === undefined) {
				throw new NodeOperationError(this.getNode(), 'No binary data exists on the first item!');
			}

			let responseBinaryPropertyName: string;

			const responseDataSource = this.getNodeParameter('responseDataSource', 0) as string;

			if (responseDataSource === 'set') {
				responseBinaryPropertyName = this.getNodeParameter('inputFieldName', 0) as string;
			} else {
				const binaryKeys = Object.keys(item.binary);
				if (binaryKeys.length === 0) {
					throw new NodeOperationError(this.getNode(), 'No binary data exists on the first item!');
				}
				responseBinaryPropertyName = binaryKeys[0];
			}

			const binaryData = this.helpers.assertBinaryData(0, responseBinaryPropertyName);
			if (binaryData.id) {
				responseBody = { binaryData };
			} else {
				responseBody = Buffer.from(binaryData.data, BINARY_ENCODING);
				headers['content-length'] = (responseBody as Buffer).length;
			}

			if (!headers['content-type']) {
				headers['content-type'] = binaryData.mimeType;
			}
		} else if (respondWith !== 'noData') {
			throw new NodeOperationError(
				this.getNode(),
				`The Response Data option "${respondWith}" is not supported!`,
			);
		}

		const response: IN8nHttpFullResponse = {
			body: responseBody,
			headers,
			cookies,
			statusCode: (options.responseCode as number) || 200,
		};
		//console.log(response);
		this.sendResponse(response);

		return this.prepareOutputData(items);
	}
}
