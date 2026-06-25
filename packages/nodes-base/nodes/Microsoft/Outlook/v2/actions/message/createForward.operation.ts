import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { messageRLC } from '../../descriptions';
import { microsoftApiRequest } from '../../transport';

export const properties: INodeProperties[] = [
	messageRLC,
	{
		displayName: 'To Recipients',
		name: 'toRecipients',
		type: 'string',
		description: 'Comma-separated list of email addresses of recipients',
		default: '',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['createForward'],
			},
		},
	},
	{
		displayName: 'Message Options',
		name: 'messageOptions',
		type: 'options',
		options: [
			{
				name: 'Comment',
				value: 'comment',
			},
			{
				name: 'Body',
				value: 'body',
			},
		],
		default: 'comment',
		description: 'Choose between adding a comment or setting the full message body',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['createForward'],
			},
		},
	},
	{
		displayName: 'Comment',
		name: 'comment',
		type: 'string',
		default: '',
		description: 'A comment to include. Set a comment or body, but not both.',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['createForward'],
				messageOptions: ['comment'],
			},
		},
	},
	{
		displayName: 'Body',
		name: 'body',
		type: 'string',
		default: '',
		description: 'The body of the message. Set a comment or body, but not both.',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['createForward'],
				messageOptions: ['body'],
			},
		},
	},
	{
		displayName: 'Message Type',
		name: 'bodyContentType',
		description: 'Message body content type',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['createForward'],
				messageOptions: ['body'],
			},
		},
		type: 'options',
		options: [
			{
				name: 'HTML',
				value: 'html',
			},
			{
				name: 'Text',
				value: 'Text',
			},
		],
		default: 'html',
	},
];

const displayOptions = {
	show: {
		resource: ['message'],
		operation: ['createForward'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, index: number) {
	const messageId = this.getNodeParameter('messageId', index, undefined, {
		extractValue: true,
	}) as string;

	const toRecipients = (this.getNodeParameter('toRecipients', index, '') as string)
		.split(',')
		.map((email) => email.trim())
		.filter((email) => !!email);
	const messageOptions = this.getNodeParameter('messageOptions', index) as string;

	const body: {
		toRecipients: Array<{ emailAddress: { address: string } }>;
		comment?: string;
		message?: { body: { content: string; contentType: string } };
	} = {
		toRecipients: toRecipients.map((email) => ({ emailAddress: { address: email } })),
	};

	if (messageOptions === 'comment') {
		const comment = this.getNodeParameter('comment', index, '') as string;
		body.comment = comment;
	} else {
		const messageBody = this.getNodeParameter('body', index, '') as string;
		const messageBodyContentType = this.getNodeParameter('bodyContentType', index) as string;
		body.message = {
			body: {
				content: messageBody,
				contentType: messageBodyContentType,
			},
		};
	}

	const responseData = await microsoftApiRequest.call(
		this,
		'POST',
		`/messages/${messageId}/createForward`,
		body,
	);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData as IDataObject),
		{ itemData: { item: index } },
	);

	return executionData;
}
