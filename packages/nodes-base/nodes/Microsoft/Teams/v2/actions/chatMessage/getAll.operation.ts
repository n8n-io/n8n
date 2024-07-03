import type { INodeProperties, IExecuteFunctions } from 'n8n-workflow';
import { microsoftApiRequestAllItems } from '../../transport';
import { chatRLC } from '../../descriptions';
import { updateDisplayOptions } from '@utils/utilities';
import { returnAllOrLimit } from '@utils/descriptions';

const properties: INodeProperties[] = [chatRLC, ...returnAllOrLimit];

const displayOptions = {
	show: {
		resource: ['chatMessage'],
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number) {
	// https://docs.microsoft.com/en-us/graph/api/chat-list-messages?view=graph-rest-1.0&tabs=http

	const chatId = this.getNodeParameter('chatId', i, '', { extractValue: true }) as string;
	const returnAll = this.getNodeParameter('returnAll', i);

	if (returnAll) {
		return await microsoftApiRequestAllItems.call(
			this,
			'value',
			'GET',
			`/v1.0/chats/${chatId}/messages`,
		);
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
