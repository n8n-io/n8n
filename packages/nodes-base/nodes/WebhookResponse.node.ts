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
	NodeOperationError,
} from 'n8n-workflow';

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
				displayName: 'Response Data',
				name: 'responseData',
				type: 'options',
				options: [
					{
						name: 'None',
						value: 'none',
						description: 'Return no data',
					},
					{
						name: 'Binary',
						value: 'binary',
						description: 'Return binary data',
					},
					{
						name: 'First Incoming Item',
						value: 'firstIncomingItem',
						description: 'Return data of first incoming item',
					},
					{
						name: 'JSON',
						value: 'json',
						description: 'Return JSON data',
					},
					{
						name: 'Text',
						value: 'text',
						description: 'Return a text',
					},
				],
				default: 'json',
				description: 'If binary or JSON data should be returned.',
			},
			{
				displayName: 'This node will only run for the first item in the input data',
				name: 'webhookNotice',
				type: 'notice',
				displayOptions: {
					show: {
						responseData: [
							'json',
						],
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
						responseData: [
							'json',
						],
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
						responseData: [
							'text',
						],
					},
				},
				default: '',
				placeholder: 'Workflow started',
				description: 'The HTTP Response text data',
			},
			{
				displayName: 'Response Data Source',
				name: 'responseDataSource',
				type: 'options',
				displayOptions: {
					show: {
						responseData: [
							'binary',
						],
					},
				},
				options: [
					{
						name: 'Choose automatically from input',
						value: 'automatically',
						description: 'Use if input data will contain a single piece of binary data',
					},
					{
						name: 'Specify myself',
						value: 'set',
						description: 'Enter the name of the input field the binary data will be in',
					},
				],
				default: 'automatically',
			},
			{
				displayName: 'Input field name',
				name: 'inputFieldName',
				type: 'string',
				required: true,
				default: 'data',
				displayOptions: {
					show: {
						responseData: [
							'binary',
						],
						responseDataSource: [
							'set',
						],
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
				],
			},
		],
	};

	execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const responseCode = this.getNodeParameter('responseCode', 0) as number;
		const responseData = this.getNodeParameter('responseData', 0) as string;
		const options = this.getNodeParameter('options', 0, {}) as IDataObject;

		let headers = {} as IDataObject;
		if (options.responseHeaders) {
			for (const header of (options.responseHeaders as IDataObject).entries as IDataObject[]) {
				if (typeof header.name !== 'string') {
					header.name = header.name?.toString();
				}
				headers[header.name?.toLowerCase() as string] = header.value?.toString();
			}
		}

		let responseBody: IN8nHttpResponse;
		if (responseData === 'json') {
			const responseBodyParameter = this.getNodeParameter('responseBody', 0) as string;
			if (responseBodyParameter) {
				responseBody = JSON.parse(responseBodyParameter);
			}
		} else if (responseData === 'firstIncomingItem') {
			responseBody = items[0].json;
		} else if (responseData === 'text') {
			responseBody = this.getNodeParameter('responseBody', 0) as string;
		} else if (responseData === 'binary') {
			const item = this.getInputData()[0];

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

			const binaryData = item.binary[responseBinaryPropertyName];

			if (binaryData === undefined) {
				throw new NodeOperationError(this.getNode(), `No binary data property "${responseBinaryPropertyName}" does not exists on item!`);
			}

			if (headers['content-type']) {
				headers['content-type'] = binaryData.mimeType;
			}
			responseBody = Buffer.from(binaryData.data, BINARY_ENCODING);
		} else if (responseData !== 'none') {
			throw new NodeOperationError(this.getNode(), `The Response Data option "${responseData}" is not supported!`);
		}

		const response: IN8nHttpFullResponse = {
			body: responseBody,
			headers,
			statusCode: responseCode,
		};

		this.sendResponse(response);

		return this.prepareOutputData(items);
	}

}
