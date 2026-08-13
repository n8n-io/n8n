import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';

import { returnAllOrLimit } from '@utils/descriptions';
import { updateDisplayOptions } from '@utils/utilities';

import { chatRLC } from '../../descriptions';
import { buildTeamsPath, microsoftApiRequestAllItems, SP_HIDE } from '../../transport';
import { throwIfChatUnsupported } from './sharedGuard';

const properties: INodeProperties[] = [chatRLC, ...returnAllOrLimit];

const displayOptions = {
	show: {
		resource: ['chatMessage'],
		operation: ['getAll'],
	},
	hide: {
		...SP_HIDE,
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	// https://docs.microsoft.com/en-us/graph/api/chat-list-messages?view=graph-rest-1.0&tabs=http

	// App-only Graph cannot read chats; fail before any request.
	throwIfChatUnsupported.call(this);

	const chatId = this.getNodeParameter('chatId', i, '', { extractValue: true }) as string;
	const returnAll = this.getNodeParameter('returnAll', i);

	if (returnAll) {
		return await microsoftApiRequestAllItems.call(
			this,
			'value',
			'GET',
			buildTeamsPath.call(this, ['/v1.0/chats/', { id: chatId }, '/messages']),
		);
	} else {
		const limit = this.getNodeParameter('limit', i);
		return await microsoftApiRequestAllItems.call(
			this,
			'value',
			'GET',
			buildTeamsPath.call(this, ['/v1.0/chats/', { id: chatId }, '/messages']),
			{},
			{ $top: limit },
			limit,
		);
	}
}
