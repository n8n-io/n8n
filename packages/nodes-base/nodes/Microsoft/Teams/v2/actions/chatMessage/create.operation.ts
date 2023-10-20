import type { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { updateDisplayOptions } from '@utils/utilities';
import { prepareMessage } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Chat Name or ID',
		name: 'chatId',
		required: true,
		type: 'options',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getChats',
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
		default: {},
		description: 'Other options to set',
		placeholder: 'Add options',
		options: [
			{
				displayName: 'Include Link to Workflow',
				name: 'includeLinkToWorkflow',
				type: 'boolean',
				default: true,
				description:
					'Whether to append a link to this workflow at the end of the message. This is helpful if you have many workflows sending messages.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['chatMessage'],
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
	// https://docs.microsoft.com/en-us/graph/api/channel-post-messages?view=graph-rest-1.0&tabs=http

	const chatId = this.getNodeParameter('chatId', i) as string;
	const messageType = this.getNodeParameter('messageType', i) as string;
	const message = this.getNodeParameter('message', i) as string;
	const options = this.getNodeParameter('options', i, {});

	const includeLinkToWorkflow = options.includeLinkToWorkflow !== false && nodeVersion >= 1.1;

	const body: IDataObject = prepareMessage.call(
		this,
		message,
		messageType,
		includeLinkToWorkflow,
		instanceId,
	);

	return microsoftApiRequest.call(this, 'POST', `/v1.0/chats/${chatId}/messages`, body);
}
