import type {
	IPollFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	googleApiRequest,
	googleApiRequestAllItems,
	parseRawEmail,
	prepareQuery,
	simplifyOutput,
} from './GenericFunctions';

import { DateTime } from 'luxon';

export class GmailTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Gmail Trigger',
		name: 'gmailTrigger',
		icon: 'file:gmail.svg',
		group: ['trigger'],
		version: 1,
		description:
			'Fetches emails from Gmail and starts the workflow on specified polling intervals.',
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
				displayName: 'Event',
				name: 'event',
				type: 'options',
				default: 'messageReceived',
				options: [
					{
						name: 'Message Received',
						value: 'messageReceived',
					},
				],
			},
			{
				displayName: 'Simplify',
				name: 'simple',
				type: 'boolean',
				default: true,
				description:
					'Whether to return a simplified version of the response instead of the raw data',
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
						description:
							"Prefix for name of the binary property to which to write the attachment. An index starting with 0 will be added. So if name is 'attachment_' the first attachment is saved to 'attachment_0'.",
					},
					{
						displayName: 'Download Attachments',
						name: 'downloadAttachments',
						type: 'boolean',
						default: false,
						description: "Whether the emaail's attachments will be downloaded",
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the labels to display them to user so that they can
			// select them easily
			async getLabels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const labels = await googleApiRequestAllItems.call(
					this,
					'labels',
					'GET',
					'/gmail/v1/users/me/labels',
				);

				for (const label of labels) {
					returnData.push({
						name: label.name,
						value: label.id,
					});
				}

				return returnData.sort((a, b) => {
					if (a.name < b.name) {
						return -1;
					}
					if (a.name > b.name) {
						return 1;
					}
					return 0;
				});
			},
		},
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const webhookData = this.getWorkflowStaticData('node');
		let responseData;

		const now = Math.floor(DateTime.now().toSeconds()).toString();
		const startDate = (webhookData.lastTimeChecked as string) || +now;
		const endDate = +now;

		const options = this.getNodeParameter('options', {}) as IDataObject;
		const filters = this.getNodeParameter('filters', {}) as IDataObject;

		try {
			const qs: IDataObject = {};
			filters.receivedAfter = startDate;

			if (this.getMode() === 'manual') {
				qs.maxResults = 1;
				delete filters.receivedAfter;
			}

			Object.assign(qs, prepareQuery.call(this, filters, 0), options);

			responseData = await googleApiRequest.call(
				this,
				'GET',
				'/gmail/v1/users/me/messages',
				{},
				qs,
			);
			responseData = responseData.messages;

			if (responseData === undefined) {
				responseData = [];
			}

			const simple = this.getNodeParameter('simple') as boolean;

			if (simple) {
				qs.format = 'metadata';
				qs.metadataHeaders = ['From', 'To', 'Cc', 'Bcc', 'Subject'];
			} else {
				qs.format = 'raw';
			}

			for (let i = 0; i < responseData.length; i++) {
				responseData[i] = await googleApiRequest.call(
					this,
					'GET',
					`/gmail/v1/users/me/messages/${responseData[i].id}`,
					{},
					qs,
				);

				if (!simple) {
					const dataPropertyNameDownload =
						(options.dataPropertyAttachmentsPrefixName as string) || 'attachment_';

					responseData[i] = await parseRawEmail.call(
						this,
						responseData[i],
						dataPropertyNameDownload,
					);
				}
			}

			if (simple) {
				responseData = this.helpers.returnJsonArray(
					await simplifyOutput.call(this, responseData as IDataObject[]),
				);
			}
		} catch (error) {
			if (this.getMode() === 'manual' || !webhookData.lastTimeChecked) {
				throw error;
			}
			const workflow = this.getWorkflow();
			const node = this.getNode();
			this.logger.error(
				`There was a problem in '${node.name}' node in workflow '${workflow.id}': '${error.description}'`,
				{
					node: node.name,
					workflowId: workflow.id,
					error,
				},
			);
		}

		const getEmailDateAsSeconds = (email: IDataObject) => {
			const { internalDate, date } = email;
			return internalDate
				? +(internalDate as string) / 1000
				: +DateTime.fromJSDate(new Date(date as string)).toSeconds();
		};

		const lastEmailDate = (responseData as IDataObject[]).reduce((lastDate, { json }) => {
			const emailDate = getEmailDateAsSeconds(json as IDataObject);
			return emailDate > lastDate ? emailDate : lastDate;
		}, 0);

		const nextPollPossibleDuplicates = (responseData as IDataObject[]).reduce(
			(duplicates, { json }) => {
				const emailDate = getEmailDateAsSeconds(json as IDataObject);
				return emailDate === lastEmailDate
					? duplicates.concat((json as IDataObject).id as string)
					: duplicates;
			},
			[] as string[],
		);

		const possibleDuplicates = (webhookData.possibleDuplicates as string[]) || [];
		if (possibleDuplicates.length) {
			responseData = (responseData as IDataObject[]).filter(({ json }) => {
				const { id } = json as IDataObject;
				return !possibleDuplicates.includes(id as string);
			});
		}

		webhookData.possibleDuplicates = nextPollPossibleDuplicates;
		webhookData.lastTimeChecked = lastEmailDate || endDate;

		if (Array.isArray(responseData) && responseData.length) {
			return [responseData as INodeExecutionData[]];
		}

		return null;
	}
}
