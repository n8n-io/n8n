import {
	IHookFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	INodeExecutionData,
	NodeOperationError
} from 'n8n-workflow';

// import {
// 	WikimationApiRequest,
// } from './GenericFunctions';
//
// import {
// 	snakeCase,
// } from 'change-case';

import * as basicAuth from 'basic-auth';

import { Response } from 'express';

import * as fs from 'fs';

import * as formidable from 'formidable';

import * as isbot from 'isbot';

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

export class WikiPageSavedTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WikiPageSaved Trigger',
		name: 'wikiPageSavedTrigger',
		icon: 'file:wiki.png',
		group: ['trigger'],
		version: 1,
		description: 'Handle events when a wiki page is changed via webhooks',
		defaults: {
			name: 'WikiPageSaved Trigger',
			color: '#6ad7b9',
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
				httpMethod: 'POST',
				responseMode: 'onReceived',
				isFullPath: true,
				path: 'wikiPageSaved'
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
						name: 'When last node finishes',
						value: 'lastNode',
						description: 'Returns data of the last-executed node',
					},
					{
						name: 'Using \'Respond to Webhook\' node',
						value: 'responseNode',
						description: 'Response defined in that node',
					},
				],
				default: 'onReceived',
				description: 'When and how to respond to the webhook.',
			},
			{
				displayName: 'Insert a \'Respond to Webhook\' node to control when and how you respond. <a href="https://docs.n8n.io/nodes/n8n-nodes-base.respondToWebhook" target="_blank">More details</a>',
				name: 'webhookNotice',
				type: 'notice',
				displayOptions: {
					show: {
						responseMode: [
							'responseNode',
						],
					},
				},
				default: '',
			},
			{
				displayName: 'Response Code',
				name: 'responseCode',
				type: 'number',
				displayOptions: {
					hide: {
						responseMode: [
							'responseNode',
						],
					},
				},
				typeOptions: {
					minValue: 100,
					maxValue: 599,
				},
				default: 200,
				description: 'The HTTP Response code to return',
			},
		],

	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const authentication = this.getNodeParameter('authentication') as string;
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
		if (mimeType.includes('multipart/form-data')){
			// @ts-ignore
			const form = new formidable.IncomingForm({ multiples: true });

			return new Promise((resolve, reject) => {

				form.parse(req, async (err, data, files) => {
					const returnItem: INodeExecutionData = {
						binary: {},
						json: {
							headers,
							body: data,
						},
					};

					let count = 0;
					for (const xfile of Object.keys(files)) {
						const processFiles: formidable.File[] = [];
						let multiFile = false;
						if (Array.isArray(files[xfile])) {
							processFiles.push(...files[xfile] as formidable.File[]);
							multiFile = true;
						} else {
							processFiles.push(files[xfile] as formidable.File);
						}

						let fileCount = 0;
						for (const file of processFiles) {
							let binaryPropertyName = xfile;
							if (binaryPropertyName.endsWith('[]')) {
								binaryPropertyName = binaryPropertyName.slice(0, -2);
							}
							if (multiFile === true) {
								binaryPropertyName += fileCount++;
							}

							const fileJson = file.toJSON() as unknown as IDataObject;
							const fileContent = await fs.promises.readFile(file.path);

							returnItem.binary![binaryPropertyName] = await this.helpers.prepareBinaryData(Buffer.from(fileContent), fileJson.name as string, fileJson.type as string);

							count += 1;
						}
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

		const response: INodeExecutionData = {
			json: {
				headers,
				body: this.getBodyData(),
			},
		};

		return {
			workflowData: [
				[
					response,
				]
			],
		};
	}
}
