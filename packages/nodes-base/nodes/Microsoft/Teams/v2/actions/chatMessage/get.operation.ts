import { type INodeProperties, type IExecuteFunctions, NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { chatRLC } from '../../descriptions';
import { buildTeamsPath, microsoftApiRequest, SP_HIDE } from '../../transport';
import { throwIfChatUnsupported } from './sharedGuard';

const properties: INodeProperties[] = [
	chatRLC,
	{
		displayName: 'Message ID',
		name: 'messageId',
		required: true,
		type: 'string',
		default: '',
		placeholder: 'e.g. 1673355049064',
		description: 'The ID of the message to retrieve',
	},
];

const displayOptions = {
	show: {
		resource: ['chatMessage'],
		operation: ['get'],
	},
	hide: {
		...SP_HIDE,
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	// https://docs.microsoft.com/en-us/graph/api/chat-list-messages?view=graph-rest-1.0&tabs=http

	// App-only Graph cannot read chats; fail before the request (and before the
	// catch below, so the static SP message is surfaced, not the generic one).
	throwIfChatUnsupported.call(this);

	const chatId = this.getNodeParameter('chatId', i, '', { extractValue: true }) as string;
	const messageId = this.getNodeParameter('messageId', i) as string;
	// Built outside the try so an invalid id surfaces as its own validation
	// error instead of being replaced by the not-found message below
	const endpoint = buildTeamsPath.call(this, [
		'/v1.0/chats/',
		{ id: chatId },
		'/messages/',
		{ id: messageId },
	]);

	try {
		return await microsoftApiRequest.call(this, 'GET', endpoint);
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			"The message you are trying to get doesn't exist",
			{
				description: "Check that the 'Message ID' parameter is correctly set",
			},
		);
	}
}
