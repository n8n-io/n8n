import {
	type INodeProperties,
	type IExecuteFunctions,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { chatMemberRLC, chatRLC } from '../../descriptions';
import { buildTeamsPath, microsoftApiRequest, SP_HIDE } from '../../transport';
import { throwIfChatMemberUnsupported } from './sharedGuard';

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

	// App-only Graph cannot change chat membership; fail before any request.
	throwIfChatMemberUnsupported.call(this, i);

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
			throw new NodeOperationError(this.getNode(), error as Error, {
				itemIndex: i,
				description:
					'Removing a member needs the ChatMember.ReadWrite permission, which has no higher-privileged alternative: reconnect the credential to grant it (a tenant admin may have to consent again), and if Custom Scopes is enabled add it to Enabled Scopes by hand. Microsoft also refuses this call on a one-on-one chat, when removing the last owner, and when removing yourself.',
			});
		}
		throw error;
	}
}
