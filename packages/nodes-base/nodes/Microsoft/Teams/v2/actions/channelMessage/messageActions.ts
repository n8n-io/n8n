import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { throwIfChannelMessageDeleteUnsupported } from './sharedGuard';
import { channelRLC, teamRLC } from '../../descriptions';
import { readTextParameter } from '../../helpers/parameters';
import {
	buildTeamsPath,
	microsoftApiRequest,
	type MicrosoftGraphPathSegment,
	SP_HIDE,
} from '../../transport';

type ChannelMessageAction = 'softDelete' | 'undoSoftDelete';

const FORBIDDEN_HINT =
	'Deleting and restoring channel messages needs the ChannelMessage.ReadWrite scope. Reconnect the credential so its token includes it. Microsoft also refuses this call when the signed-in user may not delete the message.';

export function messageActionProperties(messageDescription: string): INodeProperties[] {
	return [
		teamRLC,
		channelRLC,
		{
			displayName: 'Message ID',
			name: 'messageId',
			required: true,
			type: 'string',
			default: '',
			placeholder: 'e.g. 1673355049064',
			description: `${messageDescription}. The message ID is the number before "?tenantId" in the message URL.`,
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			options: [
				{
					displayName: 'Parent Message ID',
					name: 'parentMessageId',
					type: 'string',
					default: '',
					placeholder: 'e.g. 1673348720590',
					description:
						'Set this when the message is a reply. The parent message ID is the "parentMessageId" parameter in the reply URL.',
				},
			],
		},
	];
}

export function messageActionDisplayOptions(operation: string) {
	return {
		show: {
			resource: ['channelMessage'],
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
	action: ChannelMessageAction,
) {
	throwIfChannelMessageDeleteUnsupported.call(this);

	const teamId = readTextParameter.call(this, 'teamId', i, true);
	const channelId = readTextParameter.call(this, 'channelId', i, true);
	const messageId = readTextParameter.call(this, 'messageId', i);
	const parentMessageId = readTextParameter.call(this, 'options.parentMessageId', i);
	const target: MicrosoftGraphPathSegment[] = parentMessageId
		? [{ id: parentMessageId }, '/replies/', { id: messageId }]
		: [{ id: messageId }];
	const endpoint = buildTeamsPath.call(this, [
		'/v1.0/teams/',
		{ id: teamId },
		'/channels/',
		{ id: channelId },
		'/messages/',
		...target,
		`/${action}`,
	]);

	try {
		await microsoftApiRequest.call(this, 'POST', endpoint);
	} catch (error) {
		if (error instanceof NodeApiError && error.httpCode === '403') {
			throw new NodeOperationError(this.getNode(), error, { description: FORBIDDEN_HINT });
		}
		throw error;
	}
	return { success: true };
}
