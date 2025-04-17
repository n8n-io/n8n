import type { INodeProperties, IExecuteFunctions, IDataObject } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { chatRLC } from '../../descriptions';
import { prepareMessage } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	chatRLC,
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
		default: {},
		description: 'Other options to set',
		placeholder: 'Add option',
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

export async function execute(this: IExecuteFunctions, i: number, instanceId: string) {
	// https://docs.microsoft.com/en-us/graph/api/channel-post-messages?view=graph-rest-1.0&tabs=http

	const chatId = this.getNodeParameter('chatId', i, '', { extractValue: true }) as string;
	const contentType = this.getNodeParameter('contentType', i) as string;
	const message = this.getNodeParameter('message', i) as string;
	const options = this.getNodeParameter('options', i, {});

	const includeLinkToWorkflow = options.includeLinkToWorkflow !== false;

	const body: IDataObject = prepareMessage.call(
		this,
		message,
		contentType,
		includeLinkToWorkflow,
		instanceId,
	);

	return await microsoftApiRequest.call(this, 'POST', `/v1.0/chats/${chatId}/messages`, body);
}
