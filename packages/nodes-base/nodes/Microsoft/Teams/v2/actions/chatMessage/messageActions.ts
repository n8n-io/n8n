import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { throwIfChatUnsupported } from './sharedGuard';
import { chatRLC } from '../../descriptions';
import { readTextParameter } from '../../helpers/parameters';
import { buildTeamsPath, microsoftApiRequest, SP_HIDE } from '../../transport';

type ChatMessageAction = 'softDelete' | 'undoSoftDelete';

function hasId(value: unknown): value is { id: string } {
	return (
		typeof value === 'object' &&
		value !== null &&
		'id' in value &&
		typeof value.id === 'string' &&
		value.id !== ''
	);
}

async function resolveSignedInUserId(this: IExecuteFunctions): Promise<string> {
	const user: unknown = await microsoftApiRequest.call(
		this,
		'GET',
		'/v1.0/me',
		{},
		{ $select: 'id' },
	);
	if (!hasId(user)) {
		throw new NodeOperationError(this.getNode(), 'Could not resolve the signed-in user', {
			description: 'Reconnect the OAuth2 credential and try again.',
		});
	}
	return user.id;
}

export function messageActionProperties(messageDescription: string): INodeProperties[] {
	return [
		chatRLC,
		{
			displayName: 'Message ID',
			name: 'messageId',
			required: true,
			type: 'string',
			default: '',
			placeholder: 'e.g. 1673355049064',
			description: messageDescription,
		},
	];
}

export function messageActionDisplayOptions(operation: string) {
	return {
		show: {
			resource: ['chatMessage'],
			operation: [operation],
		},
		hide: {
			...SP_HIDE,
		},
	};
}

export async function runMessageAction(
	this: IExecuteFunctions,
	i: number,
	action: ChatMessageAction,
) {
	throwIfChatUnsupported.call(this);

	const chatId = readTextParameter.call(this, 'chatId', i, true);
	const messageId = readTextParameter.call(this, 'messageId', i);
	const messagePath = buildTeamsPath.call(this, [
		'/chats/',
		{ id: chatId },
		'/messages/',
		{ id: messageId },
		`/${action}`,
	]);

	const userId = await resolveSignedInUserId.call(this);
	const endpoint = buildTeamsPath.call(this, ['/v1.0/users/', { id: userId }, messagePath]);

	await microsoftApiRequest.call(this, 'POST', endpoint);
	return { success: true };
}
