import type { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { channelRLC, teamRLC } from '../../descriptions';
import { prepareMessage } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	teamRLC,
	channelRLC,
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
		description: 'Whether the message is plain text or HTML',
	},
	{
		displayName: 'Message',
		name: 'message',
		required: true,
		type: 'string',
		default: '',
		description: 'The content of the message to be sent',
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
		options: [
			{
				displayName: 'Include Link to Workflow',
				name: 'includeLinkToWorkflow',
				type: 'boolean',
				default: true,
				description:
					'Whether to append a link to this workflow at the end of the message. This is helpful if you have many workflows sending messages.',
			},
			{
				displayName: 'Reply to ID',
				name: 'makeReply',
				type: 'string',
				default: '',
				placeholder: 'e.g. 1673348720590',
				description:
					'An optional ID of the message you want to reply to. The message ID is the number before "?tenantId" in the message URL.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['channelMessage'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
	nodeVersion: number,
	instanceId: string,
) {
	//https://docs.microsoft.com/en-us/graph/api/channel-post-messages?view=graph-rest-beta&tabs=http
	//https://docs.microsoft.com/en-us/graph/api/channel-post-messagereply?view=graph-rest-beta&tabs=http

	const teamId = this.getNodeParameter('teamId', i, '', { extractValue: true }) as string;
	const channelId = this.getNodeParameter('channelId', i, '', { extractValue: true }) as string;
	const contentType = this.getNodeParameter('contentType', i) as string;
	const message = this.getNodeParameter('message', i) as string;
	const options = this.getNodeParameter('options', i);

	let includeLinkToWorkflow = options.includeLinkToWorkflow;
	if (includeLinkToWorkflow === undefined) {
		includeLinkToWorkflow = nodeVersion >= 1.1;
	}

	const body: IDataObject = prepareMessage.call(
		this,
		message,
		contentType,
		includeLinkToWorkflow as boolean,
		instanceId,
	);

	if (options.makeReply) {
		const replyToId = options.makeReply as string;
		return await microsoftApiRequest.call(
			this,
			'POST',
			`/beta/teams/${teamId}/channels/${channelId}/messages/${replyToId}/replies`,
			body,
		);
	} else {
		return await microsoftApiRequest.call(
			this,
			'POST',
			`/beta/teams/${teamId}/channels/${channelId}/messages`,
			body,
		);
	}
}
