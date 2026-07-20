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
import { isSafeObjectProperty, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

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
		// Older versions are aliases of 1.4: all run the same implementation so that
		// stored workflows keep loading, but legacy per-version behavior is gone
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
					propertyHint:
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
							propertyHint:
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
		const staticData = this.getWorkflowStaticData('node');
		const node = this.getNode();
		// State is keyed by node name, so the name must be a safe object key
		if (!isSafeObjectProperty(node.name)) {
			throw new NodeOperationError(
				node,
				`The node name '${node.name}' is reserved, please rename the node`,
			);
		}
		// Upgrade from v1: move root-level state under the node name once
		if (staticData.lastTimeChecked !== undefined && !Object.hasOwn(staticData, node.name)) {
			staticData[node.name] = {
				lastTimeChecked: staticData.lastTimeChecked,
				possibleDuplicates: staticData.possibleDuplicates,
			};
			delete staticData.lastTimeChecked;
			delete staticData.possibleDuplicates;
		}
		const workflowStaticData = staticData as GmailWorkflowStaticDataDictionary;
		if (!Object.hasOwn(workflowStaticData, node.name) || !workflowStaticData[node.name]) {
			workflowStaticData[node.name] = {};
		}
		const nodeStaticData = workflowStaticData[node.name];

		const now = Math.floor(DateTime.now().toSeconds());

		if (this.getMode() !== 'manual') {
			nodeStaticData.lastTimeChecked ??= now;
		}
		const startDate = nodeStaticData.lastTimeChecked ?? now;

		const options = this.getNodeParameter('options', {}) as GmailTriggerOptions;
		const filters = this.getNodeParameter('filters', {}) as GmailTriggerFilters;
		const simple = this.getNodeParameter('simple') as boolean;

		const shouldLimitMessages = this.getMode() !== 'manual';
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
				return startDate;
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

		const includeDrafts = filters.includeDrafts ?? false;

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
			if (fullMessage.labelIds?.includes('SENT') && !fullMessage.labelIds?.includes('INBOX')) {
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

			// Drain IDs listed but not fetched on previous polls before listing more
			const pendingIds = nodeStaticData.pendingMessageIds ?? [];
			if (shouldLimitMessages && pendingIds.length > 0) {
				const idsToFetch = pendingIds.slice(0, budget);
				nodeStaticData.pendingMessageIds = pendingIds.slice(budget);
				const fetchQs = buildFetchQs();

				for (const id of idsToFetch) {
					await fetchAndProcessMessage(id, fetchQs);
				}

				budget -= idsToFetch.length;

				// Track drained IDs as boundary duplicates now — the early-return below
				// skips the state update at the end of poll()
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

			const buildListQs = (receivedAfter: number): IDataObject => {
				const listFilters: GmailTriggerFilters = { ...filters, receivedAfter };
				const listQs: IDataObject = {};

				if (this.getMode() === 'manual') {
					listQs.maxResults = 1;
					delete listFilters.receivedAfter;
				}

				Object.assign(listQs, prepareQuery.call(this, listFilters, 0));

				if (listQs.q) {
					listQs.q += ' -in:scheduled';
				} else {
					listQs.q = '-in:scheduled';
				}
				return listQs;
			};

			// List only as many pages as the budget needs. A leftover cursor is stored
			// with its query boundary (tokens are only valid for their original query)
			// and resumed once pending IDs have drained.
			let messages: ListMessage[];
			if (shouldLimitMessages) {
				const listPages = async (listQs: IDataObject, initialPageToken?: string) => {
					const collected: ListMessage[] = [];
					let pageToken = initialPageToken;
					do {
						const response: MessageListResponse = await googleApiRequest.call(
							this,
							'GET',
							'/gmail/v1/users/me/messages',
							{},
							{ ...listQs, ...(pageToken ? { pageToken } : {}) },
						);
						collected.push.apply(collected, response.messages ?? []);
						pageToken = response.nextPageToken;
					} while (pageToken && collected.length < budget);
					return { messages: collected, nextPageToken: pageToken };
				};

				const cursor = nodeStaticData.backlogCursor;
				let listResult: Awaited<ReturnType<typeof listPages>> | undefined;
				let listBoundary = startDate;
				if (cursor) {
					try {
						listResult = await listPages(buildListQs(cursor.receivedAfter), cursor.pageToken);
						listBoundary = cursor.receivedAfter;
					} catch {
						// Stored page token no longer valid (expired or filters changed)
					}
				}
				listResult ??= await listPages(buildListQs(startDate));

				if (listResult.nextPageToken) {
					nodeStaticData.backlogCursor = {
						pageToken: listResult.nextPageToken,
						receivedAfter: listBoundary,
					};
				} else {
					delete nodeStaticData.backlogCursor;
				}
				messages = listResult.messages;
			} else {
				const messagesResponse: MessageListResponse = await googleApiRequest.call(
					this,
					'GET',
					'/gmail/v1/users/me/messages',
					{},
					buildListQs(startDate),
				);
				messages = messagesResponse.messages ?? [];
			}

			if (!messages.length && !allFetchedMessages.length) {
				return null;
			}

			// Gmail's `after:` query is inclusive at the second boundary, so messages at
			// the lastTimeChecked timestamp can re-list; skip them before fetching
			if (shouldLimitMessages) {
				const possibleDuplicates = new Set(nodeStaticData.possibleDuplicates ?? []);
				if (possibleDuplicates.size > 0) {
					messages = messages.filter((m) => !possibleDuplicates.has(m.id));
				}

				if (!messages.length && !allFetchedMessages.length) {
					return null;
				}
			}

			let messagesToProcess = messages;
			if (shouldLimitMessages && messages.length > budget) {
				messagesToProcess = messages.slice(0, budget);
				nodeStaticData.pendingMessageIds = messages.slice(budget).map((m) => m.id);
			}

			if (messagesToProcess.length > 0) {
				const fetchQs = buildFetchQs();
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

		// In manual mode the pre-fetch duplicate filter above is skipped, so filter
		// at the response level instead.
		if (!shouldLimitMessages) {
			const prevDuplicates = new Set(nodeStaticData.possibleDuplicates ?? []);
			if (prevDuplicates.size > 0) {
				responseData = responseData.filter(({ json }) => {
					if (!json || typeof json.id !== 'string') return false;
					return !prevDuplicates.has(json.id);
				});
			}
		}

		const effectiveLastTimeChecked = Math.floor(Math.max(lastEmailDate, startDate)) || startDate;

		// When lastTimeChecked didn't advance (e.g. only older pending messages were
		// processed), existing possibleDuplicates are still at the query boundary
		if (effectiveLastTimeChecked === startDate && nodeStaticData.possibleDuplicates?.length) {
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
