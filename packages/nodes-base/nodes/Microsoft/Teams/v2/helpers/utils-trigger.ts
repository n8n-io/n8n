import { randomBytes } from 'crypto';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { isRecord } from '@n8n/utils/is-record';
import type { IHookFunctions, IDataObject, IWebhookFunctions } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import type {
	TeamResponse,
	ChannelResponse,
	SubscriptionResponse,
	LifecycleNotification,
} from './types';
import { verifySignature as verifySignatureGeneric } from '../../../../../utils/webhook-signature-verification';
import {
	buildTeamsPath,
	getTeamsCredentialType,
	joinedTeamsEndpoint,
	microsoftApiRequest,
	microsoftApiRequestAllItems,
	SERVICE_PRINCIPAL_AUTH,
} from '../transport';
import { CHAT_SUBSCRIPTION_FORBIDDEN } from '../transport/forbiddenHints';

export function generateClientState(): string {
	return randomBytes(32).toString('hex');
}

/** One shape for every trigger log line: the prefix, the workflow and node, then the fields. */
export function logTrigger(
	this: IHookFunctions | IWebhookFunctions,
	level: 'debug' | 'warn',
	message: string,
	fields: Record<string, unknown> = {},
): void {
	this.logger[level](`Microsoft Teams Trigger: ${message}`, {
		workflowId: this.getWorkflow().id,
		nodeName: this.getNode().name,
		...fields,
	});
}

// Graph caps Teams subscriptions at 4320 minutes. 4318 keeps a margin for clock skew.
const SUBSCRIPTION_TTL_MINUTES = 4318;

// A subscription this close to its expiry counts as gone, so the node replaces it in time.
const SUBSCRIPTION_LIVENESS_MARGIN_MS = 5 * 60 * 1000;

function newSubscriptionExpiry(): string {
	return new Date(Date.now() + SUBSCRIPTION_TTL_MINUTES * 60 * 1000).toISOString();
}

export function isLiveSubscription(subscription: SubscriptionResponse): boolean {
	const expiresAt = new Date(subscription.expirationDateTime).getTime();
	return expiresAt - Date.now() > SUBSCRIPTION_LIVENESS_MARGIN_MS;
}

/** The stored clientState. An empty string counts as none, as in `verifyWebhook`. */
export function getStoredSecret(webhookData: IDataObject): string | undefined {
	const secret = webhookData.webhookSecret;
	return typeof secret === 'string' && secret.length > 0 ? secret : undefined;
}

/** The stored subscription ids, strings only. */
export function getStoredIds(webhookData: IDataObject): string[] {
	return Array.isArray(webhookData.subscriptionIds)
		? webhookData.subscriptionIds.filter((id): id is string => typeof id === 'string')
		: [];
}

/**
 * Deletes every id once, one after the other, and returns the ids Graph refused to remove.
 * Never throws: a 404 counts as done, an id that fails validation is warned only, and every
 * other refusal is warned and returned, so the caller decides what it means.
 */
export async function deleteSubscriptions(
	this: IHookFunctions | IWebhookFunctions,
	ids: Iterable<string>,
): Promise<string[]> {
	const refused: string[] = [];
	for (const id of new Set(ids)) {
		let path: string;
		try {
			path = buildTeamsPath.call(this, ['/v1.0/subscriptions/', { id }]);
		} catch (error) {
			// No Graph call can ever succeed for this id, so it is not reported.
			logTrigger.call(this, 'warn', 'failed to remove subscription', {
				subscriptionId: id,
				error: ensureError(error).message,
			});
			continue;
		}
		try {
			await microsoftApiRequest.call(this, 'DELETE', path);
		} catch (error) {
			if (error instanceof NodeApiError && error.httpCode === '404') continue;
			logTrigger.call(this, 'warn', 'failed to remove subscription', {
				subscriptionId: id,
				error: ensureError(error).message,
			});
			refused.push(id);
		}
	}
	return refused;
}

export async function fetchAllTeams(
	this: IHookFunctions | IWebhookFunctions,
): Promise<TeamResponse[]> {
	const { value: teams } = (await microsoftApiRequest.call(
		this,
		'GET',
		joinedTeamsEndpoint.call(this),
	)) as { value: TeamResponse[] };
	return teams;
}

export async function fetchAllChannels(
	this: IHookFunctions | IWebhookFunctions,
	teamId: string,
): Promise<ChannelResponse[]> {
	// Route through buildTeamsPath so `teamId` is validated before interpolation
	// (watch-all is also guarded in getResourcePath).
	const { value: channels } = (await microsoftApiRequest.call(
		this,
		'GET',
		buildTeamsPath.call(this, ['/v1.0/teams/', { id: teamId }, '/channels']),
	)) as { value: ChannelResponse[] };
	return channels;
}

export async function createSubscription(
	this: IHookFunctions | IWebhookFunctions,
	webhookUrl: string,
	resourcePath: string,
	clientState: string,
): Promise<SubscriptionResponse> {
	const expirationTime = newSubscriptionExpiry();
	const body: IDataObject = {
		changeType: 'created',
		notificationUrl: webhookUrl,
		resource: resourcePath,
		expirationDateTime: expirationTime,
		latestSupportedTlsVersion: 'v1_2',
		lifecycleNotificationUrl: webhookUrl,
		clientState,
	};

	const response = (await microsoftApiRequest.call(
		this,
		'POST',
		'/v1.0/subscriptions',
		body,
	)) as SubscriptionResponse;

	return response;
}

/**
 * Creates one subscription per resource in parallel. Every POST settles first, so the
 * ids that landed are known before the cleanup core runs next. An error is returned as
 * thrown (`ensureError` keeps the object), so a Graph 403 keeps its hint copy.
 */
export async function createSubscriptions(
	this: IHookFunctions | IWebhookFunctions,
	webhookUrl: string,
	resources: string[],
	clientState: string,
): Promise<{ ids: string[]; errors: Error[] }> {
	const results = await Promise.allSettled(
		resources.map(
			async (resource) => await createSubscription.call(this, webhookUrl, resource, clientState),
		),
	);
	const ids: string[] = [];
	const errors: Error[] = [];
	results.forEach((result, index) => {
		if (result.status === 'fulfilled') {
			ids.push(result.value.id);
			return;
		}
		const error = ensureError(result.reason);
		logTrigger.call(this, 'warn', 'failed to create subscription', {
			resource: resources[index],
			error: error.message,
		});
		errors.push(error);
	});
	return { ids, errors };
}

export async function listOwnSubscriptions(
	this: IHookFunctions | IWebhookFunctions,
	webhookUrl: string | undefined,
): Promise<SubscriptionResponse[]> {
	const subscriptions = (await microsoftApiRequestAllItems.call(
		this,
		'value',
		'GET',
		'/v1.0/subscriptions',
	)) as SubscriptionResponse[];
	return subscriptions.filter((subscription) => subscription.notificationUrl === webhookUrl);
}

/**
 * Applies the ownership rule to one own listing: one stored live subscription per
 * required resource stays, every other own subscription goes, and the uncovered
 * resources are created with the stored secret. Reads and writes `subscriptionIds`
 * itself, so the trust decision and the write share one source. Returns the create
 * errors. Never throws.
 */
export async function reconcileSubscriptions(
	this: IHookFunctions | IWebhookFunctions,
	input: {
		webhookUrl: string;
		clientState: string;
		requiredResources: string[];
		/** The own listing. A lifecycle batch merges in the usable PATCH answers of the request. */
		subscriptions: SubscriptionResponse[];
		/** Ids a PATCH in this request succeeded for: live, and preferred as keepers. */
		renewed?: ReadonlySet<string>;
		/** Ids Graph reported removed. */
		gone?: ReadonlySet<string>;
	},
): Promise<Error[]> {
	const { webhookUrl, clientState, subscriptions, renewed = new Set(), gone = new Set() } = input;
	const webhookData = this.getWorkflowStaticData('node');
	const storedIds = getStoredIds(webhookData);
	const required = [...new Set(input.requiredResources)];

	// Liveness is decided once: the awaited deletes below must not move the line.
	const live = new Set(
		subscriptions
			.filter((sub) => !gone.has(sub.id) && (renewed.has(sub.id) || isLiveSubscription(sub)))
			.map((sub) => sub.id),
	);
	// Trust needs the own listing and the stored id, so an orphan that this version did not
	// store never becomes a keeper. Renewed first, then the later expiry, then the id: two
	// mains pick the same one.
	const candidates = subscriptions
		.filter(
			(sub) => storedIds.includes(sub.id) && live.has(sub.id) && required.includes(sub.resource),
		)
		.sort(
			(a, b) =>
				Number(renewed.has(b.id)) - Number(renewed.has(a.id)) ||
				(Date.parse(b.expirationDateTime) || 0) - (Date.parse(a.expirationDateTime) || 0) ||
				(a.id < b.id ? -1 : 1),
		);
	const keepers = new Map<string, string>();
	const ambiguous = new Set<string>();
	for (const sub of candidates) {
		const keeper = keepers.get(sub.resource);
		if (keeper === undefined) keepers.set(sub.resource, sub.id);
		// Earlier versions stored every own subscription, whatever its secret. A renewal in this
		// request proves the secret (its lifecycle item passed verification); without one, two
		// stored subscriptions on one resource are both untrusted and the resource is created again.
		else if (!renewed.has(keeper)) ambiguous.add(sub.resource);
	}
	for (const resource of ambiguous) keepers.delete(resource);
	const keeperIds = new Set(keepers.values());

	const listedIds = new Set(subscriptions.map((sub) => sub.id));
	const storedAbsent = storedIds.filter((id) => !listedIds.has(id) && !gone.has(id));
	// Every other own subscription goes first: Graph refuses a second `/teams/{id}/channels`
	// subscription, and the two must never deliver together.
	const refused = new Set(
		await deleteSubscriptions.call(this, [
			...subscriptions.map((sub) => sub.id).filter((id) => !keeperIds.has(id)),
			...storedAbsent,
		]),
	);
	const { ids: created, errors } = await createSubscriptions.call(
		this,
		webhookUrl,
		required.filter((resource) => !keepers.has(resource)),
		clientState,
	);

	// A stored id that is not listed and that Graph refused to remove stays, so the next
	// reconcile retries the delete; the by-URL listing cannot find it.
	const retained = storedAbsent.filter((id) => refused.has(id));
	const ids = [
		...new Set([
			...required.flatMap((resource) => keepers.get(resource) ?? []),
			...retained,
			...created,
		]),
	];
	// Every save is a DB write and widens the last-write-wins window, so save on change only.
	const raw: unknown[] | undefined = Array.isArray(webhookData.subscriptionIds)
		? webhookData.subscriptionIds
		: undefined;
	const unchanged =
		raw !== undefined && raw.length === ids.length && ids.every((id) => raw.includes(id));
	if (!unchanged) webhookData.subscriptionIds = ids;
	return errors;
}

/**
 * Whether the stored ids alone cover every required resource with a live subscription at
 * this URL. Reads each stored id with GET by id, which has its own budget: 2000 requests per
 * 20 s for an app across all tenants, against 40 for the listing. Never throws.
 */
export async function storedSubscriptionsCover(
	this: IHookFunctions | IWebhookFunctions,
	webhookUrl: string,
	event: string,
): Promise<boolean> {
	let required: string[];
	try {
		required = [await getResourcePath.call(this, event)].flat();
	} catch {
		return false;
	}
	const covered = new Set<string>();
	await Promise.all(
		getStoredIds(this.getWorkflowStaticData('node')).map(async (id) => {
			try {
				const answer: unknown = await microsoftApiRequest.call(
					this,
					'GET',
					buildTeamsPath.call(this, ['/v1.0/subscriptions/', { id }]),
				);
				if (
					isSubscriptionResponse(answer) &&
					answer.id === id &&
					answer.notificationUrl === webhookUrl &&
					isLiveSubscription(answer)
				) {
					covered.add(answer.resource);
				}
			} catch {
				// A stored id that Graph does not show covers nothing.
			}
		}),
	);
	return required.every((resource) => covered.has(resource));
}

// Anything with a `lifecycleEvent` is a lifecycle item and never a workflow item; the
// handler checks the id before it uses it.
export function isLifecycleNotification(item: unknown): item is LifecycleNotification {
	return isRecord(item) && typeof item.lifecycleEvent === 'string';
}

/** A PATCH answer that can stand in for a listing entry. */
export function isSubscriptionResponse(value: unknown): value is SubscriptionResponse {
	return (
		isRecord(value) &&
		typeof value.id === 'string' &&
		typeof value.resource === 'string' &&
		typeof value.expirationDateTime === 'string' &&
		typeof value.notificationUrl === 'string'
	);
}

/**
 * Runs after `webhook()` sent the 202. Never throws: a throw skips the static-data
 * save and core would answer an ended response. Renews the stored ids the batch names;
 * a batch with a removal, an unknown id, a failed renewal or a rejected item lists once
 * and reconciles, and so does a trigger that watches one resource but stores more ids.
 */
export async function handleLifecycleNotifications(
	this: IWebhookFunctions,
	items: LifecycleNotification[],
	rejectedCount = 0,
): Promise<void> {
	const webhookData = this.getWorkflowStaticData('node');

	// Do not make Graph calls if this helper is invoked without a stored secret.
	const clientState = getStoredSecret(webhookData);
	if (clientState === undefined) {
		logTrigger.call(
			this,
			'warn',
			'skipped lifecycle notifications: no stored secret, republish the workflow',
		);
		return;
	}
	const webhookUrl = this.getNodeWebhookUrl('default');
	// Type narrowing only: the subscriptions were created with this URL.
	if (webhookUrl === undefined) return;
	const storedIds = getStoredIds(webhookData);

	// Classify first, so the order inside the batch does not change the outcome. Logged
	// request values are capped: the sender holds the secret, but the body is still input.
	const gone = new Set<string>();
	const toRenew = new Set<string>();
	for (const { subscriptionId, lifecycleEvent } of items) {
		if (typeof subscriptionId !== 'string') {
			logTrigger.call(this, 'debug', 'ignored lifecycle event without a subscription id', {
				lifecycleEvent: lifecycleEvent.slice(0, 64),
			});
		} else if (lifecycleEvent === 'subscriptionRemoved') {
			gone.add(subscriptionId);
		} else if (lifecycleEvent === 'reauthorizationRequired') {
			toRenew.add(subscriptionId);
		} else {
			logTrigger.call(this, 'debug', 'ignored lifecycle event', {
				subscriptionId: subscriptionId.slice(0, 64),
				lifecycleEvent: lifecycleEvent.slice(0, 64),
			});
		}
	}

	const renewed = new Set<string>();
	const renewedEntries = new Map<string, SubscriptionResponse>();
	for (const subscriptionId of toRenew) {
		if (gone.has(subscriptionId)) continue;
		// An own id that is not stored is an orphan; the reconcile below removes it.
		if (!storedIds.includes(subscriptionId)) {
			logTrigger.call(this, 'debug', 'skipped renewal: unknown subscription', {
				subscriptionId: subscriptionId.slice(0, 64),
			});
			continue;
		}

		try {
			const answer: unknown = await microsoftApiRequest.call(
				this,
				'PATCH',
				buildTeamsPath.call(this, ['/v1.0/subscriptions/', { id: subscriptionId }]),
				{ expirationDateTime: newSubscriptionExpiry() },
			);
			renewed.add(subscriptionId);
			logTrigger.call(this, 'debug', 'renewed subscription', { subscriptionId });
			// The answer stands in for a listing entry that can lag. A stored id at an old
			// webhook URL must not become a keeper for the current URL through its answer.
			if (
				isSubscriptionResponse(answer) &&
				answer.id === subscriptionId &&
				answer.notificationUrl === webhookUrl
			) {
				renewedEntries.set(subscriptionId, answer);
			} else {
				logTrigger.call(this, 'debug', 'renewed subscription without a usable answer', {
					subscriptionId,
				});
			}
		} catch (error) {
			if (error instanceof NodeApiError && error.httpCode === '404') {
				gone.add(subscriptionId);
				logTrigger.call(this, 'debug', 'subscription gone, will re-create', { subscriptionId });
			} else {
				logTrigger.call(this, 'warn', 'failed to renew subscription', {
					subscriptionId,
					error: ensureError(error).message,
				});
			}
		}
	}

	// A plain renewal lists nothing: Graph allows 25 `GET /subscriptions` per 20 s per app
	// per tenant and 40 per 20 s per app across tenants. A trigger that watches one resource
	// but stores more ids lists anyway: earlier versions stored duplicates with the valid
	// secret, and they renew forever unless a listing removes them.
	const watchesMany =
		this.getNodeParameter('watchAllTeams', false) === true ||
		this.getNodeParameter('watchAllChannels', false) === true;
	const renewOnly =
		rejectedCount === 0 &&
		gone.size === 0 &&
		[...toRenew].every((id) => renewed.has(id)) &&
		(watchesMany || storedIds.length <= 1);
	if (renewOnly) return;

	let subscriptions: SubscriptionResponse[];
	let requiredResources: string[];
	try {
		subscriptions = await listOwnSubscriptions.call(this, webhookUrl);
		requiredResources = [
			await getResourcePath.call(this, this.getNodeParameter('event') as string),
		].flat();
	} catch (error) {
		const affectedIds = [...gone, ...toRenew].slice(0, 20).map((id) => id.slice(0, 64));
		logTrigger.call(
			this,
			'warn',
			'failed to list subscriptions or resolve resources, skipped re-create',
			{ subscriptionIds: affectedIds, error: ensureError(error).message },
		);
		return;
	}

	// An orphan whose own challenge fails verification never reaches this handler, so a
	// batch with an anomaly (a removal, an unknown id, a failed renewal, a rejected item)
	// must prune for it. The helpers log the failures.
	await reconcileSubscriptions.call(this, {
		webhookUrl,
		clientState,
		requiredResources,
		subscriptions: [
			...subscriptions.filter((subscription) => !renewedEntries.has(subscription.id)),
			...renewedEntries.values(),
		],
		renewed,
		gone,
	});
}

/** The accepted items of the request body; `[]` for a missing, empty or non-array body. */
export function verifyWebhook(this: IWebhookFunctions): unknown[] {
	const req = this.getRequestObject();
	const webhookData = this.getWorkflowStaticData('node');
	const expectedSecret = getStoredSecret(webhookData);

	const body = req.body as { value?: unknown } | undefined;
	const notifications = body?.value;

	if (!Array.isArray(notifications) || notifications.length === 0) {
		return [];
	}

	// Graph batches several subscriptions into one POST, so an item from another
	// subscription must not drop the valid ones. Without a stored secret no item is
	// accepted.
	return (notifications as unknown[]).filter((notification) => {
		const actualClientState =
			typeof notification === 'object' && notification !== null
				? (notification as { clientState?: unknown }).clientState
				: undefined;
		return verifySignatureGeneric({
			getExpectedSignature: () => expectedSecret ?? null,
			getActualSignature: () => (typeof actualClientState === 'string' ? actualClientState : null),
		});
	});
}

export async function getResourcePath(
	this: IHookFunctions | IWebhookFunctions,
	event: string,
): Promise<string | string[]> {
	// Path-interpolated ids are validated + interpolated via buildTeamsPath under
	// both credential types. A By-URL channel/chat id arrives percent-encoded, so it
	// is decoded first (guarded helper) so validation runs on the decoded value.
	// App-only Graph has no signed-in user: chat events and watch-all are disabled
	// under SP (UI-hidden + the runtime guards below, since fetchAllTeams/
	// fetchAllChannels fan out an org-wide-token request).
	const isServicePrincipal = getTeamsCredentialType.call(this) === SERVICE_PRINCIPAL_AUTH;

	switch (event) {
		case 'newChat': {
			if (isServicePrincipal) throwChatTriggerUnsupported.call(this);
			return '/me/chats';
		}

		case 'newChatMessage': {
			if (isServicePrincipal) throwChatTriggerUnsupported.call(this);

			const watchAllChats = this.getNodeParameter('watchAllChats', false) as boolean;

			if (watchAllChats) {
				return '/me/chats/getAllMessages';
			} else {
				const chatId = this.getNodeParameter('chatId', undefined, { extractValue: true }) as string;
				return buildTeamsPath.call(this, [
					'/chats/',
					{ id: decodeSelectedId.call(this, chatId) },
					'/messages',
				]);
			}
		}

		case 'newChannel': {
			// No `extractValue` for booleans: it triggers a property-descriptor lookup that
			// throws "Could not find property" when the toggle is hidden under SP. The 2-arg
			// form returns the `false` fallback cleanly when hidden.
			const watchAllTeams = this.getNodeParameter('watchAllTeams', false) as boolean;

			if (isServicePrincipal && watchAllTeams) throwWatchAllUnsupported.call(this);

			if (watchAllTeams) {
				const teams = await fetchAllTeams.call(this);
				return teams.map((team) => `/teams/${team.id}/channels`);
			} else {
				const teamId = this.getNodeParameter('teamId', undefined, { extractValue: true }) as string;
				return buildTeamsPath.call(this, ['/teams/', { id: teamId }, '/channels']);
			}
		}

		case 'newChannelMessage': {
			// No `extractValue` for booleans: it triggers a property-descriptor lookup that
			// throws "Could not find property" when the toggle is hidden under SP. The 2-arg
			// form returns the `false` fallback cleanly when hidden.
			const watchAllTeams = this.getNodeParameter('watchAllTeams', false) as boolean;

			if (isServicePrincipal && watchAllTeams) throwWatchAllUnsupported.call(this);

			if (watchAllTeams) {
				const teams = await fetchAllTeams.call(this);
				const teamChannels = await Promise.all(
					teams.map(async (team) => {
						const channels = await fetchAllChannels.call(this, team.id);
						return channels.map((channel) => `/teams/${team.id}/channels/${channel.id}/messages`);
					}),
				);
				return teamChannels.flat();
			} else {
				const teamId = this.getNodeParameter('teamId', undefined, { extractValue: true }) as string;
				const watchAllChannels = this.getNodeParameter('watchAllChannels', false) as boolean;

				if (isServicePrincipal && watchAllChannels) throwWatchAllUnsupported.call(this);

				if (watchAllChannels) {
					const channels = await fetchAllChannels.call(this, teamId);
					return channels.map((channel) => `/teams/${teamId}/channels/${channel.id}/messages`);
				} else {
					const channelId = this.getNodeParameter('channelId', undefined, {
						extractValue: true,
					}) as string;
					return buildTeamsPath.call(this, [
						'/teams/',
						{ id: teamId },
						'/channels/',
						{ id: decodeSelectedId.call(this, channelId) },
						'/messages',
					]);
				}
			}
		}

		case 'newTeamMember': {
			// No `extractValue` for booleans: it triggers a property-descriptor lookup that
			// throws "Could not find property" when the toggle is hidden under SP. The 2-arg
			// form returns the `false` fallback cleanly when hidden.
			const watchAllTeams = this.getNodeParameter('watchAllTeams', false) as boolean;

			if (isServicePrincipal && watchAllTeams) throwWatchAllUnsupported.call(this);

			if (watchAllTeams) {
				const teams = await fetchAllTeams.call(this);
				return teams.map((team) => `/teams/${team.id}/members`);
			} else {
				const teamId = this.getNodeParameter('teamId', undefined, { extractValue: true }) as string;
				return buildTeamsPath.call(this, ['/teams/', { id: teamId }, '/members']);
			}
		}

		default: {
			throw new NodeOperationError(this.getNode(), {
				message: `Invalid event: ${event}`,
				description: `The selected event "${event}" is not recognized.`,
			});
		}
	}
}

/**
 * Chat triggers subscribe to `/me/chats[...]`, which has no app-only equivalent.
 * Throws a static `NodeOperationError` before composing any `/me` path under the
 * Service Principal credential. The copy lives on the chat 403 hint, so the two
 * cannot drift.
 */
function throwChatTriggerUnsupported(this: IHookFunctions | IWebhookFunctions): never {
	const { message, description } = CHAT_SUBSCRIPTION_FORBIDDEN;
	throw new NodeOperationError(this.getNode(), message, { description });
}

/**
 * Watch-all fans out one subscription per team/channel via fetchAllTeams/
 * fetchAllChannels under the org-wide app token, which the plan disables under SP
 * (option b). The UI hides the toggles; this guard backs that at runtime for
 * hand-edited workflows, throwing a static error before any fan-out request.
 */
function throwWatchAllUnsupported(this: IHookFunctions | IWebhookFunctions): never {
	throw new NodeOperationError(
		this.getNode(),
		'Watching all teams/channels is not available with the Service Principal credential',
		{
			description:
				'Select a specific team and channel. App-only fan-out across all teams/channels is disabled for the Service Principal credential.',
		},
	);
}

/**
 * Decodes a By-URL id (percent-encoded, e.g. `19%3A...%40thread.tacv2`) before it is
 * validated and interpolated. A malformed `%` sequence makes `decodeURIComponent`
 * throw a raw `URIError`; convert it to a static `NodeOperationError`.
 */
function decodeSelectedId(this: IHookFunctions | IWebhookFunctions, id: string): string {
	try {
		// A missing selection arrives as a non-string — keep it empty (not the
		// string "undefined") so validation raises the required-ID error
		return decodeURIComponent(String(id ?? ''));
	} catch {
		throw new NodeOperationError(this.getNode(), 'The ID is not valid', {
			description: 'The ID could not be decoded. Re-select it from the list or by URL.',
		});
	}
}
