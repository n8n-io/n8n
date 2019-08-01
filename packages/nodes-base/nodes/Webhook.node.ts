import {
	IWebhookFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeTypeDescription,
	INodeType,
	IWebhookResonseData,
} from 'n8n-workflow';

import * as basicAuth from 'basic-auth';

import { Response } from 'express';

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
		changesIncomingData: {
			value: false,
		},
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
				reponseMode: '={{$parameter["reponseMode"]}}',
				reponseData: '={{$parameter["reponseData"]}}',
				responseBinaryPropertyName: '={{$parameter["responseBinaryPropertyName"]}}',
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
						value: 'basicAuth'
					},
					{
						name: 'Header Auth',
						value: 'headerAuth'
					},
					{
						name: 'None',
						value: 'none'
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
				placeholder: '',
				required: true,
				description: 'The path to listen to',
			},
			{
				displayName: 'Reponse Mode',
				name: 'reponseMode',
				type: 'options',
				options: [
					{
						name: 'On Received',
						value: 'onReceived',
						description: 'Returns directly with Reponse Code 200',
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
				displayName: 'Reponse Data',
				name: 'reponseData',
				type: 'options',
				displayOptions: {
					show: {
						reponseMode: [
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
						reponseData: [
							'firstEntryBinary'
						],
					},
				},
				description: 'Name of the binary property to return',
			},
		],
	};


	async webhook(this: IWebhookFunctions): Promise<IWebhookResonseData> {
		const authentication = this.getNodeParameter('authentication', 0) as string;
		const req = this.getRequestObject();
		const resp = this.getResponseObject();
		const headers = this.getHeaderData();
		const realm = 'Webhook';

		if (authentication === 'basicAuth') {
			// Basic authorization is needed to call webhook
			const httpBasicAuth = this.getCredentials('httpBasicAuth');

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
			const httpHeaderAuth = this.getCredentials('httpHeaderAuth');

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

		const returnData: IDataObject[] = [];

		returnData.push(
			{
				body: this.getBodyData(),
				headers,
				query: this.getQueryData(),
			}
		);

		return {
			workflowData: [
				this.helpers.returnJsonArray(returnData)
			],
		};
	}
}
