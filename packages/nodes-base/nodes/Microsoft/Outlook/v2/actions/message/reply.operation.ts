import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { messageRLC } from '../../descriptions';
import { createMessage } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';

export const properties: INodeProperties[] = [
	messageRLC,
	{
		displayName: 'Reply to Sender Only',
		name: 'replyToSenderOnly',
		type: 'boolean',
		default: false,
		description: 'Whether to reply to the sender only or to the entire list of recipients',
	},
	{
		displayName: 'Message',
		name: 'message',
		// name: 'bodyContent',
		description: 'Message body content',
		type: 'string',
		typeOptions: {
			rows: 2,
		},
		default: '',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				replyToSenderOnly: [true],
			},
		},
		options: [
			{
				displayName: 'Attachments',
				name: 'attachments',
				type: 'fixedCollection',
				placeholder: 'Add Attachment',
				default: {},
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'attachments',
						displayName: 'Attachment',
						values: [
							{
								displayName: 'Input Data Field Name',
								name: 'binaryPropertyName',
								type: 'string',
								default: '',
								placeholder: 'e.g. data',
								hint: 'The name of the input field containing the binary file data to be attached',
							},
						],
					},
				],
			},
			{
				displayName: 'BCC Recipients',
				name: 'bccRecipients',
				description: 'Comma-separated list of email addresses of BCC recipients',
				type: 'string',
				default: '',
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
			{
				displayName: 'From',
				name: 'from',
				description:
					'The owner of the mailbox from which the message is sent. Must correspond to the actual mailbox used.',
				type: 'string',
				default: '',
			},
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
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Save as Draft',
				name: 'saveAsDraft',
				description:
					'Whether to save the message as a draft. If false, the message is sent immediately.',
				type: 'boolean',
				default: false,
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['message'],
		operation: ['reply'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, index: number, items: INodeExecutionData[]) {
	const messageId = this.getNodeParameter('messageId', index, undefined, {
		extractValue: true,
	}) as string;
	const replyToSenderOnly = this.getNodeParameter('replyToSenderOnly', index, false) as string;
	const message = this.getNodeParameter('message', index) as string;
	const saveAsDraft = this.getNodeParameter('options.saveAsDraft', index, false) as boolean;
	const additionalFields = this.getNodeParameter('additionalFields', index, {});

	const body: IDataObject = {};

	let action = 'createReply';

	if (!replyToSenderOnly) {
		body.comment = message;
		action = 'createReplyAll';
	} else {
		// body.comment = comment;
		body.message = {} as IDataObject;
		additionalFields.bodyContent = message;
		Object.assign(body.message, createMessage(additionalFields));

		delete (body.message as IDataObject).attachments;
	}

	const responseData = await microsoftApiRequest.call(
		this,
		'POST',
		`/messages/${messageId}/${action}`,
		body,
	);

	if (additionalFields.attachments) {
		const attachments = (additionalFields.attachments as IDataObject).attachments as IDataObject[];
		// // Handle attachments
		const data: IDataObject[] = [];

		for (const attachment of attachments) {
			const binaryPropertyName = attachment.binaryPropertyName as string;

			if (items[index].binary === undefined) {
				throw new NodeOperationError(this.getNode(), 'No binary data exists on item!', {
					itemIndex: index,
				});
			}

			if (
				items[index].binary &&
				(items[index].binary as IDataObject)[binaryPropertyName] === undefined
			) {
				throw new NodeOperationError(
					this.getNode(),
					`No binary data property "${binaryPropertyName}" does not exists on item!`,
					{ itemIndex: index },
				);
			}

			const binaryData = this.helpers.assertBinaryData(index, binaryPropertyName);

			let fileBase64;
			if (binaryData.id) {
				const chunkSize = 256 * 1024;
				const stream = await this.helpers.getBinaryStream(binaryData.id, chunkSize);
				const buffer = await this.helpers.binaryToBuffer(stream);
				fileBase64 = buffer.toString('base64');
			} else {
				fileBase64 = binaryData.data;
			}

			data.push({
				'@odata.type': '#microsoft.graph.fileAttachment',
				name: binaryData.fileName,
				contentBytes: fileBase64,
			});
		}

		for (const attachment of data) {
			await microsoftApiRequest.call(
				this,
				'POST',
				`/messages/${responseData.id}/attachments`,
				attachment,
				{},
			);
		}
	}

	if (!saveAsDraft) {
		await microsoftApiRequest.call(this, 'POST', `/messages/${responseData.id}/send`);
	}

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData as IDataObject),
		{ itemData: { item: index } },
	);

	return executionData;
}
