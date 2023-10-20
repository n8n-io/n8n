import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';
import { updateDisplayOptions } from '@utils/utilities';
import { returnAllOrLimit } from '@utils/descriptions';
import { microsoftApiRequestAllItems } from '../../transport';

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
	...returnAllOrLimit,
];

const displayOptions = {
	show: {
		resource: ['chatMessage'],
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	// https://docs.microsoft.com/en-us/graph/api/chat-list-messages?view=graph-rest-1.0&tabs=http

	const chatId = this.getNodeParameter('chatId', i) as string;
	const returnAll = this.getNodeParameter('returnAll', i);
	if (returnAll) {
		return microsoftApiRequestAllItems.call(this, 'value', 'GET', `/v1.0/chats/${chatId}/messages`);
	} else {
		const limit = this.getNodeParameter('limit', i);
		const responseData = await microsoftApiRequestAllItems.call(
			this,
			'value',
			'GET',
			`/v1.0/chats/${chatId}/messages`,
			{},
		);
		return responseData.splice(0, limit);
	}
}
