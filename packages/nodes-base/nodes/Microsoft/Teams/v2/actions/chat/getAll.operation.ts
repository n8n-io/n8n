import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';

import { returnAllOrLimit } from '@utils/descriptions';
import { updateDisplayOptions } from '@utils/utilities';

import { throwIfChatUnsupported } from './sharedGuard';
import { microsoftApiRequestAllItems, SP_HIDE } from '../../transport';

/** Graph caps `$top` on `GET /chats` at 50 and 400s above it. */
const CHATS_MAX_PAGE_SIZE = 50;

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
	// `minValue: 1` is editor-only, so an expression can still yield 0, a fraction, a
	// negative or a non-number, and Graph rejects a fractional or NaN `$top`. Floor first,
	// so 2.7 becomes 2; `|| 1` then catches 0 and NaN; `Math.max` catches a negative.
	const limit = returnAll
		? undefined
		: Math.max(Math.floor(this.getNodeParameter('limit', i)) || 1, 1);
	// Graph caps /chats at $top 50 and `returnAllOrLimit` defaults the limit to 100, which
	// 400s. Cap the PAGE size only: a higher limit stays intact and is satisfied by paging.
	// This belongs in `microsoftApiRequestAllItems` (its own docstring already lists the
	// limit guard as pending), but folding it in there changes the three sibling operations
	// that pass `$top`, so it stays local until the kernel takes it.
	const $top = Math.min(limit ?? CHATS_MAX_PAGE_SIZE, CHATS_MAX_PAGE_SIZE);

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
