import type { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { channelRLC, includeLinkToWorkflowOption, teamRLC } from '../../descriptions';
import { prepareMessage } from '../../helpers/utils';
import { buildTeamsPath, microsoftApiRequest, SP_HIDE } from '../../transport';
import { throwIfChannelMessageSendUnsupported } from './sharedGuard';

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
			'The ID of the message to reply to. The message ID is the number before "?tenantId" in the message URL.',
	},
	{
		displayName: 'Content Type',
		name: 'contentType',
		required: true,
		type: 'options',
		options: [
			{
				name: 'Text',
				value: 'text',
			},
			{
				name: 'HTML',
				value: 'html',
			},
		],
		default: 'text',
		description: 'Whether the reply is plain text or HTML',
	},
	{
		displayName: 'Message',
		name: 'message',
		required: true,
		type: 'string',
		default: '',
		description: 'The content of the reply to be sent',
		typeOptions: {
			rows: 2,
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [includeLinkToWorkflowOption],
	},
];

const displayOptions = {
	show: {
		resource: ['channelMessage'],
		operation: ['reply'],
	},
	hide: {
		...SP_HIDE,
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
	_nodeVersion: number,
	instanceId: string,
) {
	//https://learn.microsoft.com/en-us/graph/api/chatmessage-post-replies?view=graph-rest-beta&tabs=http

	throwIfChannelMessageSendUnsupported.call(this, i);

	const teamId = this.getNodeParameter('teamId', i, '', { extractValue: true }) as string;
	const channelId = this.getNodeParameter('channelId', i, '', { extractValue: true }) as string;
	const messageId = this.getNodeParameter('messageId', i) as string;
	const contentType = this.getNodeParameter('contentType', i) as string;
	const message = this.getNodeParameter('message', i) as string;
	// Destructuring default matches `create`: only an unset option falls back to
	// on, any explicit value keeps its own truthiness.
	const { includeLinkToWorkflow = true } = this.getNodeParameter('options', i);

	const body: IDataObject = prepareMessage.call(
		this,
		message,
		contentType,
		Boolean(includeLinkToWorkflow),
		instanceId,
	);

	const endpoint = buildTeamsPath.call(this, [
		'/beta/teams/',
		{ id: teamId },
		'/channels/',
		{ id: channelId },
		'/messages/',
		{ id: messageId },
		'/replies',
	]);

	return await microsoftApiRequest.call(this, 'POST', endpoint, body);
}
