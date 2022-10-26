/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { INodeTypeDescription } from 'n8n-workflow';
import { draftFields, draftOperations } from './DraftDescription';
import { draftMessageSharedFields } from './DraftMessageSharedDescription';
import { messageFields, messageOperations } from './MessageDescription';
import {
	messageAttachmentFields,
	messageAttachmentOperations,
} from './MessageAttachmentDescription';
import { folderFields, folderOperations } from './FolderDescription';
import { folderMessageFields, folderMessageOperations } from './FolderMessageDecription';

export const versionDescription: INodeTypeDescription = {
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
	inputs: ['main'],
	outputs: ['main'],
	credentials: [
		{
			name: 'microsoftOutlookOAuth2Api',
			required: true,
		},
	],
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			default: 'message',
			options: [
				{
					name: 'Draft',
					value: 'draft',
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
		// Draft
		...draftOperations,
		...draftFields,
		// Message
		...messageOperations,
		...messageFields,
		// Message Attachment
		...messageAttachmentOperations,
		...messageAttachmentFields,
		// Folder
		...folderOperations,
		...folderFields,
		// Folder Message
		...folderMessageOperations,
		...folderMessageFields,

		// Draft & Message
		...draftMessageSharedFields,
	],
};
