import type { IExecuteFunctions } from 'n8n-core';

import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { smsFields, smsOperations } from './SmsDescription';

import { mmsFields, mmsOperations } from './MmsDescription';

import { callFields, callOperations } from './CallDescription';

import { plivoApiRequest } from './GenericFunctions';

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
				noDataExpression: true,
				options: [
					{
						name: 'Call',
						value: 'call',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-resource-with-plural-option
						name: 'MMS',
						value: 'mms',
					},
					{
						name: 'SMS',
						value: 'sms',
					},
				],
				default: 'sms',
				required: true,
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

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < items.length; i++) {
			let responseData;

			if (resource === 'sms') {
				// *********************************************************************
				//                                sms
				// *********************************************************************

				if (operation === 'send') {
					// ----------------------------------
					//          sms: send
					// ----------------------------------

					const body = {
						src: this.getNodeParameter('from', i) as string,
						dst: this.getNodeParameter('to', i) as string,
						text: this.getNodeParameter('message', i) as string,
					} as IDataObject;

					responseData = await plivoApiRequest.call(this, 'POST', '/Message', body);
				}
			} else if (resource === 'call') {
				// *********************************************************************
				//                                call
				// *********************************************************************

				if (operation === 'make') {
					// ----------------------------------
					//            call: make
					// ----------------------------------

					// https://www.plivo.com/docs/voice/api/call#make-a-call

					const body = {
						from: this.getNodeParameter('from', i) as string,
						to: this.getNodeParameter('to', i) as string,
						answer_url: this.getNodeParameter('answer_url', i) as string,
						answer_method: this.getNodeParameter('answer_method', i) as string,
					} as IDataObject;

					responseData = await plivoApiRequest.call(this, 'POST', '/Call', body);
				}
			} else if (resource === 'mms') {
				// *********************************************************************
				//                                mms
				// *********************************************************************

				if (operation === 'send') {
					// ----------------------------------
					//            mss: send
					// ----------------------------------

					// https://www.plivo.com/docs/sms/api/message#send-a-message

					const body = {
						src: this.getNodeParameter('from', i) as string,
						dst: this.getNodeParameter('to', i) as string,
						text: this.getNodeParameter('message', i) as string,
						type: 'mms',
						media_urls: this.getNodeParameter('media_urls', i) as string,
					} as IDataObject;

					responseData = await plivoApiRequest.call(this, 'POST', '/Message', body);
				}
			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
