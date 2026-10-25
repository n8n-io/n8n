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

export function generateClientState(): string {
	return randomBytes(32).toString('hex');
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

/** Deletes one subscription. A `404` counts as done, for example after it expired. */
export async function deleteSubscription(
	this: IHookFunctions | IWebhookFunctions,
	subscriptionId: string,
): Promise<void> {
	try {
		await microsoftApiRequest.call(
			this,
			'DELETE',
			buildTeamsPath.call(this, ['/v1.0/subscriptions/', { id: subscriptionId }]),
		);
	} catch (error) {
		if (!(error instanceof NodeApiError && error.httpCode === '404')) throw error;
	}
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

// Anything with a `lifecycleEvent` is a lifecycle item and never a workflow item; the
// handler checks the id before it uses it.
export function isLifecycleNotification(item: unknown): item is LifecycleNotification {
	return isRecord(item) && typeof item.lifecycleEvent === 'string';
}

/**
 * Runs after `webhook()` sent the 202. Never throws: a throw skips the static-data
 * save and core would answer an ended response. Lists the subscriptions at most once
 * per request.
 */
export async function handleLifecycleNotifications(
	this: IWebhookFunctions,
	items: LifecycleNotification[],
): Promise<void> {
	const webhookData = this.getWorkflowStaticData('node');
	const meta = { workflowId: this.getWorkflow().id, nodeName: this.getNode().name };
	const log = (level: 'debug' | 'warn', message: string, fields: Record<string, unknown>) =>
		this.logger[level](`Microsoft Teams Trigger: ${message}`, { ...meta, ...fields });

	// Without a stored secret `verifyWebhook` accepts any sender, so no Graph call may
	// follow. The subscriptions expire and the next publish replaces them with a secret.
	const clientState = getStoredSecret(webhookData);
	if (clientState === undefined) {
		log('warn', 'skipped lifecycle notifications: no stored secret, republish the workflow', {});
		return;
	}
	const webhookUrl = this.getNodeWebhookUrl('default');
	// Type narrowing only: the subscriptions were created with this URL.
	if (webhookUrl === undefined) return;
	const rawIds: unknown[] = Array.isArray(webhookData.subscriptionIds)
		? webhookData.subscriptionIds
		: [];
	const storedIds = rawIds.filter((id): id is string => typeof id === 'string');

	// One listing per request; a rejected listing is never fetched again.
	let ownList: Promise<SubscriptionResponse[]> | undefined;
	const ownSubscriptions = async () =>
		await (ownList ??= listOwnSubscriptions.call(this, webhookUrl));

	// Classify first, so the order inside the batch does not change the outcome. Logged
	// request values are capped: the sender holds the secret, but the body is still input.
	const gone = new Set<string>();
	const toRenew = new Set<string>();
	for (const { subscriptionId, lifecycleEvent } of items) {
		if (typeof subscriptionId !== 'string') {
			log('debug', 'ignored lifecycle event without a subscription id', {
				lifecycleEvent: lifecycleEvent.slice(0, 64),
			});
		} else if (lifecycleEvent === 'subscriptionRemoved') {
			gone.add(subscriptionId);
		} else if (lifecycleEvent === 'reauthorizationRequired') {
			toRenew.add(subscriptionId);
		} else {
			log('debug', 'ignored lifecycle event', {
				subscriptionId: subscriptionId.slice(0, 64),
				lifecycleEvent: lifecycleEvent.slice(0, 64),
			});
		}
	}

	const unresolved = new Set<string>();
	const renewed = new Set<string>();
	let needsReconcile = gone.size > 0;

	for (const subscriptionId of toRenew) {
		if (gone.has(subscriptionId)) continue;

		let isOwn: boolean;
		try {
			isOwn =
				storedIds.includes(subscriptionId) ||
				(await ownSubscriptions()).some((subscription) => subscription.id === subscriptionId);
		} catch {
			// Route to the reconcile, which awaits the same rejected listing and warns once.
			unresolved.add(subscriptionId);
			needsReconcile = true;
			continue;
		}
		if (!isOwn) {
			log('debug', 'skipped renewal: unknown subscription', {
				subscriptionId: subscriptionId.slice(0, 64),
			});
			needsReconcile = true;
			continue;
		}

		try {
			await microsoftApiRequest.call(
				this,
				'PATCH',
				buildTeamsPath.call(this, ['/v1.0/subscriptions/', { id: subscriptionId }]),
				{ expirationDateTime: newSubscriptionExpiry() },
			);
			renewed.add(subscriptionId);
			log('debug', 'renewed subscription', { subscriptionId });
		} catch (error) {
			if (error instanceof NodeApiError && error.httpCode === '404') {
				gone.add(subscriptionId);
				needsReconcile = true;
				log('debug', 'subscription gone, will re-create', { subscriptionId });
			} else {
				log('warn', 'failed to renew subscription', {
					subscriptionId,
					error: ensureError(error).message,
				});
			}
		}
	}

	if (!needsReconcile) {
		// Store the ids that the listing proved to be own, so `delete()` removes them on unpublish.
		const discovered = [...renewed].filter((id) => !storedIds.includes(id));
		if (discovered.length > 0) webhookData.subscriptionIds = [...storedIds, ...discovered];
		return;
	}

	const affectedIds = [...gone, ...unresolved].slice(0, 20).map((id) => id.slice(0, 64));
	let subscriptions: SubscriptionResponse[];
	let requiredResources: string[];
	try {
		subscriptions = await ownSubscriptions();
		const resourcePaths = await getResourcePath.call(
			this,
			this.getNodeParameter('event') as string,
		);
		requiredResources = Array.isArray(resourcePaths) ? resourcePaths : [resourcePaths];
	} catch (error) {
		log('warn', 'failed to list subscriptions or resolve resources, skipped re-create', {
			subscriptionIds: affectedIds,
			error: ensureError(error).message,
		});
		return;
	}

	// Partition once: an id renewed in this request stays live even when its listed expiry
	// passed meanwhile, and the awaited deletes below must not move the line.
	const live = subscriptions.filter(
		(subscription) =>
			!gone.has(subscription.id) &&
			(renewed.has(subscription.id) || isLiveSubscription(subscription)),
	);
	const liveIds = new Set(live.map((subscription) => subscription.id));
	// Every other own subscription is removed before its replacement is created, so the two
	// never deliver together and Graph does not reject the replacement as a duplicate. One
	// that Graph already removed answers 404, which counts as done.
	for (const { id } of subscriptions) {
		if (liveIds.has(id)) continue;
		try {
			await deleteSubscription.call(this, id);
		} catch (error) {
			log('debug', 'failed to remove a stale subscription', {
				subscriptionId: id,
				error: ensureError(error).message,
			});
		}
	}
	const liveResources = new Set(live.map((subscription) => subscription.resource));
	const created: string[] = [];
	for (const resource of requiredResources.filter((path) => !liveResources.has(path))) {
		try {
			const subscription = await createSubscription.call(this, webhookUrl, resource, clientState);
			created.push(subscription.id);
			log('debug', 're-created subscription', { resource, subscriptionId: subscription.id });
		} catch (error) {
			log('warn', 'failed to re-create subscription', {
				resource,
				subscriptionIds: affectedIds,
				error: ensureError(error).message,
			});
		}
	}
	const nextIds = [...live.map((subscription) => subscription.id), ...created];
	// Every save is a DB write and widens the last-write-wins window, so save on change only.
	const unchanged = nextIds.length === rawIds.length && nextIds.every((id) => rawIds.includes(id));
	if (!unchanged) webhookData.subscriptionIds = nextIds;
}

export function verifyWebhook(this: IWebhookFunctions): boolean {
	const req = this.getRequestObject();
	const webhookData = this.getWorkflowStaticData('node');
	const expectedSecret = getStoredSecret(webhookData);

	const body = req.body as { value?: unknown } | undefined;
	const notifications = body?.value;

	if (!Array.isArray(notifications) || notifications.length === 0) {
		return false;
	}

	return (notifications as unknown[]).every((notification) => {
		const actualClientState =
			typeof notification === 'object' && notification !== null
				? (notification as { clientState?: unknown }).clientState
				: undefined;
		return verifySignatureGeneric({
			getExpectedSignature: () => expectedSecret ?? null,
			skipIfNoExpectedSignature: true,
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
 * Service Principal credential.
 */
function throwChatTriggerUnsupported(this: IHookFunctions | IWebhookFunctions): never {
	throw new NodeOperationError(
		this.getNode(),
		'Chat triggers are not available with the Service Principal credential',
		{
			description:
				'App-only Microsoft Graph cannot subscribe to the chats of a signed-in user. Use an OAuth2 credential for chat triggers.',
		},
	);
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
