import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';
import { updateDisplayOptions } from '@utils/utilities';
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
		displayName: 'Message ID',
		name: 'messageId',
		required: true,
		type: 'string',
		default: '',
	},
];

const displayOptions = {
	show: {
		resource: ['chatMessage'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	// https://docs.microsoft.com/en-us/graph/api/chat-list-messages?view=graph-rest-1.0&tabs=http

	const chatId = this.getNodeParameter('chatId', i) as string;
	const messageId = this.getNodeParameter('messageId', i) as string;
	return microsoftApiRequest.call(this, 'GET', `/v1.0/chats/${chatId}/messages/${messageId}`);
}
