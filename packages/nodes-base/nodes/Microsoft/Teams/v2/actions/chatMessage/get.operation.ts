import { type INodeProperties, type IExecuteFunctions, NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { chatRLC } from '../../descriptions';
import { microsoftApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	chatRLC,
	{
		displayName: 'Message ID',
		name: 'messageId',
		required: true,
		type: 'string',
		default: '',
		placeholder: 'e.g. 1673355049064',
		description: 'The ID of the message to retrieve',
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

	try {
		const chatId = this.getNodeParameter('chatId', i, '', { extractValue: true }) as string;
		const messageId = this.getNodeParameter('messageId', i) as string;

		return await microsoftApiRequest.call(
			this,
			'GET',
			`/v1.0/chats/${chatId}/messages/${messageId}`,
		);
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			"The message you are trying to get doesn't exist",
			{
				description: "Check that the 'Message ID' parameter is correctly set",
			},
		);
	}
}
