import { IExecuteFunctions } from 'n8n-core';

import {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeOperationError,
} from 'n8n-workflow';

import { moceanApiRequest } from './GenericFunctions';

export class Mocean implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mocean',
		name: 'mocean',
		subtitle: `={{$parameter["operation"] + ": " + $parameter["resource"]}}`,
		icon: 'file:mocean.svg',
		group: ['transform'],
		version: 1,
		description: 'Send SMS and voice messages via Mocean',
		defaults: {
			name: 'Mocean',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'moceanApi',
				required: true,
				testedBy: 'moceanApiTest',
			},
		],
		properties: [
			// Node properties which the user gets displayed and
			// can change on the node.
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'SMS',
						value: 'sms',
					},
					{
						name: 'Voice',
						value: 'voice',
					},
				],
				default: 'sms',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['sms', 'voice'],
					},
				},
				options: [
					{
						name: 'Send',
						value: 'send',
						description: 'Send SMS/Voice message',
						action: 'Send an SMS',
					},
				],
				default: 'send',
			},
			{
				displayName: 'From',
				name: 'from',
				type: 'string',
				default: '',
				placeholder: 'Sender Number',
				required: true,
				displayOptions: {
					show: {
						operation: ['send'],
						resource: ['sms', 'voice'],
					},
				},
				description: 'Number to which to send the message',
			},

			{
				displayName: 'To',
				name: 'to',
				type: 'string',
				default: '',
				placeholder: 'Receipient number',
				required: true,
				displayOptions: {
					show: {
						operation: ['send'],
						resource: ['sms', 'voice'],
					},
				},
				description: 'Number from which to send the message',
			},

			{
				displayName: 'Language',
				name: 'language',
				type: 'options',
				options: [
					{
						name: 'Chinese Mandarin (China)',
						value: 'cmn-CN',
					},
					{
						name: 'English (United Kingdom)',
						value: 'en-GB',
					},
					{
						name: 'English (United States)',
						value: 'en-US',
					},
					{
						name: 'Japanese (Japan)',
						value: 'ja-JP',
					},
					{
						name: 'Korean (Korea)',
						value: 'ko-KR',
					},
				],
				displayOptions: {
					show: {
						operation: ['send'],
						resource: ['voice'],
					},
				},
				default: 'en-US',
			},

			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				placeholder: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['send'],
						resource: ['sms', 'voice'],
					},
				},
				description: 'Message to send',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: ['send'],
						resource: ['sms'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Delivery Report URL',
						name: 'dlrUrl',
						type: 'string',
						default: '',
						placeholder: '',
					},
				],
			},
		],
	};

	methods = {
		credentialTest: {
			async moceanApiTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data;
				const query: IDataObject = {};
				query['mocean-api-key'] = credentials!['mocean-api-key'];
				query['mocean-api-secret'] = credentials!['mocean-api-secret'];

				const options = {
					method: 'GET',
					qs: query,
					uri: `https://rest.moceanapi.com/rest/2/account/balance`,
					json: true,
				};
				try {
					await this.helpers.request!(options);
				} catch (error) {
					return {
						status: 'Error',
						message: `Connection details not valid: ${(error as JsonObject).message}`,
					};
				}
				return {
					status: 'OK',
					message: 'Authentication successful!',
				};
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		let endpoint: string;
		let operation: string;
		let requestMethod: string;
		let resource: string;
		let text: string;
		let dlrUrl: string;
		let dataKey: string;
		// For Post
		let body: IDataObject;
		// For Query string
		let qs: IDataObject;

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			body = {};
			qs = {};
			try {
				resource = this.getNodeParameter('resource', itemIndex, '') as string;
				operation = this.getNodeParameter('operation', itemIndex, '') as string;
				text = this.getNodeParameter('message', itemIndex, '') as string;
				requestMethod = 'POST';
				body['mocean-from'] = this.getNodeParameter('from', itemIndex, '') as string;
				body['mocean-to'] = this.getNodeParameter('to', itemIndex, '') as string;

				if (resource === 'voice') {
					const language: string = this.getNodeParameter('language', itemIndex) as string;
					const command = [
						{
							action: 'say',
							language,
							text,
						},
					];

					dataKey = 'voice';
					body['mocean-command'] = JSON.stringify(command);
					endpoint = '/rest/2/voice/dial';
				} else if (resource === 'sms') {
					dlrUrl = this.getNodeParameter('options.dlrUrl', itemIndex, '') as string;
					dataKey = 'messages';
					body['mocean-text'] = text;
					if (dlrUrl !== '') {
						body['mocean-dlr-url'] = dlrUrl;
						body['mocean-dlr-mask'] = '1';
					}
					endpoint = '/rest/2/sms';
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown resource ${resource}`, {
						itemIndex,
					});
				}

				if (operation === 'send') {
					const responseData = await moceanApiRequest.call(this, requestMethod, endpoint, body, qs);

					for (const item of responseData[dataKey] as IDataObject[]) {
						item.type = resource;
						returnData.push(item);
					}
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown operation ${operation}`, {
						itemIndex,
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: (error as JsonObject).message });
					continue;
				}
				throw error;
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
