import {
	type INodeProperties,
	type IExecuteFunctions,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { throwIfChatMemberUnsupported } from './sharedGuard';
import { chatMemberRLC, chatRLC } from '../../descriptions';
import { buildTeamsPath, microsoftApiRequest, SP_HIDE } from '../../transport';

const properties: INodeProperties[] = [chatRLC, chatMemberRLC];

const displayOptions = {
	show: {
		resource: ['chatMember'],
		operation: ['remove'],
	},
	hide: {
		...SP_HIDE,
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	// https://learn.microsoft.com/en-us/graph/api/chat-delete-members?view=graph-rest-1.0

	// The chat picker cannot list chats app-only; fail before any request.
	throwIfChatMemberUnsupported.call(this);

	const chatId = this.getNodeParameter('chatId', i, '', { extractValue: true }) as string;
	const membershipId = this.getNodeParameter('membershipId', i, '', {
		extractValue: true,
	}) as string;
	const endpoint = buildTeamsPath.call(this, [
		'/v1.0/chats/',
		{ id: chatId },
		'/members/',
		{ id: membershipId },
	]);

	try {
		await microsoftApiRequest.call(this, 'DELETE', endpoint);
		return { success: true };
	} catch (error) {
		// 403 only, never a catch-all, and Graph's own message stays the message: a 403
		// here can equally be a legitimate refusal. Inline because there is a single
		// call site - see the per-operation 403 hint note in utils/microsoft/transport.ts.
		if (error instanceof NodeApiError && error.httpCode === '403') {
			throw new NodeOperationError(this.getNode(), error, {
				itemIndex: i,
				description:
					'Microsoft refuses this call on a one-on-one chat, when removing the last owner, and when removing yourself. If none of the above applies, make sure the credential grants ChatMember.ReadWrite (needs tenant admin consent).',
			});
		}
		throw error;
	}
}
