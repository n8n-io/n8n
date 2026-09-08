import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { channelRLC, teamRLC } from '../../descriptions';
import { buildTeamsPath, microsoftApiRequest } from '../../transport';

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
			'The ID of the message to retrieve. The message ID is the number before "?tenantId" in the message URL.',
	},
];

const displayOptions = {
	show: {
		resource: ['channelMessage'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	//https://learn.microsoft.com/en-us/graph/api/chatmessage-get?view=graph-rest-beta&tabs=http

	const teamId = this.getNodeParameter('teamId', i, '', { extractValue: true }) as string;
	const channelId = this.getNodeParameter('channelId', i, '', { extractValue: true }) as string;
	const messageId = this.getNodeParameter('messageId', i) as string;

	const endpoint = buildTeamsPath.call(this, [
		'/beta/teams/',
		{ id: teamId },
		'/channels/',
		{ id: channelId },
		'/messages/',
		{ id: messageId },
	]);

	return await microsoftApiRequest.call(this, 'GET', endpoint);
}
