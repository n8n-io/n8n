import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';

import {
	accountOperations,
	smsFields,
	smsOperations,
	whatsAppFields,
	whatsAppOperations,
} from './descriptions';

export class Infobip implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Infobip',
		name: 'infobip',
		icon: 'file:infobip.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Send SMS and WhatsApp messages with Infobip',
		defaults: {
			name: 'Infobip',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'infobipApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{ $credentials.baseUrl.replace(new RegExp("/$"), "") }}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Account',
						value: 'account',
					},
					{
						name: 'SMS',
						value: 'sms',
					},
					{
						name: 'WhatsApp',
						value: 'whatsApp',
					},
				],
				default: 'sms',
			},
			...accountOperations,
			...smsOperations,
			...smsFields,
			...whatsAppOperations,
			...whatsAppFields,
		],
	};
}
