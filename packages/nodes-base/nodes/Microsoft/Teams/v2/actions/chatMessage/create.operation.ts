import type { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import {
	adaptiveCardField,
	chatRLC,
	includeLinkToWorkflowOption,
	mentionPlacementOption,
	mentionsField,
} from '../../descriptions';
import { buildAdaptiveCardMessage } from '../../helpers/adaptiveCard';
import { prepareMessage, resolveMentions } from '../../helpers/utils';
import { buildTeamsPath, microsoftApiRequest, SP_HIDE } from '../../transport';

const properties: INodeProperties[] = [
	chatRLC,
	{
		displayName: 'Content Type',
		name: 'contentType',
		required: true,
		type: 'options',
		options: [
			{
				name: 'Text',
				value: 'text',
			},
			{
				name: 'HTML',
				value: 'html',
			},
			{
				name: 'Adaptive Card',
				value: 'adaptiveCard',
			},
		],
		default: 'text',
		description: 'Whether the message is plain text, HTML or an Adaptive Card',
	},
	{
		displayName: 'Message',
		name: 'message',
		required: true,
		type: 'string',
		default: '',
		description: 'The content of the message to be sent',
		typeOptions: {
			rows: 2,
		},
		displayOptions: {
			hide: {
				contentType: ['adaptiveCard'],
			},
		},
	},
	adaptiveCardField,
	{
		...mentionsField,
		displayOptions: {
			hide: {
				contentType: ['adaptiveCard'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		description: 'Other options to set',
		placeholder: 'Add option',
		displayOptions: {
			hide: {
				contentType: ['adaptiveCard'],
			},
		},
		options: [
			{
				...includeLinkToWorkflowOption,
				displayOptions: {
					hide: {
						'/contentType': ['adaptiveCard'],
					},
				},
			},
			{
				...mentionPlacementOption,
				displayOptions: {
					hide: {
						'/contentType': ['adaptiveCard'],
					},
				},
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['chatMessage'],
		operation: ['create'],
	},
	hide: {
		...SP_HIDE,
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number, instanceId: string) {
	// https://docs.microsoft.com/en-us/graph/api/channel-post-messages?view=graph-rest-1.0&tabs=http

	const chatId = this.getNodeParameter('chatId', i, '', { extractValue: true }) as string;
	const contentType = this.getNodeParameter('contentType', i) as string;
	const options = this.getNodeParameter('options', i, {});

	// Built before the mentions are resolved, so a malformed chat ID fails without spending a
	// Graph call on `GET /users/{id}` first.
	const endpoint = buildTeamsPath.call(this, ['/v1.0/chats/', { id: chatId }, '/messages']);

	if (contentType === 'adaptiveCard') {
		const body = buildAdaptiveCardMessage.call(this, this.getNodeParameter('adaptiveCard', i), i);
		return await microsoftApiRequest.call(this, 'POST', endpoint, body);
	}

	const message = this.getNodeParameter('message', i) as string;
	const includeLinkToWorkflow = options.includeLinkToWorkflow !== false;

	const mentions = await resolveMentions.call(this, i);

	const body: IDataObject = prepareMessage.call(
		this,
		message,
		contentType,
		includeLinkToWorkflow,
		instanceId,
		mentions,
		options.mentionPlacement === 'end' ? 'end' : 'start',
	);

	return await microsoftApiRequest.call(this, 'POST', endpoint, body);
}
