import {
	NodeOperationError,
	type INodeProperties,
	type IExecuteFunctions,
	type IDataObject,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { channelRLC, teamRLC } from '../../descriptions';
import { prepareMessage } from '../../helpers/utils';
import {
	buildTeamsPath,
	getTeamsCredentialType,
	microsoftApiRequest,
	SERVICE_PRINCIPAL_AUTH,
	SP_HIDE,
} from '../../transport';

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
	hide: {
		...SP_HIDE,
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

	// App-only Graph exposes channel-message posting only via migration import, so
	// it has no usable form here; fail before any request for hand-edited workflows.
	if (getTeamsCredentialType.call(this) === SERVICE_PRINCIPAL_AUTH) {
		throw new NodeOperationError(
			this.getNode(),
			'Sending channel messages is not available with the Service Principal credential',
			{
				itemIndex: i,
				description:
					'App-only Microsoft Graph supports only migration import for channel messages. Use an OAuth2 credential to post messages.',
			},
		);
	}

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
			buildTeamsPath.call(this, [
				'/beta/teams/',
				{ id: teamId },
				'/channels/',
				{ id: channelId },
				'/messages/',
				{ id: replyToId },
				'/replies',
			]),
			body,
		);
	} else {
		return await microsoftApiRequest.call(
			this,
			'POST',
			buildTeamsPath.call(this, [
				'/beta/teams/',
				{ id: teamId },
				'/channels/',
				{ id: channelId },
				'/messages',
			]),
			body,
		);
	}
}
