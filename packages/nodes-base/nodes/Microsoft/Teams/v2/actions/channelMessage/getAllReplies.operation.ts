import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';

import { returnAllOrLimit } from '@utils/descriptions';
import { updateDisplayOptions } from '@utils/utilities';

import { channelRLC, teamRLC } from '../../descriptions';
import { buildTeamsPath, microsoftApiRequestAllItems } from '../../transport';

const properties: INodeProperties[] = [
	teamRLC,
	channelRLC,
	{
		displayName: 'Message ID',
		name: 'messageId',
		required: true,
		type: 'string',
		default: '',
		placeholder: 'e.g. 1673355049064',
		description:
			'The ID of the message whose replies to retrieve. The message ID is the number before "?tenantId" in the message URL.',
	},
	...returnAllOrLimit,
];

const displayOptions = {
	show: {
		resource: ['channelMessage'],
		operation: ['getAllReplies'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	//https://learn.microsoft.com/en-us/graph/api/chatmessage-list-replies?view=graph-rest-beta&tabs=http

	const teamId = this.getNodeParameter('teamId', i, '', { extractValue: true }) as string;
	const channelId = this.getNodeParameter('channelId', i, '', { extractValue: true }) as string;
	const messageId = this.getNodeParameter('messageId', i) as string;
	const returnAll = this.getNodeParameter('returnAll', i);

	const endpoint = buildTeamsPath.call(this, [
		'/beta/teams/',
		{ id: teamId },
		'/channels/',
		{ id: channelId },
		'/messages/',
		{ id: messageId },
		'/replies',
	]);

	if (returnAll) {
		return await microsoftApiRequestAllItems.call(this, 'value', 'GET', endpoint);
	}

	const limit = this.getNodeParameter('limit', i);
	return await microsoftApiRequestAllItems.call(
		this,
		'value',
		'GET',
		endpoint,
		{},
		{ $top: limit },
		limit,
	);
}
