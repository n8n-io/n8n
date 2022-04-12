import {
	INodeProperties,
	INodeTypeDescription,
} from 'n8n-workflow';

import * as email from './email';
import * as bulkEmail from './bulkEmail';
import * as message from './message';


export const versionDescription: INodeTypeDescription = {
	displayName: 'MailerSend',
	name: 'mailerSend',
	icon: 'file:mailerSend.svg',
	group: ['output'],
	version: 1,
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Consume MailerSend API',
	defaults: {
		name: 'MailerSend',
		description: 'MailerSend API',
	},
	inputs: ['main'],
	outputs: ['main'],
	credentials: [
		{
			name: 'mailerSendApi',
			required: true,
			testedBy: 'mailersendEmailApiTest',
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
					name: 'Email',
					value: 'email',
					description: 'Send an email',
				},
				{
					name: 'Bulk Email',
					value: 'bulkEmail',
					description: 'Multiple asyncronous emails'
				},
				{
					name: 'Messages',
					value: 'message',
				},
				{
					name: 'Domains',
					value: 'domain',
				},
			],
			default: 'email',
			required: true,
			description: 'The resource to consume',
		},
		...email.descriptions,
		...bulkEmail.descriptions,
		...message.descriptions,
	],
};
