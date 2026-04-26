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
	ListMessage,
	Message,
	MessageBookkeeping,
	MessageListResponse,
} from './types';

export class GmailTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Gmail Trigger',
		name: 'gmailTrigger',
		icon: 'file:gmail.svg',
		group: ['trigger'],
		version: [1, 1.1, 1.2, 1.3, 1.4],
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
				builderHint: {
					message:
						'Set to false when the email body is needed for AI analysis, summarization, or content processing. When true, only returns snippet (preview text). When false, returns full email with {id, threadId, labelIds, headers, html, text, textAsHtml, subject, date, to, from, messageId, replyTo}.',
				},
			},
			{
				displayName: 'Max Emails per Poll',
				name: 'maxResults',
				type: 'number',
				default: 10,
				typeOptions: {
					minValue: 1,
					maxValue: 50,
				},
				description:
					'Maximum number of emails to fetch each time the node polls for new messages. If more emails arrive between polls, the remaining ones will be picked up in subsequent polls.',
				displayOptions: {
					show: {
						'@version': [{ _cnd: { gte: 1.4 } }],
					},
				},
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
						builderHint: {
							message:
								'Always set a search query to filter emails. Uses Gmail search syntax, e.g. "from:example@gmail.com", "subject:invoice", "has:attachment", "label:important", "newer_than:1d". Combine with spaces for AND: "from:shop@example.com subject:delivery". Without this filter, ALL incoming emails will trigger the workflow.',
						},
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
		const simple = this.getNodeParameter('simple') as boolean;

		const shouldLimitMessages = node.typeVersion >= 1.4 && this.getMode() !== 'manual';
		const maxResults = shouldLimitMessages
			? (this.getNodeParameter('maxResults', 10) as number)
			: Infinity;

		let responseData: INodeExecutionData[] = [];
		const allFetchedMessages: MessageBookkeeping[] = [];

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
				return +startDate;
			}

			return date;
		};

		const buildFetchQs = (): IDataObject => {
			const qs: IDataObject = {};
			if (simple) {
				qs.format = 'metadata';
				qs.metadataHeaders = ['From', 'To', 'Cc', 'Bcc', 'Subject'];
			} else {
				qs.format = 'raw';
			}
			return qs;
		};

		let includeDrafts = false;
		if (node.typeVersion > 1.1) {
			includeDrafts = filters.includeDrafts ?? false;
		} else {
			includeDrafts = filters.includeDrafts ?? true;
		}

		const fetchAndProcessMessage = async (
			messageId: string,
			fetchQs: IDataObject,
		): Promise<void> => {
			const fullMessage = (await googleApiRequest.call(
				this,
				'GET',
				`/gmail/v1/users/me/messages/${messageId}`,
				{},
				fetchQs,
			)) as Message;

			allFetchedMessages.push({
				id: fullMessage.id,
				date: getEmailDateAsSeconds(fullMessage),
			});

			if (!includeDrafts && fullMessage.labelIds?.includes('DRAFT')) {
				return;
			}
			if (
				node.typeVersion > 1.2 &&
				fullMessage.labelIds?.includes('SENT') &&
				!fullMessage.labelIds?.includes('INBOX')
			) {
				return;
			}

			if (!simple) {
				const dataPropertyNameDownload = options.dataPropertyAttachmentsPrefixName || 'attachment_';
				const parsed = await parseRawEmail.call(this, fullMessage, dataPropertyNameDownload);
				responseData.push(parsed);
			} else {
				responseData.push({ json: fullMessage });
			}
		};

		try {
			let budget = maxResults;

			// Process pending messages from previous poll first.
			// These are IDs that were listed but not fetched last time due to maxResults.
			const pendingIds = nodeStaticData.pendingMessageIds ?? [];
			if (shouldLimitMessages && pendingIds.length > 0) {
				const idsToFetch = pendingIds.slice(0, budget);
				nodeStaticData.pendingMessageIds = pendingIds.slice(budget);
				const fetchQs = buildFetchQs();

				for (const id of idsToFetch) {
					await fetchAndProcessMessage(id, fetchQs);
				}

				budget -= idsToFetch.length;

				// Record drained IDs in possibleDuplicates so Gmail's boundary-inclusive
				// `after:` query can't re-list a message we just emitted and push it back
				// into pendingMessageIds as overflow. Also covers the early-return path,
				// where the state update at the end of poll() is skipped.
				if (allFetchedMessages.length > 0) {
					const merged = new Set([
						...(nodeStaticData.possibleDuplicates ?? []),
						...allFetchedMessages.map((m) => m.id),
					]);
					nodeStaticData.possibleDuplicates = Array.from(merged);
				}

				// If we still have pending IDs, don't list new messages yet.
				if (nodeStaticData.pendingMessageIds.length > 0) {
					if (simple && responseData.length > 0) {
						responseData = this.helpers.returnJsonArray(
							await simplifyOutput.call(
								this,
								responseData.map((item) => item.json),
							),
						);
					}
					return responseData.length > 0 ? [responseData] : null;
				}
			}

			// List new messages from Gmail.
			const qs: IDataObject = {};
			const allFilters: GmailTriggerFilters = { ...filters, receivedAfter: startDate };

			if (this.getMode() === 'manual') {
				qs.maxResults = 1;
				delete allFilters.receivedAfter;
			}

			Object.assign(qs, prepareQuery.call(this, allFilters, 0), options);

			const messagesResponse: MessageListResponse = await googleApiRequest.call(
				this,
				'GET',
				'/gmail/v1/users/me/messages',
				{},
				qs,
			);

			let messages: ListMessage[] = messagesResponse.messages ?? [];

			if (!messages.length && !allFetchedMessages.length) {
				return null;
			}

			// For v1.4+, filter out boundary duplicates before fetching to save API calls.
			// Gmail's `after:` query is inclusive at the second boundary, so messages at
			// the lastTimeChecked timestamp can reappear.
			if (shouldLimitMessages) {
				const possibleDuplicates = new Set(nodeStaticData.possibleDuplicates ?? []);
				if (possibleDuplicates.size > 0) {
					messages = messages.filter((m) => !possibleDuplicates.has(m.id));
				}

				if (!messages.length && !allFetchedMessages.length) {
					return null;
				}
			}

			// Take only what fits in the remaining budget, store the rest as pending.
			let messagesToProcess = messages;
			if (shouldLimitMessages && messages.length > budget) {
				messagesToProcess = messages.slice(0, budget);
				nodeStaticData.pendingMessageIds = messages.slice(budget).map((m) => m.id);
			}

			if (messagesToProcess.length > 0) {
				const fetchQs = buildFetchQs();
				Object.assign(fetchQs, options);
				delete fetchQs.includeDrafts;

				for (const message of messagesToProcess) {
					await fetchAndProcessMessage(message.id, fetchQs);
				}
			}

			if (simple && responseData.length > 0) {
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
			return null;
		}

		const lastEmailDate = allFetchedMessages.reduce(
			(lastDate, message) => (message.date > lastDate ? message.date : lastDate),
			0,
		);

		const nextPollPossibleDuplicates = allFetchedMessages.map((m) => m.id);

		// For older versions, filter at the response level since the pre-fetch filter
		// above is gated to v1.4+. v1.4+ already skipped these before fetching.
		if (!shouldLimitMessages) {
			const prevDuplicates = new Set(nodeStaticData.possibleDuplicates ?? []);
			if (prevDuplicates.size > 0) {
				responseData = responseData.filter(({ json }) => {
					if (!json || typeof json.id !== 'string') return false;
					return !prevDuplicates.has(json.id);
				});
			}
		}

		const effectiveLastTimeChecked = Math.floor(Math.max(lastEmailDate, +startDate)) || +startDate;

		// When lastTimeChecked didn't advance (e.g., only older pending messages were processed),
		// preserve existing possibleDuplicates — they're still at the query boundary.
		if (effectiveLastTimeChecked === +startDate && nodeStaticData.possibleDuplicates?.length) {
			const merged = new Set([...nodeStaticData.possibleDuplicates, ...nextPollPossibleDuplicates]);
			nodeStaticData.possibleDuplicates = Array.from(merged);
		} else {
			nodeStaticData.possibleDuplicates = nextPollPossibleDuplicates;
		}
		nodeStaticData.lastTimeChecked = effectiveLastTimeChecked;

		if (Array.isArray(responseData) && responseData.length) {
			return [responseData];
		}

		return null;
	}
}
