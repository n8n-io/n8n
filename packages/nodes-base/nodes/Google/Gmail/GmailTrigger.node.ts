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
import { simplifyMemoryNotice } from './utils/descriptions';
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
// The no-progress valve fires on this many consecutive polls that reach nothing
// new. More than one sample is needed: one slow response can stop a scan short
// where the next poll, with a fresh budget, reaches further. A window the page
// cap wedges waits the same run, so it needs this many polls to give up where it
// used to give up on the first.
const MAX_NO_PROGRESS_TICKS = 3;

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
		// How far this tick may reach before it must return — bounds scanning and
		// fetching time, not delivery volume (maxResults stays the per-tick bound).
		// Only consulted on shouldLimitMessages paths; pre-1.4 and manual polls are
		// unchanged.
		const pollDeadline = Date.now() + this.getPollBudgetMs();
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

			// A fetched message is progress, whether it came from the pending queue or
			// a fresh scan, so the no-progress run starts over. Unconditional, unlike
			// the clear in the scan path: a poll that fetched anything writes the
			// boundary set below in any case, so this write costs no extra save.
			nodeStaticData.noProgressTicks = 0;

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
			// Item-count budget (remaining maxResults) — distinct from the time
			// budget behind pollDeadline.
			let budget = maxResults;

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
				// Bounded per tick. Ids this poll did not reach come first, then the
				// untried tail, so a long list cannot spend the whole poll on doomed
				// requests or starve its own later entries.
				const retryNow = retryable.slice(0, maxResults);
				const retryLater = retryable.slice(maxResults);
				const stillFailing: Array<[string, number]> = [];
				const fetchQs = buildFetchQs();
				let retried = 0;

				for (const [id, attempts] of retryNow) {
					retried += 1;
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

					// Checked after the fetch so every poll retries at least one id. This
					// pass runs before the queue and the scan, so without it a slow set of
					// retries could spend the whole poll.
					if (Date.now() >= pollDeadline) break;
				}

				// Ids this poll did not reach keep their counts and go to the front, so
				// the next poll starts with them.
				nodeStaticData.failedFetches = [
					...retryNow.slice(retried),
					...retryLater,
					...stillFailing,
					...givenUp,
				];
			}

			// Process pending messages from a previous poll next. These are IDs a scan
			// found but no poll fetched: beyond the maxResults budget, past the time
			// budget of the poll that scanned them, or left over when a fetch failed
			// mid-poll.
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
					// Checked after the fetch, and after the trim above, so every poll
					// handles at least one id and the id it just delivered leaves the queue.
					// A break above the trim re-delivers it: this drain does not filter
					// against the boundary set.
					if (Date.now() >= pollDeadline) break;
				}

				if (newlyFailed.length > 0) {
					nodeStaticData.failedFetches = [...(nodeStaticData.failedFetches ?? []), ...newlyFailed];
				}
			}

			// While queued ids remain — or fetching them used up this poll's budget —
			// do not scan: the queue write after a scan replaces the whole queue, so
			// scanning now would drop the ids this poll could not reach. The budget
			// clause needs a fetch of its own, so a spent budget alone never keeps a
			// poll from scanning — only a queue that still holds ids does.
			if (
				shouldLimitMessages &&
				((nodeStaticData.pendingMessageIds?.length ?? 0) > 0 ||
					(allFetchedMessages.length > 0 && Date.now() >= pollDeadline))
			) {
				await simplifyResponseData();

				// This path returns before the state update at the end of poll(), so it
				// records the boundary itself: Gmail's boundary-inclusive `after:` query
				// would otherwise return again what this poll just delivered.
				if (allFetchedMessages.length > 0) {
					const merged = new Set([
						...(nodeStaticData.possibleDuplicates ?? []),
						...allFetchedMessages.map((m) => m.id),
					]);
					nodeStaticData.possibleDuplicates = Array.from(merged);
				}

				return responseData.length > 0 ? [responseData] : null;
			}

			// Scan Gmail for new messages.
			const qs: IDataObject = {};
			const allFilters: GmailTriggerFilters = { ...filters, receivedAfter: startDate };

			if (this.getMode() === 'manual') {
				qs.maxResults = 1;
				delete allFilters.receivedAfter;
			}

			Object.assign(qs, prepareQuery.call(this, allFilters, 0), options);

			if (node.typeVersion > 1.3) {
				if (qs.q) {
					qs.q += ' -in:scheduled';
				} else {
					qs.q = '-in:scheduled';
				}
			}

			let messages: ListMessage[] = [];
			let pageToken: string | undefined;
			let pagesScanned = 0;
			// The deadline sits in the loop condition: the do-while always scans page
			// one, so an already-spent budget still makes progress (mirrors the fetch
			// loops).
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
			} while (
				shouldLimitMessages &&
				pageToken &&
				pagesScanned < MAX_SCAN_PAGES &&
				Date.now() < pollDeadline
			);
			// A leftover token means the time budget or the cap stopped the scan short.
			// Gmail returns newest first, so the remainder is older mail; a cursor moved
			// past it would never reach it again.
			windowFullyScanned = !pageToken;

			// Pagination can repeat an id across pages when the mailbox shifts
			// between page fetches; one id must map to one delivery.
			messages = Array.from(new Map(messages.map((m) => [m.id, m])).values());

			// An empty page set is not an early return: Gmail ends a list only by
			// dropping the page token, so on v1.4+ this must reach the no-progress valve
			// below. Every other version falls through to the same null return.

			// For v1.4+, filter out already-handled messages before fetching to save API
			// calls. Gmail's `after:` query is inclusive at the second boundary, and a
			// held cursor re-scans its whole window, so handled messages can reappear.
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
					// No-progress valve: the scan was stopped short, yet every id it
					// reached is already tracked. One such poll proves little — a slow
					// response can stop a scan short where the next poll, with a fresh
					// budget, reaches further. Only a run of them means the window is
					// wedged; then give up loudly: jump the cursor to now and skip what
					// stays out of reach.
					if (!windowFullyScanned) {
						const noProgressTicks = (nodeStaticData.noProgressTicks ?? 0) + 1;
						if (noProgressTicks < MAX_NO_PROGRESS_TICKS) {
							nodeStaticData.noProgressTicks = noProgressTicks;
							return null;
						}
						this.logger.warn(
							"Gmail Trigger backlog cannot progress within one poll's reach; advancing past older messages it could not scan",
							{ node: node.name },
						);
						nodeStaticData.lastTimeChecked = +now;
						// The cursor jumped to now, so ids from the old window are no longer
						// at the boundary. Keeping them would grow the stored-id count for
						// nothing — every other path merges the set instead.
						nodeStaticData.possibleDuplicates = [];
						nodeStaticData.noProgressTicks = 0;
					} else if (nodeStaticData.noProgressTicks) {
						// The scan exhausted the token, so nothing is out of reach and the
						// window is not wedged. Without this, a quiet poll between two slow
						// ones keeps the count and the run no longer has to be consecutive.
						// Only written when there is a count to clear: an idle node polls
						// this path every tick, and any write marks the static data dirty.
						nodeStaticData.noProgressTicks = 0;
					}
					return null;
				}
			}

			// Take only what fits in the remaining maxResults budget, store the rest
			// as pending.
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
				Object.assign(fetchQs, options);
				delete fetchQs.includeDrafts;

				const scannedButFailed: Array<[string, number]> = [];

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
						// Checked after the fetch, and after the trim above, so every poll
						// fetches at least one message and no delivered id stays queued.
						if (Date.now() >= pollDeadline) break;
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

		let effectiveLastTimeChecked = Math.floor(Math.max(lastEmailDate, +startDate)) || +startDate;
		if (shouldLimitMessages && !windowFullyScanned) {
			const trackedIds =
				(nodeStaticData.pendingMessageIds?.length ?? 0) +
				(nodeStaticData.possibleDuplicates?.length ?? 0) +
				(nodeStaticData.failedFetches?.length ?? 0);
			if (trackedIds < MAX_TRACKED_BACKLOG_IDS) {
				// Older mail sits past where the scan stopped, at the page cap or at the
				// time budget. Hold the cursor so later polls can still reach it. The
				// possibleDuplicates update below keeps every handled id filterable, so a
				// re-scan under a held cursor cannot re-emit them.
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
