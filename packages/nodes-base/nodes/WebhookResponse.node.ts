import {
	BINARY_ENCODING,
} from 'n8n-core';

import {
	IDataObject,
	IExecuteFunctions,
	IN8nHttpFullResponse,
	IN8nHttpResponse,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	NodeOperationError,
} from 'n8n-workflow';

import * as basicAuth from 'basic-auth';
import { json } from 'express';


export class WebhookResponse implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Webhook Response',
		icon: 'file:webhook.svg',
		name: 'webhookResponse',
		group: ['transform'],
		version: 1,
		description: 'Returns data for Webhook',
		defaults: {
			name: 'Webhook Response',
			color: '#885577',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
		],
		properties: [
			{
				displayName: 'Response Data',
				name: 'responseData',
				type: 'options',
				options: [
					{
						name: 'JSON',
						value: 'json',
						description: 'Return JSON data',
					},
					{
						name: 'Binary',
						value: 'binary',
						description: 'Return binary data',
					},
				],
				// TODO: Add string option?
				default: 'json',
				description: 'If binary or JSON data should be returned.',
			},
			{
				displayName: 'Response Body',
				name: 'responseBody',
				type: 'json',
				displayOptions: {
					show: {
						responseData: [
							'json',
						],
					},
				},
				default: '',
				description: 'The HTTP Response data',
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
							'binary',
						],
					},
				},
				description: 'Name of the binary property to return',
			},
			{
				displayName: 'Response Headers',
				name: 'responseHeaders',
				type: 'json',
				default: '',
				description: 'The HTTP Response headers',
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
		],
	};

	execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		console.log('ccc1');
		const items = this.getInputData();

		// TODO: Currently works only with "queue" mode yet
		// TODO: Return binary data does still not work great

		//  curl http://localhost:5678/webhook/webhook-return-node
		//  curl -v http://localhost:5678/webhook/webhook-return-node

		const responseCode = this.getNodeParameter('responseCode', 0) as number;
		const responseHeaders = this.getNodeParameter('responseHeaders', 0) as string;
		const responseData = this.getNodeParameter('responseData', 0) as string;

		// TODO: Check if it works with empty, should also allow setting one key at a time
		let headers = JSON.parse(responseHeaders);

		let responseBody: IN8nHttpResponse;
		if (responseData === 'json') {
			responseBody = JSON.parse(this.getNodeParameter('responseBody', 0) as string);
		} else if (responseData === 'binary') {
			const item = this.getInputData()[0];

			if (item.binary === undefined) {
				throw new NodeOperationError(this.getNode(), 'No binary data exists on the first item!');
			}

			const responseBinaryPropertyName = this.getNodeParameter('responseBinaryPropertyName', 0) as string;

			if (item.binary[responseBinaryPropertyName] === undefined) {
				throw new NodeOperationError(this.getNode(), `No binary data property "${responseBinaryPropertyName}" does not exists on item!`);
			}

			responseBody = Buffer.from(item.binary[responseBinaryPropertyName].data, BINARY_ENCODING);
		} else {
			throw new NodeOperationError(this.getNode(), `The Response Data option "${responseData}" is not supported!`);
		}

		const response: IN8nHttpFullResponse = {
			body: responseBody,
			headers,
			statusCode: responseCode,
			// TODO: Check why statusMessage is required, does not make sense
			statusMessage: 'blub',
		};

		this.sendWebhookReponse(response);

		return this.prepareOutputData(items);
	}

}
