import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { chainId, recipientPath, requiredText, rewriteSendError, topicLink } from './shared';
import { userRLC } from '../../descriptions';
import { microsoftApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		...userRLC,
		displayName: 'Recipient',
		name: 'recipientId',
		description:
			'The user who receives the notification in the Teams activity feed. Select the user from the list, or enter the user ID or user principal name. Guest users must be given by their object ID.',
	},
	{
		displayName: 'Headline',
		name: 'headline',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. Approval needed',
		description: 'The bold first line of the notification. Keep it short so it fits on one line.',
	},
	{
		displayName: 'Preview Text',
		name: 'previewText',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. Order #4711 needs approval',
		description: 'The second line of the notification. Teams shows the first 150 characters.',
	},
	{
		displayName: 'Topic',
		name: 'topic',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. n8n workflow run',
		description:
			'The third line of the notification, shown in grey. Name the item that the notification is about, for example the workflow or the order.',
	},
	{
		displayName: 'Topic Link',
		name: 'topicLink',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. https://teams.microsoft.com/l/chat/0/0?users=someone@contoso.com',
		description:
			'The Microsoft Teams link that opens when the user selects the notification. It must be an https link on a Microsoft Teams domain with a path that starts with /l/, for example a chat, channel, or meeting deep link. Microsoft Graph rejects links to n8n or to other websites.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Chain ID',
				name: 'chainId',
				type: 'number',
				default: 0,
				typeOptions: {
					minValue: 0,
				},
				description:
					'A number that links related notifications. A new notification with the same Chain ID replaces the earlier one in the activity feed. Leave at 0 to send the notification without a chain.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['activityNotification'],
		operation: ['send'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	const endpoint = recipientPath.call(this, i);
	const headline = requiredText.call(this, 'headline', i, 'Headline');
	const preview = requiredText.call(this, 'previewText', i, 'Preview Text');
	const topic = requiredText.call(this, 'topic', i, 'Topic');
	const webUrl = topicLink.call(this, i);
	const chain = chainId.call(this, i);

	const body: IDataObject = {
		topic: { source: 'text', value: topic, webUrl },
		activityType: 'systemDefault',
		previewText: { content: preview },
		templateParameters: [{ name: 'systemDefaultText', value: headline }],
	};
	if (chain !== undefined) body.chainId = chain;

	try {
		await microsoftApiRequest.call(this, 'POST', endpoint, body);
		return { success: true };
	} catch (error) {
		throw rewriteSendError.call(this, error, i);
	}
}
