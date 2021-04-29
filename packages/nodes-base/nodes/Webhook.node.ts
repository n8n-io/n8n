import {
	BINARY_ENCODING,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import * as basicAuth from 'basic-auth';

import { Response } from 'express';

import * as fs from 'fs';

import * as formidable from 'formidable';

function authorizationError(resp: Response, realm: string, responseCode: number, message?: string) {
	if (message === undefined) {
		message = 'Authorization problem!';
		if (responseCode === 401) {
			message = 'Authorization is required!';
		} else if (responseCode === 403) {
			message = 'Authorization data is wrong!';
		}
	}

	resp.writeHead(responseCode, { 'WWW-Authenticate': `Basic realm="${realm}"` });
	resp.end(message);
	return {
		noWebhookResponse: true,
	};
}

export class Webhook implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Webhook',
		name: 'webhook',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when a webhook got called.',
		defaults: {
			name: 'Webhook',
			color: '#885577',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'httpBasicAuth',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'basicAuth',
						],
					},
				},
			},
			{
				name: 'httpHeaderAuth',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'headerAuth',
						],
					},
				},
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: '={{$parameter["httpMethod"]}}',
				isFullPath: true,
				responseCode: '={{$parameter["responseCode"]}}',
				responseMode: '={{$parameter["responseMode"]}}',
				responseData: '={{$parameter["responseData"]}}',
				responseBinaryPropertyName: '={{$parameter["responseBinaryPropertyName"]}}',
				responseContentType: '={{$parameter["options"]["responseContentType"]}}',
				responsePropertyName: '={{$parameter["options"]["responsePropertyName"]}}',
				responseHeaders: '={{$parameter["options"]["responseHeaders"]}}',
				path: '={{$parameter["path"]}}',
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
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
				description: 'The way to authenticate.',
			},
			{
				displayName: 'HTTP Method',
				name: 'httpMethod',
				type: 'options',
				options: [
					{
						name: 'GET',
						value: 'GET',
					},
					{
						name: 'HEAD',
						value: 'HEAD',
					},
					{
						name: 'POST',
						value: 'POST',
					},
				],
				default: 'GET',
				description: 'The HTTP method to liste to.',
			},
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				default: '',
				placeholder: 'webhook',
				required: true,
				description: 'The path to listen to.',
			},
			{
				displayName: 'Response Code',
				name: 'responseCode',
				type: 'number',
				typeOptions: {
					minValue: 100,
					maxValue: 599,
				},
				default: 200,
				description: 'The HTTP Response code to return',
			},
			{
				displayName: 'Response Mode',
				name: 'responseMode',
				type: 'options',
				options: [
					{
						name: 'On Received',
						value: 'onReceived',
						description: 'Returns directly with defined Response Code',
					},
					{
						name: 'Last Node',
						value: 'lastNode',
						description: 'Returns data of the last executed node',
					},
				],
				default: 'onReceived',
				description: 'When and how to respond to the webhook.',
			},
			{
				displayName: 'Response Data',
				name: 'responseData',
				type: 'options',
				displayOptions: {
					show: {
						responseMode: [
							'lastNode',
						],
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
						description: 'Returns the JSON data of the first entry of the last node. Always returns a JSON object.',
					},
					{
						name: 'First Entry Binary',
						value: 'firstEntryBinary',
						description: 'Returns the binary data of the first entry of the last node. Always returns a binary file.',
					},
				],
				default: 'firstEntryJson',
				description: 'What data should be returned. If it should return<br />all the itemsas array or only the first item as object.',
			},
			{
				displayName: 'Property Name',
				name: 'responseBinaryPropertyName',
				type: 'string',
				required: true,
				default: 'data',
				displayOptions: {
					show: {
						responseData: [
							'firstEntryBinary',
						],
					},
				},
				description: 'Name of the binary property to return',
			},
			{
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
								'/httpMethod': [
									'POST',
								],
							},
						},
						default: false,
						description: 'Set to true if webhook will receive binary data.',
					},
					{
						displayName: 'Binary Property',
						name: 'binaryPropertyName',
						type: 'string',
						default: 'data',
						required: true,
						displayOptions: {
							show: {
								binaryData: [
									true,
								],
							},
						},
						description: `Name of the binary property to which to write the data of<br />
									the received file. If the data gets received via "Form-Data Multipart"<br />
									it will be the prefix and a number starting with 0 will be attached to it.`,
					},
					{
						displayName: 'Response Data',
						name: 'responseData',
						type: 'string',
						displayOptions: {
							show: {
								'/responseMode': [
									'onReceived',
								],
							},
						},
						default: '',
						placeholder: 'success',
						description: 'Custom response data to send.',
					},
					{
						displayName: 'Response Content-Type',
						name: 'responseContentType',
						type: 'string',
						displayOptions: {
							show: {
								'/responseData': [
									'firstEntryJson',
								],
								'/responseMode': [
									'lastNode',
								],
							},
						},
						default: '',
						placeholder: 'application/xml',
						description: 'Set a custom content-type to return if another one as the "application/json" should be returned.',
					},
					{
						displayName: 'Response Headers',
						name: 'responseHeaders',
						placeholder: 'Add Response Header',
						description: 'Add headers to the webhook response.',
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
										description: 'Name of the header.',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value of the header.',
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
								'/responseData': [
									'firstEntryJson',
								],
								'/responseMode': [
									'lastNode',
								],
							},
						},
						default: 'data',
						description: 'Name of the property to return the data of instead of the whole JSON.',
					},
					{
						displayName: 'Raw Body',
						name: 'rawBody',
						type: 'boolean',
						displayOptions: {
							hide: {
								binaryData: [
									true,
								],
							},
						},
						default: false,
						description: 'Raw body (binary)',
					},
				],
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const authentication = this.getNodeParameter('authentication') as string;
		const options = this.getNodeParameter('options', {}) as IDataObject;
		const req = this.getRequestObject();
		const resp = this.getResponseObject();
		const headers = this.getHeaderData();
		const realm = 'Webhook';

		if (authentication === 'basicAuth') {
			// Basic authorization is needed to call webhook
			const httpBasicAuth = await this.getCredentials('httpBasicAuth');

			if (httpBasicAuth === undefined || !httpBasicAuth.user || !httpBasicAuth.password) {
				// Data is not defined on node so can not authenticate
				return authorizationError(resp, realm, 500, 'No authentication data defined on node!');
			}

			const basicAuthData = basicAuth(req);

			if (basicAuthData === undefined) {
				// Authorization data is missing
				return authorizationError(resp, realm, 401);
			}

			if (basicAuthData.name !== httpBasicAuth!.user || basicAuthData.pass !== httpBasicAuth!.password) {
				// Provided authentication data is wrong
				return authorizationError(resp, realm, 403);
			}
		} else if (authentication === 'headerAuth') {
			// Special header with value is needed to call webhook
			const httpHeaderAuth = await this.getCredentials('httpHeaderAuth');

			if (httpHeaderAuth === undefined || !httpHeaderAuth.name || !httpHeaderAuth.value) {
				// Data is not defined on node so can not authenticate
				return authorizationError(resp, realm, 500, 'No authentication data defined on node!');
			}
			const headerName = (httpHeaderAuth.name as string).toLowerCase();
			const headerValue = (httpHeaderAuth.value as string);

			if (!headers.hasOwnProperty(headerName) || (headers as IDataObject)[headerName] !== headerValue) {
				// Provided authentication data is wrong
				return authorizationError(resp, realm, 403);
			}
		}

		// @ts-ignore
		const mimeType = headers['content-type'] || 'application/json';
		if (mimeType.includes('multipart/form-data')) {
			const form = new formidable.IncomingForm({});

			return new Promise((resolve, reject) => {

				form.parse(req, async (err, data, files) => {
					const returnItem: INodeExecutionData = {
						binary: {},
						json: {
							headers,
							params: this.getParamsData(),
							query: this.getQueryData(),
							body: data,
						},
					};

					let count = 0;
					for (const file of Object.keys(files)) {

						let binaryPropertyName = file;
						if (options.binaryPropertyName) {
							binaryPropertyName = `${options.binaryPropertyName}${count}`;
						}

						const fileJson = (files[file] as formidable.File).toJSON() as unknown as IDataObject;
						const fileContent = await fs.promises.readFile((files[file] as formidable.File).path);

						returnItem.binary![binaryPropertyName] = await this.helpers.prepareBinaryData(Buffer.from(fileContent), fileJson.name as string, fileJson.type as string);

						count += 1;
					}
					resolve({
						workflowData: [
							[
								returnItem,
							],
						],
					});
				});

			});
		}

		if (options.binaryData === true) {
			return new Promise((resolve, reject) => {
				const binaryPropertyName = options.binaryPropertyName || 'data';
				const data: Buffer[] = [];

				req.on('data', (chunk) => {
					data.push(chunk);
				});

				req.on('end', async () => {
					const returnItem: INodeExecutionData = {
						binary: {},
						json: {
							headers,
							params: this.getParamsData(),
							query: this.getQueryData(),
							body: this.getBodyData(),
						},
					};

					returnItem.binary![binaryPropertyName as string] = await this.helpers.prepareBinaryData(Buffer.concat(data));

					return resolve({
						workflowData: [
							[
								returnItem,
							],
						],
					});
				});

				req.on('error', (error) => {
					throw new NodeOperationError(this.getNode(), error);
				});
			});
		}

		const response: INodeExecutionData = {
			json: {
				headers,
				params: this.getParamsData(),
				query: this.getQueryData(),
				body: this.getBodyData(),
			},
		};

		if (options.rawBody) {
			response.binary = {
				data: {
					// @ts-ignore
					data: req.rawBody.toString(BINARY_ENCODING),
					mimeType,
				},
			};
		}

		let webhookResponse: string | undefined;
		if (options.responseData) {
			webhookResponse = options.responseData as string;
		}

		return {
			webhookResponse,
			workflowData: [
				[
					response,
				],
			],
		};
	}
}
