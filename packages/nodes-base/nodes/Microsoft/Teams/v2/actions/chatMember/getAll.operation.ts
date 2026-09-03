import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';

import { returnAllOrLimit } from '@utils/descriptions';
import { updateDisplayOptions } from '@utils/utilities';

import { chatRLC } from '../../descriptions';
import { buildTeamsPath, microsoftApiRequestAllItems, SP_HIDE } from '../../transport';
import { throwIfChatMemberUnsupported } from './sharedGuard';

const properties: INodeProperties[] = [chatRLC, ...returnAllOrLimit];

const displayOptions = {
	show: {
		resource: ['chatMember'],
		operation: ['getAll'],
	},
	hide: {
		...SP_HIDE,
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	// https://learn.microsoft.com/en-us/graph/api/chat-list-members?view=graph-rest-1.0

	// App-only Graph cannot read chats; fail before any request.
	throwIfChatMemberUnsupported.call(this, i);

	const chatId = this.getNodeParameter('chatId', i, '', { extractValue: true }) as string;
	const returnAll = this.getNodeParameter('returnAll', i);
	const endpoint = buildTeamsPath.call(this, ['/v1.0/chats/', { id: chatId }, '/members']);

	if (returnAll) {
		return await microsoftApiRequestAllItems.call(this, 'value', 'GET', endpoint);
	}

	// No `$top`: this endpoint supports no OData query parameters, so the limit is
	// applied client-side while paging through @odata.nextLink.
	const limit = this.getNodeParameter('limit', i);
	return await microsoftApiRequestAllItems.call(this, 'value', 'GET', endpoint, {}, {}, limit);
}
