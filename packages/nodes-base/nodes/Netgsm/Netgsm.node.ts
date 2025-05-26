import {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	IHttpRequestMethods,
	NodeConnectionTypes,
	IDataObject,
} from 'n8n-workflow';

import { netgsmApiRequest } from './GenericFunctions';

export class Netgsm implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Netgsm',
		name: 'netgsm',
		icon: 'file:netgsm.svg',
		group: ['transform'],
		version: 1,
		description: 'Send SMS via Netgsm',
		defaults: {
			name: 'Netgsm',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'netgsmApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Phone Number',
				name: 'phone',
				type: 'string',
				default: '',
				placeholder: '905XXXXXXXXX',
				required: true,
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				required: true,
			},
			{
				displayName: 'Message Header',
				name: 'msgheader',
				type: 'string',
				default: '',
				required: true,
			},
		],
	};

	async execute(this: IExecuteFunctions) {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		let requestMethod: IHttpRequestMethods;
		let endpoint: string;

		const messages: { no: string; msg: string }[] = [];
		let header: string;

		for (let i = 0; i < items.length; i++) {
			const phone = this.getNodeParameter('phone', i) as string;
			const message = this.getNodeParameter('message', i) as string;
			header = this.getNodeParameter('msgheader', 0) as string;
			messages.push({ no: phone, msg: message });
		}

		let body = {
			msgheader: header,
			encoding: 'TR',
			messages: messages,
			appname: 'n8n-integration',
		};

		try {
			endpoint = 'send';
			requestMethod = 'POST';
			const responseData = await netgsmApiRequest.call(this, requestMethod, endpoint, body);
			returnData.push(responseData);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({ error: error.message });
			}
			throw error;
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
