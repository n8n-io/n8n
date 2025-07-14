import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { folderRLC, messageRLC } from '../../descriptions';
import { createMessage, decodeOutlookId } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';

export const properties: INodeProperties[] = [
	messageRLC,
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'BCC Recipients',
				name: 'bccRecipients',
				description: 'Comma-separated list of email addresses of BCC recipients',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Category Names or IDs',
				name: 'categories',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getCategoriesNames',
				},
				default: [],
			},
			{
				displayName: 'CC Recipients',
				name: 'ccRecipients',
				description: 'Comma-separated list of email addresses of CC recipients',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Custom Headers',
				name: 'internetMessageHeaders',
				placeholder: 'Add Header',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				options: [
					{
						name: 'headers',
						displayName: 'Header',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Name of the header',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Value to set for the header',
							},
						],
					},
				],
			},
			{ ...folderRLC, required: false },
			{
				displayName: 'Importance',
				name: 'importance',
				description: 'The importance of the message',
				type: 'options',
				options: [
					{
						name: 'Low',
						value: 'Low',
					},
					{
						name: 'Normal',
						value: 'Normal',
					},
					{
						name: 'High',
						value: 'High',
					},
				],
				default: 'Normal',
			},
			{
				displayName: 'Is Read',
				name: 'isRead',
				description: 'Whether the message must be marked as read',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Message',
				name: 'bodyContent',
				description: 'Message body content',
				type: 'string',
				typeOptions: {
					rows: 2,
				},
				default: '',
			},
			{
				displayName: 'Message Type',
				name: 'bodyContentType',
				description: 'Message body content type',
				type: 'options',
				options: [
					{
						name: 'HTML',
						value: 'html',
					},
					{
						name: 'Text',
						value: 'Text',
					},
				],
				default: 'html',
			},
			{
				displayName: 'Read Receipt Requested',
				name: 'isReadReceiptRequested',
				description: 'Whether a read receipt is requested for the message',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'To',
				name: 'toRecipients',
				description: 'Comma-separated list of email addresses of recipients',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Reply To',
				name: 'replyTo',
				description: 'Email address to use when replying',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				description: 'The subject of the message',
				type: 'string',
				default: '',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['message'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, index: number) {
	let responseData;

	const messageId = this.getNodeParameter('messageId', index, undefined, {
		extractValue: true,
	}) as string;

	const updateFields = this.getNodeParameter('updateFields', index);

	const folderId = decodeOutlookId(
		this.getNodeParameter('updateFields.folderId', index, '', {
			extractValue: true,
		}) as string,
	);

	if (folderId) {
		const body: IDataObject = {
			destinationId: folderId,
		};

		responseData = await microsoftApiRequest.call(
			this,
			'POST',
			`/messages/${messageId}/move`,
			body,
		);

		delete updateFields.folderId;

		if (!Object.keys(updateFields).length) {
			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData as IDataObject),
				{ itemData: { item: index } },
			);

			return executionData;
		}
	}

	const body: IDataObject = createMessage(updateFields);

	if (!Object.keys(body).length) {
		throw new NodeOperationError(this.getNode(), 'No fields to update got specified');
	}

	responseData = await microsoftApiRequest.call(this, 'PATCH', `/messages/${messageId}`, body, {});

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData as IDataObject),
		{ itemData: { item: index } },
	);

	return executionData;
}
