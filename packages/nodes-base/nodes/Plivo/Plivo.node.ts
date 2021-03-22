import {
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	smsFields,
	smsOperations,
} from './SmsDescription';

import {
	mmsFields,
	mmsOperations,
} from './MmsDescription';

import {
	callFields,
	callOperations,
} from './CallDescription';

import {
	plivoApiRequest,
} from './GenericFunctions';
import { stringify } from 'lossless-json';

export class Plivo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Plivo',
		name: 'plivo',
		icon: 'file:plivo.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Send SMS/MMS messages or make phone calls',
		defaults: {
			name: 'Plivo',
			color: '#43A046',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'plivoApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'SMS',
						value: 'sms',
					},
					{
						name: 'MMS',
						value: 'mms',
					},
					{
						name: 'Call',
						value: 'call',
					},
				],
				default: 'sms',
				required: true,
				description: 'The resource to operate on.',
			},
			...smsOperations,
			...smsFields,
			...mmsOperations,
			...mmsFields,
			...callOperations,
			...callFields,
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		let operation: string;
		let resource: string;

		// For Post
		let body: IDataObject;
		// For Query string
		let queryString: IDataObject;

		let requestMethod: string;
		let endpoint: string;

		for (let i = 0; i < items.length; i++) {
			requestMethod = 'GET';
			endpoint = '';
			body = {};
			queryString = {};

			resource = this.getNodeParameter('resource', i) as string;
			operation = this.getNodeParameter('operation', i) as string;

			if (resource === 'sms') {
				if (operation === 'send sms') {
					requestMethod = 'POST';
					endpoint = '/Message/';

					body.src = this.getNodeParameter('from', i) as string;
					body.dst = this.getNodeParameter('to', i) as string;
                    body.text = this.getNodeParameter('message', i) as string;

				} else {
					throw new Error(`The operation "${operation}" is not known!`);
				}
			} else if (resource === 'call') {
				if (operation === 'make a call') {
					requestMethod = 'POST';
					endpoint = '/Call/';

					body.from = this.getNodeParameter('from', i) as string;
					body.to = this.getNodeParameter('to', i) as string;
					body.answer_url = this.getNodeParameter('answer_url', i) as string;
					body.answer_method = this.getNodeParameter('answer_method', i) as string;

				} else {
					throw new Error(`The operation "${operation}" is not known!`);
				}
			} else if (resource === 'mms') {
				if (operation === 'send mms') {
					requestMethod = 'POST';
					endpoint = '/Message/';

					body.src = this.getNodeParameter('from', i) as string;
					body.dst = this.getNodeParameter('to', i) as string;
					body.text = this.getNodeParameter('message', i) as string;
					body.type = 'mms';
					body.media_urls = [this.getNodeParameter('media_urls', i) as string].toString();
					console.log(body);

				} else {
					throw new Error(`The operation "${operation}" is not known!`);
				}
			} else {
				throw new Error(`The resource "${resource}" is not known!`);
			}

			const responseData = await plivoApiRequest.call(this, requestMethod, endpoint, body, queryString);
			console.log(responseData);
			returnData.push(responseData as IDataObject);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
