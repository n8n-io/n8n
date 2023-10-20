import type { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { updateDisplayOptions } from '@utils/utilities';
import { prepareMessage } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Team Name or ID',
		name: 'teamId',
		required: true,
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getTeams',
		},
		default: '',
	},
	{
		displayName: 'Channel Name or ID',
		name: 'channelId',
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getChannels',
			loadOptionsDependsOn: ['teamId'],
		},
		default: '',
	},
	{
		displayName: 'Message Type',
		name: 'messageType',
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
		description: 'The type of the content',
	},
	{
		displayName: 'Message',
		name: 'message',
		required: true,
		type: 'string',
		default: '',
		description: 'The content of the item',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
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
				displayName: 'Make Reply',
				name: 'makeReply',
				type: 'string',
				default: '',
				description: 'An optional ID of the message you want to reply to',
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

	const teamId = this.getNodeParameter('teamId', i) as string;
	const channelId = this.getNodeParameter('channelId', i) as string;
	const messageType = this.getNodeParameter('messageType', i) as string;
	const message = this.getNodeParameter('message', i) as string;
	const options = this.getNodeParameter('options', i);

	let includeLinkToWorkflow = options.includeLinkToWorkflow;
	if (includeLinkToWorkflow === undefined) {
		includeLinkToWorkflow = nodeVersion >= 1.1;
	}

	const body: IDataObject = prepareMessage.call(
		this,
		message,
		messageType,
		includeLinkToWorkflow as boolean,
		instanceId,
	);

	if (options.makeReply) {
		const replyToId = options.makeReply as string;
		return microsoftApiRequest.call(
			this,
			'POST',
			`/beta/teams/${teamId}/channels/${channelId}/messages/${replyToId}/replies`,
			body,
		);
	} else {
		return microsoftApiRequest.call(
			this,
			'POST',
			`/beta/teams/${teamId}/channels/${channelId}/messages`,
			body,
		);
	}
}
