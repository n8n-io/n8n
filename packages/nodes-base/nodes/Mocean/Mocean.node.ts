import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import {moceanApiRequest} from './GenericFunctions';


export class Mocean implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mocean',
		name: 'mocean',
		icon: 'file:mocean.png',
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
			},
		],
		properties: [
			// Node properties which the user gets displayed and
			// can change on the node.
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options:[
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
				displayOptions: {
					show: {
						resource: [
							'sms',
							'voice',
						],
					},
				},
				options: [
					{
						name: 'Send',
						value: 'send',
						description: 'Send SMS/Voice message',
					},
				],
				default: 'send',
				description: 'The operation to perform.',
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
						operation: [
							'send',
						],
						resource: [
							'sms',
							'voice',
						],
					},
				},
				description: 'The number to which to send the message',
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
						operation: [
							'send',
						],
						resource: [
							'sms',
							'voice',
						],
					},
				},
				description: 'The number from which to send the message',
			},

			{
				displayName: 'Language',
				name: 'language',
				type: 'options',
				options:[
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
						operation: [
							'send',
						],
						resource: [
							'voice',
						],
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
						operation: [
							'send',
						],
						resource: [
							'sms',
							'voice',
						],
					},
				},
				description: 'The message to send',
			},
		],

	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		let endpoint: string;
		let operation: string;
		let requesetMethod: string;
		let resource: string;
		let text: string;
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
				operation = this.getNodeParameter('operation',itemIndex,'') as string;
				text = this.getNodeParameter('message', itemIndex, '') as string;
				requesetMethod = 'POST';
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
				} else if(resource === 'sms') {
					dataKey = 'messages';
					body['mocean-text'] = text;
					endpoint = '/rest/2/sms';
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown resource ${resource}`);
				}

				if (operation === 'send') {
					const responseData = await moceanApiRequest.call(this,requesetMethod,endpoint,body,qs);

					for (const item of responseData[dataKey] as IDataObject[]) {
						item.type = resource;
						returnData.push(item);
					}

				} else {
					throw new NodeOperationError(this.getNode(), `Unknown operation ${operation}`);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
