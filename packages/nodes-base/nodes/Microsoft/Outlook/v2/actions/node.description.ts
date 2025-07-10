/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import * as calendar from './calendar';
import * as contact from './contact';
import * as draft from './draft';
import * as event from './event';
import * as folder from './folder';
import * as folderMessage from './folderMessage';
import * as message from './message';
import * as messageAttachment from './messageAttachment';
import { sendAndWaitWebhooksDescription } from '../../../../../utils/sendAndWait/descriptions';

export const description: INodeTypeDescription = {
	displayName: 'Microsoft Outlook',
	name: 'microsoftOutlook',
	group: ['transform'],
	icon: 'file:outlook.svg',
	version: 2,
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Consume Microsoft Outlook API',
	defaults: {
		name: 'Microsoft Outlook',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	usableAsTool: true,
	credentials: [
		{
			name: 'microsoftOutlookOAuth2Api',
			required: true,
		},
	],
	webhooks: sendAndWaitWebhooksDescription,
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			default: 'message',
			options: [
				{
					name: 'Calendar',
					value: 'calendar',
				},
				{
					name: 'Contact',
					value: 'contact',
				},
				{
					name: 'Draft',
					value: 'draft',
				},
				{
					name: 'Event',
					value: 'event',
				},
				{
					name: 'Folder',
					value: 'folder',
				},
				{
					name: 'Folder Message',
					value: 'folderMessage',
				},
				{
					name: 'Message',
					value: 'message',
				},
				{
					name: 'Message Attachment',
					value: 'messageAttachment',
				},
			],
		},
		...calendar.description,
		...contact.description,
		...draft.description,
		...event.description,
		...folder.description,
		...folderMessage.description,
		...message.description,
		...messageAttachment.description,
	],
};
