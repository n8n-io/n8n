import { DateTime } from 'luxon';
import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import {
	googleApiRequest,
	googleApiRequestAllItems,
	parseRawEmail,
	prepareQuery,
	simplifyOutput,
} from './GenericFunctions';
import type {
	GmailTriggerFilters,
	GmailTriggerOptions,
	GmailWorkflowStaticData,
	GmailWorkflowStaticDataDictionary,
	Label,
	Message,
	MessageListResponse,
} from './types';

export class GmailTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Gmail Trigger',
		name: 'gmailTrigger',
		icon: 'file:gmail.svg',
		group: ['trigger'],
		version: [1, 1.1, 1.2, 1.3],
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
		outputs: [NodeConnectionTypes.Main],
		hints: [
			{
				type: 'info',
				message:
					'Multiple items will be returned if multiple messages are received within the polling interval. Make sure your workflow can handle multiple items.',
				whenToDisplay: 'beforeExecution',
				location: 'outputPane',
			},
		],
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
						displayName: 'Include Drafts',
						name: 'includeDrafts',
						type: 'boolean',
						default: false,
						description: 'Whether to include email drafts in the results',
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
							'Only return messages with labels that match all of the specified label IDs. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
				placeholder: 'Add option',
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
						description: "Whether the email's attachments will be downloaded",
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

				const labels = (await googleApiRequestAllItems.call(
					this,
					'labels',
					'GET',
					'/gmail/v1/users/me/labels',
				)) as Label[];

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
		const workflowStaticData = this.getWorkflowStaticData('node') as
			| GmailWorkflowStaticData
			| GmailWorkflowStaticDataDictionary;
		const node = this.getNode();

		let nodeStaticData = (workflowStaticData ?? {}) as GmailWorkflowStaticData;
		if (node.typeVersion > 1) {
			const nodeName = node.name;
			const dictionary = workflowStaticData as GmailWorkflowStaticDataDictionary;
			if (!(nodeName in workflowStaticData)) {
				dictionary[nodeName] = {};
			}

			nodeStaticData = dictionary[nodeName];
		}

		const now = Math.floor(DateTime.now().toSeconds()).toString();

		if (this.getMode() !== 'manual') {
			nodeStaticData.lastTimeChecked ??= +now;
		}
		const startDate = nodeStaticData.lastTimeChecked ?? +now;

		const options = this.getNodeParameter('options', {}) as GmailTriggerOptions;
		const filters = this.getNodeParameter('filters', {}) as GmailTriggerFilters;

		let responseData: INodeExecutionData[] = [];
		const allFetchedMessages: Message[] = [];

		try {
			const qs: IDataObject = {};
			const allFilters: GmailTriggerFilters = { ...filters, receivedAfter: startDate };

			if (this.getMode() === 'manual') {
				qs.maxResults = 1;
				delete allFilters.receivedAfter;
			}

			Object.assign(qs, prepareQuery.call(this, allFilters, 0), options);

			// Extract and log the timestamp from the query string for debugging
			const queryString = qs.q as string;
			const timestampMatch = queryString?.match(/after:(\d+)/);
			const filterTimestamp = timestampMatch ? parseInt(timestampMatch[1], 10) : 0;
			const filterDate = DateTime.fromMillis(filterTimestamp * 1000);

			this.logger.debug(
				`[GMAIL TRIGGER]: Gmail query parameters - Query: ${JSON.stringify(qs)}, Filter Date: ${filterDate.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS)}, Current Date: ${DateTime.now().toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS)}`,
			);

			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const messagesResponse: MessageListResponse = await googleApiRequest.call(
				this,
				'GET',
				'/gmail/v1/users/me/messages',
				{},
				qs,
			);

			const messages = messagesResponse.messages ?? [];

			this.logger.debug(`[GMAIL TRIGGER]: Found ${messages.length} message(s) matching query`);

			if (!messages.length) {
				return null;
			}

			const simple = this.getNodeParameter('simple') as boolean;

			if (simple) {
				qs.format = 'metadata';
				qs.metadataHeaders = ['From', 'To', 'Cc', 'Bcc', 'Subject'];
			} else {
				qs.format = 'raw';
			}

			let includeDrafts = false;
			if (node.typeVersion > 1.1) {
				includeDrafts = filters.includeDrafts ?? false;
			} else {
				includeDrafts = filters.includeDrafts ?? true;
			}

			delete qs.includeDrafts;

			for (const message of messages) {
				this.logger.debug(
					`[GMAIL TRIGGER]: Fetching Gmail message - ID: ${message.id}, Thread ID: ${message.threadId}`,
				);

				const fullMessage = (await googleApiRequest.call(
					this,
					'GET',
					`/gmail/v1/users/me/messages/${message.id}`,
					{},
					qs,
				)) as Message;

				const messageDate = new Date(parseInt(fullMessage.internalDate ?? '0'));
				const subjectHeader = fullMessage.payload?.headers?.find(
					(header: { name: string; value: string }) => header.name === 'Subject',
				);

				this.logger.debug(
					`[GMAIL TRIGGER]: Gmail message details - ID: ${fullMessage.id}, Subject: ${subjectHeader?.value ?? 'No subject'}, Labels: ${fullMessage.labelIds?.join(', ') || 'None'}, Date: ${messageDate.toLocaleString()}`,
				);

				allFetchedMessages.push(fullMessage);

				if (!includeDrafts) {
					if (fullMessage.labelIds?.includes('DRAFT')) {
						this.logger.debug(
							`[GMAIL TRIGGER]: Gmail message ID: ${fullMessage.id} is a draft, skipping`,
						);
						continue;
					}
				}
				if (
					node.typeVersion > 1.2 &&
					fullMessage.labelIds?.includes('SENT') &&
					!fullMessage.labelIds?.includes('INBOX')
				) {
					this.logger.debug(
						`[GMAIL TRIGGER]: Gmail message ID: ${fullMessage.id} is a sent message, skipping`,
					);
					continue;
				}

				if (!simple) {
					const dataPropertyNameDownload =
						options.dataPropertyAttachmentsPrefixName || 'attachment_';

					const parsed = await parseRawEmail.call(this, fullMessage, dataPropertyNameDownload);
					responseData.push(parsed);
				} else {
					responseData.push({ json: fullMessage });
				}
			}

			if (simple) {
				this.logger.debug('[GMAIL TRIGGER]: Simplifying and returning output');
				responseData = this.helpers.returnJsonArray(
					await simplifyOutput.call(
						this,
						responseData.map((item) => item.json),
					),
				);
			}
		} catch (error) {
			if (this.getMode() === 'manual' || !nodeStaticData.lastTimeChecked) {
				throw error;
			}
			const workflow = this.getWorkflow();
			this.logger.error(
				`There was a problem in '${node.name}' node in workflow '${workflow.id}': '${error.description}'`,
				{
					node: node.name,
					workflowId: workflow.id,
					error,
				},
			);
		}

		if (!allFetchedMessages.length) {
			this.logger.debug('[GMAIL TRIGGER]: No messages found, no execution is expected');
			return null;
		}

		const emailsWithInvalidDate = new Set<string>();

		const getEmailDateAsSeconds = (email: Message): number => {
			let date;

			if (email.internalDate) {
				date = +email.internalDate / 1000;
			} else if (email.date) {
				date = +DateTime.fromJSDate(new Date(email.date)).toSeconds();
			} else if (email.headers?.date) {
				date = +DateTime.fromJSDate(new Date(email.headers.date)).toSeconds();
			}

			if (!date || isNaN(date)) {
				emailsWithInvalidDate.add(email.id);
				this.logger.debug(`[GMAIL TRIGGER]: Email ID: ${email.id} has invalid date, skipping`);
				return +startDate;
			}

			return date;
		};

		const lastEmailDate = allFetchedMessages.reduce((lastDate, message) => {
			const emailDate = getEmailDateAsSeconds(message);
			return emailDate > lastDate ? emailDate : lastDate;
		}, 0);

		this.logger.debug(
			`[GMAIL TRIGGER]: After reducing the last email date (${lastEmailDate}), ${allFetchedMessages.length} messages remaining`,
		);

		const nextPollPossibleDuplicates = allFetchedMessages.reduce((duplicates, message) => {
			const emailDate = getEmailDateAsSeconds(message);
			return emailDate <= lastEmailDate ? duplicates.concat(message.id) : duplicates;
		}, Array.from(emailsWithInvalidDate));

		this.logger.debug(
			`[GMAIL TRIGGER]: After reducing the possible duplicates, ${nextPollPossibleDuplicates.length} duplicates remaining`,
		);

		const possibleDuplicates = new Set(nodeStaticData.possibleDuplicates ?? []);
		if (possibleDuplicates.size > 0) {
			responseData = responseData.filter(({ json }) => {
				if (!json || typeof json.id !== 'string') return false;
				return !possibleDuplicates.has(json.id);
			});
		}

		this.logger.debug(
			`[GMAIL TRIGGER]: After filtering the possible duplicates, ${responseData.length} messages remaining`,
		);

		nodeStaticData.possibleDuplicates = nextPollPossibleDuplicates;

		const lastCheckedTimestamp = lastEmailDate ?? +startDate;
		const lastCheckedDate = DateTime.fromSeconds(lastCheckedTimestamp);
		this.logger.debug(
			`[GMAIL TRIGGER]: Updating last time checked - Timestamp: ${lastCheckedTimestamp}, Date: ${lastCheckedDate.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS)}`,
		);
		nodeStaticData.lastTimeChecked = lastEmailDate ?? +startDate;

		if (Array.isArray(responseData) && responseData.length) {
			this.logger.debug(`[GMAIL TRIGGER]: Returning ${responseData.length} messages`);
			return [responseData];
		}
		this.logger.debug('[GMAIL TRIGGER]: No execution is expected');
		return null;
	}
}
