import { IPollFunctions } from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	LoggerProxy as Logger,
} from 'n8n-workflow';

import { googleApiRequest, parseRawEmail, prepareQuery } from './GenericFunctions';

import { DateTime } from 'luxon';

export class GmailTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Gmail Trigger',
		name: 'gmailTrigger',
		icon: 'file:gmail.svg',
		group: ['trigger'],
		version: 1,
		description: 'Fetches emails from Gmail and starts the workflow on specified polling intervals.',
		subtitle: '={{"Gmail Trigger"}}',
		defaults: {
			name: 'Gmail Trigger',
		},
		credentials: [
			{
				name: 'googleApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['serviceAccount'],
					},
				},
			},
			{
				name: 'gmailOAuth2',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
		],
		polling: true,
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'OAuth2 (recommended)',
						value: 'oAuth2',
					},
					{
						name: 'Service Account',
						value: 'serviceAccount',
					},
				],
				default: 'oAuth2',
			},
			{
				displayName: 'Simplify',
				name: 'simple',
				type: 'boolean',
				default: true,
				description: 'Whether to return a simplified version of the response instead of the raw data',
			},
			{
				displayName: 'Download Attachments',
				name: 'downloadAttachments',
				type: 'boolean',
				displayOptions: {
					hide: {
						simple: [true],
					},
				},
				default: false,
				description: "Whether the emaail's attachments will be downloaded",
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				options: [
					{
						displayName: 'Include Spam and Trash',
						name: 'includeSpamTrash',
						type: 'boolean',
						default: false,
						description: 'Whether to include messages from SPAM and TRASH in the results',
					},
					{
						displayName: 'Label Names or IDs',
						name: 'labelIds',
						type: 'multiOptions',
						typeOptions: {
							loadOptionsMethod: 'getLabels',
						},
						default: [],
						description:
							'Only return messages with labels that match all of the specified label IDs. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
					},
					{
						displayName: 'Search',
						name: 'q',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						default: '',
						placeholder: 'has:attachment',
						hint: 'Use the same format as in the Gmail search box. <a href="https://support.google.com/mail/answer/7190?hl=en">More info</a>.',
						description: 'Only return messages matching the specified query',
					},
					{
						displayName: 'Read Status',
						name: 'readStatus',
						type: 'options',
						default: 'unread',
						hint: 'Filter emails by whether they have been read or not',
						options: [
							{
								// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
								name: 'Unread and read emails',
								value: 'both',
							},
							{
								// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
								name: 'Unread emails only',
								value: 'unread',
							},
							{
								// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
								name: 'Read emails only',
								value: 'read',
							},
						],
					},
					{
						displayName: 'Sender',
						name: 'sender',
						type: 'string',
						default: '',
						description: 'Sender name or email to filter by',
						hint: 'Enter an email or part of a sender name',
					},
				],
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					hide: {
						simple: [true],
					},
				},
				options: [
					{
						displayName: 'Attachment Prefix',
						name: 'dataPropertyAttachmentsPrefixName',
						type: 'string',
						default: 'attachment_',
						displayOptions: {
							show: {
								'/downloadAttachments': [true],
							},
						},
						description:
							"Prefix for name of the binary property to which to write the attachment. An index starting with 0 will be added. So if name is 'attachment_' the first attachment is saved to 'attachment_0'.",
					},
					{
						displayName: 'Format',
						name: 'format',
						type: 'options',
						options: [
							{
								name: 'Full',
								value: 'full',
								description:
									'Returns the full email message data with body content parsed in the payload field',
							},
							{
								name: 'IDs',
								value: 'ids',
								description: 'Returns only the IDs of the emails',
							},
							{
								name: 'Metadata',
								value: 'metadata',
								description: 'Returns only email message ID, labels, and email headers',
							},
							{
								name: 'Minimal',
								value: 'minimal',
								description:
									'Returns only email message ID and labels; does not return the email headers, body, or payload',
							},
							{
								name: 'RAW',
								value: 'raw',
								description:
									'Returns the full email message data with body content in the raw field as a base64url encoded string; the payload field is not used',
							},
							{
								name: 'Resolved',
								value: 'resolved',
								description:
									'Returns the full email with all data resolved and attachments saved as binary data',
							},
						],
						default: 'resolved',
						displayOptions: {
							show: {
								'/downloadAttachments': [false],
							},
						},
						description: 'The format to return the message in',
					},
				],
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const webhookData = this.getWorkflowStaticData('node');
		let responseData;

		const now = Math.floor(DateTime.now().toSeconds()) + '';
		const startDate = (webhookData.lastTimeChecked as string) || now;
		const endDate = now;

		const options = this.getNodeParameter('options', {}) as IDataObject;
		const filters = this.getNodeParameter('filters', {}) as IDataObject;

		try {
			const qs: IDataObject = {};
			filters.receivedAfter = startDate;

			if (this.getMode() === 'manual') {
				qs.maxResults = 1;
				delete filters.receivedAfter;
			}

			Object.assign(qs, prepareQuery.call(this, filters), options);

			responseData = await googleApiRequest.call(
				this,
				'GET',
				`/gmail/v1/users/me/messages`,
				{},
				qs,
			);
			responseData = responseData.messages;

			if (responseData === undefined) {
				responseData = [];
			}

			const format = options.format || 'resolved';
			const simple = this.getNodeParameter('simple') as boolean;
			let labels: IDataObject[] = [];

			if (format !== 'ids') {
				if (simple) {
					qs.format = 'metadata';
					qs.metadataHeaders = ['From', 'To', 'Cc', 'Bcc', 'Subject'];
					const labelsData = await googleApiRequest.call(
						this,
						'GET',
						`/gmail/v1/users/me/labels`,
					);
					labels = ((labelsData.labels as IDataObject[]) || []).map(({ id, name }) => ({
						id,
						name,
					}));
				} else if (format === 'resolved') {
					qs.format = 'raw';
				} else {
					qs.format = format;
				}

				for (let i = 0; i < responseData.length; i++) {
					responseData[i] = await googleApiRequest.call(
						this,
						'GET',
						`/gmail/v1/users/me/messages/${responseData[i].id}`,
						{},
						qs,
					);

					if (format === 'resolved' && !simple) {
						const dataPropertyNameDownload =
							(options.dataPropertyAttachmentsPrefixName as string) || 'attachment_';

						responseData[i] = await parseRawEmail.call(
							this,
							responseData[i],
							dataPropertyNameDownload,
						);
					}

					if (simple) {
						responseData = (responseData as IDataObject[]).map((item) => {
							if (item.labelIds) {
								item.labels = labels.filter((label) =>
									(item.labelIds as string[]).includes(label.id as string),
								);
								delete item.labelIds;
							}
							return item;
						});
					}
				}
			}

			if (format !== 'resolved' || simple) {
				responseData = this.helpers.returnJsonArray(responseData);
			}
		} catch (error) {
			if (this.getMode() === 'manual' || !webhookData.lastTimeChecked) {
				throw error;
			}
			const workflow = this.getWorkflow();
			const node = this.getNode();
			Logger.error(
				`There was a problem in '${node.name}' node in workflow '${workflow.id}': '${error.description}'`,
				{
					node: node.name,
					workflowId: workflow.id,
					error,
				},
			);
		}

		webhookData.lastTimeChecked = endDate;

		if (Array.isArray(responseData) && responseData.length) {
			return [responseData as INodeExecutionData[]];
		}

		return null;
	}
}
