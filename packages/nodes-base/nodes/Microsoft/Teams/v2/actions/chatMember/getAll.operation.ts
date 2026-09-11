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

	// The chat picker cannot list chats app-only; fail before any request.
	throwIfChatMemberUnsupported.call(this);

	const chatId = this.getNodeParameter('chatId', i, '', { extractValue: true }) as string;
	const endpoint = buildTeamsPath.call(this, ['/v1.0/chats/', { id: chatId }, '/members']);

	// No `$top`: this endpoint supports no OData query parameters, so the limit is
	// applied client-side while paging through @odata.nextLink.
	const returnAll = this.getNodeParameter('returnAll', i);
	const limit = returnAll ? undefined : this.getNodeParameter('limit', i);
	return await microsoftApiRequestAllItems.call(this, 'value', 'GET', endpoint, {}, {}, limit);
}
