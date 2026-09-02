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
import { simplifyMemoryNotice } from './utils/descriptions';
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

// Bounds how many pages one poll scans for new messages. A leftover page token
// holds the cursor, so mail beyond the cap stays reachable until a give-up valve
// decides to skip it.
const MAX_SCAN_PAGES = 20;
// Count of stored ids (queued + boundary + set aside) at which the poll stops
// holding the cursor and accepts skipping whatever it did not scan.
const MAX_TRACKED_BACKLOG_IDS = 5_000;
// Attempts one set-aside id gets before the poll drops it with a warning. A
// failed fetch cannot be told apart from a rate limit, and this node does not
// retry inside a poll, so an id gets several polls to come back.
export const MAX_PENDING_FETCH_ATTEMPTS = 10;

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
		builderHint: {
			searchHint:
				'When downstream nodes create records (tasks, rows, tickets) per email, guarantee each email is processed exactly once: filter to unread AND mark each email read/labelled after its record is created, or track handled message ids in a Data Table. Otherwise the same email can be reprocessed into duplicates.',
			relatedNodes: [
				{
					nodeType: 'n8n-nodes-base.gmail',
					relationHint:
						'Mark polled emails as handled after processing (message markAsRead, or addLabels when the trigger query excludes that label) so they are not picked up again',
				},
				{
					nodeType: 'n8n-nodes-base.dataTable',
					relationHint: 'Record handled message ids to skip emails that were already processed',
				},
			],
			extraTypeDefContent: [
				{
					content: `<patterns>
<pattern title="Do not reprocess the same email">
When this trigger feeds an action that creates records (tasks, rows, tickets, messages), ensure each email is handled once: keep \`readStatus: 'unread'\` AND add a Gmail \`markAsRead\` step (\`addLabels\` works only if this trigger's \`q\` also excludes that label — a label does not mark the email read), or record handled message ids in a Data Table — look the id up before creating the record, skip ids already seen, insert it after the create succeeds. The unread filter alone changes nothing if no step ever marks the email read. Wire the mark-as-handled step AFTER the record-creating node, so a mid-run failure cannot consume an email without producing its record.
</pattern>
</patterns>`,
				},
			],
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
						'Keep true by default. When true, returns lightweight metadata (id, threadId, labels, subject, from, to, snippet). When false, fetches and parses the full raw email (adds html, text, textAsHtml, headers, attachments), which uses much more memory and is a common cause of out-of-memory crashes. Only set false when the email body is actually required.',
				},
			},
			simplifyMemoryNotice({ displayOptions: { show: { simple: [false] } } }),
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

		// Applied on every path that returns items — including a tick whose error
		// was swallowed by the catch below, which skips the end of the try block.
		// A failure here is swallowed on the same terms as the rest of the poll: the
		// items go out in the raw shape, as they did before this helper existed.
		// Refusing to deliver them instead would change what a workflow receives,
		// which needs a new node version.
		const simplifyResponseData = async (): Promise<void> => {
			if (!simple || responseData.length === 0) return;

			try {
				responseData = this.helpers.returnJsonArray(
					await simplifyOutput.call(
						this,
						responseData.map((item) => item.json),
					),
				);
			} catch (error) {
				if (this.getMode() === 'manual' || !nodeStaticData.lastTimeChecked) {
					throw error;
				}
				this.logger.error(
					`Gmail Trigger could not simplify the output of '${node.name}': '${error.description}'`,
					{ node: node.name, error },
				);
			}
		};

		// Pessimistic default: poll() swallows non-manual errors and still runs the
		// cursor advance below, so a throw before or during the scan must leave the
		// cursor held. Only an exhausted page token may set this true.
		let windowFullyScanned = false;

		try {
			let budget = maxResults;

<<<<<<< HEAD
			// Drain IDs listed but not fetched on previous polls before listing more
			const pendingIds = nodeStaticData.pendingMessageIds ?? [];
			if (shouldLimitMessages && pendingIds.length > 0) {
				const idsToFetch = pendingIds.slice(0, budget);
				nodeStaticData.pendingMessageIds = pendingIds.slice(budget);
=======
			// A message whose fetch failed waits in its own list rather than in the
			// queue, so it can be retried without holding up everything behind it.
			// Retry those first, because they have waited longest. A failed fetch
			// carries no message, so it costs no budget; only a success does.
			const setAside = nodeStaticData.failedFetches ?? [];
			// An id that used up its attempts stays in the list with no attempts left.
			// That is what makes giving up outlast the poll: the scan below skips every
			// id in this list, while the boundary set is replaced whenever the cursor
			// advances. The message was never fetched, so its date is unknown and the
			// poll cannot tell when the cursor passed it.
			const retryable = setAside.filter(([, attempts]) => attempts < MAX_PENDING_FETCH_ATTEMPTS);
			const givenUp = setAside.filter(([, attempts]) => attempts >= MAX_PENDING_FETCH_ATTEMPTS);

			if (shouldLimitMessages && retryable.length > 0) {
				// Bounded per tick, and the untried tail moves to the front, so a long
				// list cannot spend the whole poll on doomed requests or starve its own
				// later entries.
				const retryNow = retryable.slice(0, maxResults);
				const retryLater = retryable.slice(maxResults);
				const stillFailing: Array<[string, number]> = [];
>>>>>>> 6586dbe05efae090f1b0b2ff0bd8860edb4e966e
				const fetchQs = buildFetchQs();

				for (const [id, attempts] of retryNow) {
					try {
						await fetchAndProcessMessage(id, fetchQs);
						budget -= 1;
					} catch (error) {
						const attempted = attempts + 1;
						if (attempted >= MAX_PENDING_FETCH_ATTEMPTS) {
							this.logger.warn(
								`Gmail Trigger cannot fetch message ${id} after ${attempted} attempts; skipping it`,
								{ node: node.name },
							);
							givenUp.push([id, attempted]);
						} else {
							stillFailing.push([id, attempted]);
						}
					}
				}

				nodeStaticData.failedFetches = [...retryLater, ...stillFailing, ...givenUp];
			}

<<<<<<< HEAD
				// Track drained IDs as boundary duplicates now — the early-return below
				// skips the state update at the end of poll()
=======
			// Process pending messages from a previous poll next. These are IDs a scan
			// found but no poll fetched: beyond the maxResults budget, or left over when
			// a fetch failed mid-poll.
			const pendingIds = nodeStaticData.pendingMessageIds ?? [];
			if (shouldLimitMessages && pendingIds.length > 0 && budget > 0) {
				const fetchQs = buildFetchQs();
				const newlyFailed: Array<[string, number]> = [];

				for (const [index, id] of pendingIds.entries()) {
					// A delivery costs budget, a failure costs a request. Stop on either
					// count, so a queue full of failures cannot spend the whole poll on
					// doomed requests.
					if (budget <= 0 || newlyFailed.length >= maxResults) break;

					try {
						await fetchAndProcessMessage(id, fetchQs);
						budget -= 1;
					} catch (error) {
						// Set the message aside instead of ending the tick: the rest of the
						// queue, and the scan below, must still run. The error is logged
						// here, because this error never reaches the catch at the end of poll().
						this.logger.warn(`Gmail Trigger could not fetch message ${id}; will retry it`, {
							node: node.name,
							error,
						});
						newlyFailed.push([id, 1]);
					}

					// Trim per iteration so every id this loop has not handled yet stays
					// stored: a later throw is swallowed while the cursor can still
					// advance. A failed id leaves the queue for the set-aside list, which
					// is written once the loop ends.
					nodeStaticData.pendingMessageIds = pendingIds.slice(index + 1);
				}

				if (newlyFailed.length > 0) {
					nodeStaticData.failedFetches = [...(nodeStaticData.failedFetches ?? []), ...newlyFailed];
				}
			}

			// While queued ids remain, do not scan: the queue write after a scan replaces
			// the whole queue, so scanning now would drop the ids this poll could not
			// reach.
			if (shouldLimitMessages && (nodeStaticData.pendingMessageIds?.length ?? 0) > 0) {
				await simplifyResponseData();

				// This path returns before the state update at the end of poll(), so it
				// records the boundary itself: Gmail's boundary-inclusive `after:` query
				// would otherwise return again what this poll just delivered.
>>>>>>> 6586dbe05efae090f1b0b2ff0bd8860edb4e966e
				if (allFetchedMessages.length > 0) {
					const merged = new Set([
						...(nodeStaticData.possibleDuplicates ?? []),
						...allFetchedMessages.map((m) => m.id),
					]);
					nodeStaticData.possibleDuplicates = Array.from(merged);
				}

				return responseData.length > 0 ? [responseData] : null;
			}

<<<<<<< HEAD
			const buildListQs = (receivedAfter: number): IDataObject => {
				const listFilters: GmailTriggerFilters = { ...filters, receivedAfter };
				const listQs: IDataObject = {};
=======
			// Scan Gmail for new messages.
			const qs: IDataObject = {};
			const allFilters: GmailTriggerFilters = { ...filters, receivedAfter: startDate };
>>>>>>> 6586dbe05efae090f1b0b2ff0bd8860edb4e966e

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

<<<<<<< HEAD
=======
			let messages: ListMessage[] = [];
			let pageToken: string | undefined;
			let pagesScanned = 0;
			do {
				const messagesResponse: MessageListResponse = await googleApiRequest.call(
					this,
					'GET',
					'/gmail/v1/users/me/messages',
					{},
					pageToken ? { ...qs, pageToken } : qs,
				);
				messages.push(...(messagesResponse.messages ?? []));
				pageToken = messagesResponse.nextPageToken;
				pagesScanned++;
			} while (shouldLimitMessages && pageToken && pagesScanned < MAX_SCAN_PAGES);
			// A leftover token means the cap stopped the scan short. Gmail returns
			// newest first, so the remainder is older mail; a cursor moved past it
			// would never reach it again.
			windowFullyScanned = !pageToken;

			// Pagination can repeat an id across pages when the mailbox shifts
			// between page fetches; one id must map to one delivery.
			messages = Array.from(new Map(messages.map((m) => [m.id, m])).values());

>>>>>>> 6586dbe05efae090f1b0b2ff0bd8860edb4e966e
			if (!messages.length && !allFetchedMessages.length) {
				return null;
			}

<<<<<<< HEAD
			// Gmail's `after:` query is inclusive at the second boundary, so messages at
			// the lastTimeChecked timestamp can re-list; skip them before fetching
=======
			// For v1.4+, filter out already-handled messages before fetching to save API
			// calls. Gmail's `after:` query is inclusive at the second boundary, and a
			// held cursor re-scans its whole window, so handled messages can reappear.
>>>>>>> 6586dbe05efae090f1b0b2ff0bd8860edb4e966e
			if (shouldLimitMessages) {
				// Set-aside ids are dropped along with the handled ones: that list
				// already owns them and retries them every poll, so queueing them here
				// as well would have both paths fetch the same message.
				const alreadyTracked = new Set([
					...(nodeStaticData.possibleDuplicates ?? []),
					...(nodeStaticData.failedFetches ?? []).map(([id]) => id),
					// Fetched earlier in this same poll. Kept in memory rather than read
					// from the boundary set, which is only written once the poll is sure
					// it can deliver.
					...allFetchedMessages.map((m) => m.id),
				]);
				if (alreadyTracked.size > 0) {
					messages = messages.filter((m) => !alreadyTracked.has(m.id));
				}

				if (!messages.length && !allFetchedMessages.length) {
					// No-progress valve: the page cap stopped the scan short, yet every id
					// it reached is already tracked. Holding again would repeat this
					// tick forever — no backlog progress and no new mail. Give up loudly:
					// jump the cursor to now and skip what the cap keeps unreachable.
					if (!windowFullyScanned) {
						this.logger.warn(
							'Gmail Trigger backlog cannot progress past the page cap; advancing past older messages it could not scan',
							{ node: node.name },
						);
						nodeStaticData.lastTimeChecked = +now;
						// The cursor jumped to now, so ids from the old window are no longer
						// at the boundary. Keeping them would grow the stored-id count for
						// nothing — every other path merges the set instead.
						nodeStaticData.possibleDuplicates = [];
					}
					return null;
				}
			}

			let messagesToProcess = messages;
			let beyondBudgetIds: string[] = [];
			if (shouldLimitMessages && messages.length > budget) {
				messagesToProcess = messages.slice(0, budget);
				beyondBudgetIds = messages.slice(budget).map((m) => m.id);
			}

			// Queue every scanned id before fetching any of them, so a throw on the
			// first fetch cannot leave ids in no stored state: the loop below trims
			// this back down as each fetch succeeds. Stays gated on the version
			// check, or a pre-1.4 node would store a queue its own drain path
			// ignores until someone bumps its version.
			if (shouldLimitMessages) {
				nodeStaticData.pendingMessageIds = [
					...messagesToProcess.map((m) => m.id),
					...beyondBudgetIds,
				];
			}

			if (messagesToProcess.length > 0) {
				const fetchQs = buildFetchQs();
<<<<<<< HEAD
				for (const message of messagesToProcess) {
					await fetchAndProcessMessage(message.id, fetchQs);
				}
			}
=======
				Object.assign(fetchQs, options);
				delete fetchQs.includeDrafts;

				const scannedButFailed: Array<[string, number]> = [];
>>>>>>> 6586dbe05efae090f1b0b2ff0bd8860edb4e966e

				for (const [index, message] of messagesToProcess.entries()) {
					try {
						await fetchAndProcessMessage(message.id, fetchQs);
					} catch (error) {
						// Same rule as the queue drain: set this message aside, count the
						// attempt, and carry on with the rest of the batch. Letting the
						// error out here would skip every message behind it and give this
						// one an attempt that no count remembers.
						this.logger.warn(`Gmail Trigger could not fetch message ${message.id}; will retry it`, {
							node: node.name,
							error,
						});
						scannedButFailed.push([message.id, 1]);
					}

					if (shouldLimitMessages) {
						// Trim what the queue write above seeded: keep only the ids this loop
						// has not handled yet, so a later throw leaves every unhandled id
						// stored while the cursor may still advance past all of them.
						nodeStaticData.pendingMessageIds = [
							...messagesToProcess.slice(index + 1).map((m) => m.id),
							...beyondBudgetIds,
						];
					}
				}

				if (scannedButFailed.length > 0) {
					nodeStaticData.failedFetches = [
						...(nodeStaticData.failedFetches ?? []),
						...scannedButFailed,
					];
				}
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

		await simplifyResponseData();

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

<<<<<<< HEAD
		const effectiveLastTimeChecked = Math.floor(Math.max(lastEmailDate, startDate)) || startDate;

		// When lastTimeChecked didn't advance (e.g. only older pending messages were
		// processed), existing possibleDuplicates are still at the query boundary
		if (effectiveLastTimeChecked === startDate && nodeStaticData.possibleDuplicates?.length) {
=======
		let effectiveLastTimeChecked = Math.floor(Math.max(lastEmailDate, +startDate)) || +startDate;
		if (shouldLimitMessages && !windowFullyScanned) {
			const trackedIds =
				(nodeStaticData.pendingMessageIds?.length ?? 0) +
				(nodeStaticData.possibleDuplicates?.length ?? 0) +
				(nodeStaticData.failedFetches?.length ?? 0);
			if (trackedIds < MAX_TRACKED_BACKLOG_IDS) {
				// Older mail sits beyond the page cap, unscanned. Hold the cursor so later
				// polls can still reach it. The possibleDuplicates update below keeps every
				// handled id filterable, so a re-scan under a held cursor cannot re-emit
				// them.
				effectiveLastTimeChecked = +startDate;
			} else {
				// Give-up valve: holding again would grow the tracked-id state without
				// bound. Advance and accept skipping the unscanned older mail instead.
				this.logger.warn(
					`Gmail Trigger backlog exceeds ${MAX_TRACKED_BACKLOG_IDS} tracked ids; advancing past older messages it could not scan`,
					{ node: node.name },
				);
			}
		}

		// When lastTimeChecked didn't advance (only older pending messages were
		// processed, or the cursor is held), preserve existing possibleDuplicates —
		// they're still at the query boundary.
		if (effectiveLastTimeChecked === +startDate && nodeStaticData.possibleDuplicates?.length) {
>>>>>>> 6586dbe05efae090f1b0b2ff0bd8860edb4e966e
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
