import { IExecuteFunctions } from 'n8n-core';
import {
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	INodeProperties,
	NodeOperationError,
} from 'n8n-workflow';
import { createMessage } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Reply Type',
		name: 'replyType',
		type: 'options',
		options: [
			{
				name: 'Reply',
				value: 'reply',
			},
			{
				name: 'Reply All',
				value: 'replyAll',
			},
		],
		default: 'reply',
		required: true,
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['reply'],
			},
		},
	},
	{
		displayName: 'Comment',
		name: 'comment',
		description: 'A comment to include. Can be an empty string.',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['reply'],
			},
		},
		type: 'string',
		default: '',
	},
	{
		displayName: 'Send',
		name: 'send',
		description:
			'Whether to send the reply message directly. If not set, it will be saved as draft.',
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['reply'],
			},
		},
		type: 'boolean',
		default: true,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['reply'],
				replyType: ['reply'],
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
								displayName: 'Binary Property Name',
								name: 'binaryPropertyName',
								type: 'string',
								default: '',
								description:
									'Name of the binary property containing the data to be added to the email as an attachment',
							},
						],
					},
				],
			},
			{
				displayName: 'BCC Recipients',
				name: 'bccRecipients',
				description: 'Email addresses of BCC recipients',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Body Content',
				name: 'bodyContent',
				description: 'Message body content',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Body Content Type',
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
				displayName: 'CC Recipients',
				name: 'ccRecipients',
				description: 'Email addresses of CC recipients',
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
					'The owner of the mailbox which the message is sent. Must correspond to the actual mailbox used.',
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
				default: 'Low',
			},
			{
				displayName: 'Read Receipt Requested',
				name: 'isReadReceiptRequested',
				description: 'Whether a read receipt is requested for the message',
				type: 'boolean',
				default: false,
			},
			{
				displayName: 'Recipients',
				name: 'toRecipients',
				description: 'Email addresses of recipients. Multiple can be added separated by comma.',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Reply To',
				name: 'replyTo',
				description: 'Email addresses to use when replying',
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

export async function execute(
	this: IExecuteFunctions,
	index: number,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	let responseData;

	const messageId = this.getNodeParameter('messageId', index) as string;
	const replyType = this.getNodeParameter('replyType', index) as string;
	const comment = this.getNodeParameter('comment', index) as string;
	const send = this.getNodeParameter('send', index, false) as boolean;
	const additionalFields = this.getNodeParameter('additionalFields', index, {}) as IDataObject;

	const body: IDataObject = {};

	let action = 'createReply';
	if (replyType === 'replyAll') {
		body.comment = comment;
		action = 'createReplyAll';
	} else {
		body.comment = comment;
		body.message = {};
		Object.assign(body.message, createMessage(additionalFields));

		delete (body.message as IDataObject).attachments;
	}

	responseData = await microsoftApiRequest.call(
		this,
		'POST',
		`/messages/${messageId}/${action}`,
		body,
	);

	if (additionalFields.attachments) {
		const attachments = (additionalFields.attachments as IDataObject).attachments as IDataObject[];
		// // Handle attachments
		const data = attachments.map((attachment) => {
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

			const binaryData = (items[index].binary as IBinaryKeyData)[binaryPropertyName];
			return {
				'@odata.type': '#microsoft.graph.fileAttachment',
				name: binaryData.fileName,
				contentBytes: binaryData.data,
			};
		});

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

	if (send === true) {
		await microsoftApiRequest.call(this, 'POST', `/messages/${responseData.id}/send`);
	}

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData),
		{ itemData: { item: index } },
	);

	return executionData;
}
