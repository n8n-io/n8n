import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { createMessage } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';

export const properties: INodeProperties[] = [
	{
		displayName: 'Subject',
		name: 'subject',
		description: 'The subject of the message',
		type: 'string',
		default: '',
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
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
				placeholder: 'e.g. john@example.com',
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
				placeholder: 'e.g. john@example.com',
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
				placeholder: 'e.g. john@example.com',
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
				displayName: 'Reply To',
				name: 'replyTo',
				description: 'Email address to use when replying',
				type: 'string',
				placeholder: 'e.g. replyto@example.com',
				default: '',
			},
			{
				displayName: 'To',
				name: 'toRecipients',
				description: 'Comma-separated list of email addresses of recipients',
				type: 'string',
				placeholder: 'e.g. john@example.com',
				default: '',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['draft'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, index: number, items: INodeExecutionData[]) {
	const additionalFields = this.getNodeParameter('additionalFields', index);
	const subject = this.getNodeParameter('subject', index) as string;
	const bodyContent = this.getNodeParameter('bodyContent', index, '') as string;

	additionalFields.subject = subject;

	additionalFields.bodyContent = bodyContent || ' ';

	// Create message object from optional fields
	const body: IDataObject = createMessage(additionalFields);

	if (additionalFields.attachments) {
		const attachments = (additionalFields.attachments as IDataObject).attachments as IDataObject[];

		// // Handle attachments
		body.attachments = attachments.map((attachment) => {
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

			const binaryData = items[index].binary[binaryPropertyName];
			return {
				'@odata.type': '#microsoft.graph.fileAttachment',
				name: binaryData.fileName,
				contentBytes: binaryData.data,
			};
		});
	}

	const responseData = await microsoftApiRequest.call(this, 'POST', '/messages', body, {});

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData as IDataObject),
		{ itemData: { item: index } },
	);

	return executionData;
}
