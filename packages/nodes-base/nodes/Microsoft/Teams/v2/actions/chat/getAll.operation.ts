import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';

import { returnAllOrLimit } from '@utils/descriptions';
import { updateDisplayOptions } from '@utils/utilities';

import { throwIfChatUnsupported } from './sharedGuard';
import { microsoftApiRequestAllItems, SP_HIDE } from '../../transport';

const properties: INodeProperties[] = [...returnAllOrLimit];

const displayOptions = {
	show: {
		resource: ['chat'],
		operation: ['getAll'],
	},
	hide: {
		...SP_HIDE,
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	// https://learn.microsoft.com/en-us/graph/api/chat-list?view=graph-rest-1.0

	// App-only Graph cannot list chats; fail before any request.
	throwIfChatUnsupported.call(this);

	const returnAll = this.getNodeParameter('returnAll', i);
	// Clamp low on `limit`, not on `$top`: a 0 limit is falsy for the early return in
	// `microsoftApiRequestAllItems`, so `$top: 1` alone would still walk every page.
	// `minValue: 1` is editor-only, so an expression can still yield 0 or a fraction, and
	// Graph rejects a fractional `$top`. Floor before the low clamp, so 0.5 lands on 1.
	const limit = returnAll ? undefined : Math.max(Math.floor(this.getNodeParameter('limit', i)), 1);
	// Graph caps /chats at $top 50 and `returnAllOrLimit` defaults the limit to 100, which
	// 400s. Cap the PAGE size only: a higher limit stays intact and is satisfied by paging.
	// This belongs in `microsoftApiRequestAllItems`, but folding it in there changes six
	// sibling operations, so it stays local until the kernel takes it.
	const $top = Math.min(limit ?? 50, 50);

	return await microsoftApiRequestAllItems.call(
		this,
		'value',
		'GET',
		'/v1.0/chats',
		{},
		{ $top },
		limit,
	);
}
