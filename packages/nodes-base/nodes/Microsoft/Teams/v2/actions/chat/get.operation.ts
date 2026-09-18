import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { throwIfChatUnsupported } from './sharedGuard';
import { chatRLC } from '../../descriptions';
import { buildTeamsPath, microsoftApiRequest, rewriteNotFound, SP_HIDE } from '../../transport';

const properties: INodeProperties[] = [chatRLC];

const displayOptions = {
	show: {
		resource: ['chat'],
		operation: ['get'],
	},
	hide: {
		...SP_HIDE,
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	// https://learn.microsoft.com/en-us/graph/api/chat-get?view=graph-rest-1.0

	// App-only Graph cannot read chats; fail before any request.
	throwIfChatUnsupported.call(this);

	const chatId = this.getNodeParameter('chatId', i, '', { extractValue: true }) as string;
	// Kept outside the try for clarity: it is a validation step, not a request.
	const endpoint = buildTeamsPath.call(this, ['/v1.0/chats/', { id: chatId }]);

	try {
		return await microsoftApiRequest.call(this, 'GET', endpoint);
	} catch (error) {
		// The transport already rewrites a Graph `NotFound` to "Chat not found" under
		// OAuth2 (utils/microsoft/transport.ts). This overlaps it on purpose: it words
		// the message for this operation and adds the hint. Neither is redundant.
		throw rewriteNotFound.call(
			this,
			error,
			"The chat you are trying to get doesn't exist",
			'Select the chat from the list, or check that the chat ID is correct and that you are a member of the chat',
		);
	}
}
