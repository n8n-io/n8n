import { randomBytes } from 'crypto';
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

type TriggerFunctions = IHookFunctions | IWebhookFunctions;

const SUBSCRIPTION_LIFETIME_MINUTES = 4318;
const MIN_REMAINING_LIFETIME_MS = 5 * 60 * 1000;

function getExpirationDateTime(): string {
	return new Date(Date.now() + SUBSCRIPTION_LIFETIME_MINUTES * 60 * 1000).toISOString();
}

export function generateClientState(): string {
	return randomBytes(32).toString('hex');
}

export function isNotFoundError(error: unknown): boolean {
	return error instanceof NodeApiError && error.httpCode === '404';
}

export function isLifecycleNotification(
	notification: unknown,
): notification is LifecycleNotification {
	return (
		typeof notification === 'object' &&
		notification !== null &&
		'lifecycleEvent' in notification &&
		typeof notification.lifecycleEvent === 'string'
	);
}

export function getStoredSubscriptionIds(webhookData: IDataObject): string[] {
	const ids = webhookData.subscriptionIds;
	return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
}

export function getNotificationUrl(this: TriggerFunctions): string {
	const webhookUrl = this.getNodeWebhookUrl('default');

	if (!webhookUrl?.startsWith('https://')) {
		throw new NodeApiError(this.getNode(), {
			message: 'Invalid Notification URL',
			description: `The webhook URL "${webhookUrl}" is invalid. Microsoft Graph requires an HTTPS URL.`,
		});
	}

	return webhookUrl;
}

export async function fetchAllTeams(this: TriggerFunctions): Promise<TeamResponse[]> {
	const { value: teams } = (await microsoftApiRequest.call(
		this,
		'GET',
		joinedTeamsEndpoint.call(this),
	)) as { value: TeamResponse[] };
	return teams;
}

export async function fetchAllChannels(
	this: TriggerFunctions,
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
	this: TriggerFunctions,
	webhookUrl: string,
	resourcePath: string,
	clientState?: string,
): Promise<SubscriptionResponse> {
	const body: IDataObject = {
		changeType: 'created',
		notificationUrl: webhookUrl,
		resource: resourcePath,
		expirationDateTime: getExpirationDateTime(),
		latestSupportedTlsVersion: 'v1_2',
		lifecycleNotificationUrl: webhookUrl,
	};

	if (clientState) {
		body.clientState = clientState;
	}

	const response = (await microsoftApiRequest.call(
		this,
		'POST',
		'/v1.0/subscriptions',
		body,
	)) as SubscriptionResponse;

	return response;
}

export async function renewSubscription(
	this: TriggerFunctions,
	subscriptionId: string,
): Promise<void> {
	await microsoftApiRequest.call(this, 'PATCH', `/v1.0/subscriptions/${subscriptionId}`, {
		expirationDateTime: getExpirationDateTime(),
	});
}

export async function renewSubscriptions(
	this: TriggerFunctions,
	subscriptionIds: string[],
): Promise<{ goneIds: string[]; errors: unknown[] }> {
	const results = await Promise.allSettled(
		subscriptionIds.map(
			async (subscriptionId) => await renewSubscription.call(this, subscriptionId),
		),
	);
	const goneIds: string[] = [];
	const errors: unknown[] = [];

	results.forEach((result, index) => {
		if (result.status === 'fulfilled') return;
		if (isNotFoundError(result.reason)) {
			goneIds.push(subscriptionIds[index]);
		} else {
			errors.push(result.reason);
		}
	});

	return { goneIds, errors };
}

export async function getActiveSubscriptions(
	this: TriggerFunctions,
	webhookUrl: string | undefined,
): Promise<SubscriptionResponse[]> {
	const subscriptions: SubscriptionResponse[] = await microsoftApiRequestAllItems.call(
		this,
		'value',
		'GET',
		'/v1.0/subscriptions',
	);
	const minExpiration = Date.now() + MIN_REMAINING_LIFETIME_MS;

	return subscriptions.filter(
		(subscription) =>
			subscription.notificationUrl === webhookUrl &&
			new Date(subscription.expirationDateTime).getTime() > minExpiration,
	);
}

export async function getRequiredResources(this: TriggerFunctions): Promise<string[]> {
	const event = this.getNodeParameter('event', 0) as string;
	const resourcePaths = await getResourcePath.call(this, event);
	return Array.isArray(resourcePaths) ? resourcePaths : [resourcePaths];
}

export async function restoreSubscriptions(
	this: TriggerFunctions,
	removedIds: string[],
): Promise<void> {
	const webhookUrl = getNotificationUrl.call(this);
	const webhookData = this.getWorkflowStaticData('node');
	const clientState =
		typeof webhookData.webhookSecret === 'string' ? webhookData.webhookSecret : undefined;

	const activeSubscriptions = (await getActiveSubscriptions.call(this, webhookUrl)).filter(
		(subscription) => !removedIds.includes(subscription.id),
	);
	const subscribedResources = activeSubscriptions.map((subscription) => subscription.resource);
	const missingResources = (await getRequiredResources.call(this)).filter(
		(resource) => !subscribedResources.includes(resource),
	);

	const createdSubscriptions = await Promise.all(
		missingResources.map(
			async (resource) => await createSubscription.call(this, webhookUrl, resource, clientState),
		),
	);

	webhookData.subscriptionIds = [...activeSubscriptions, ...createdSubscriptions].map(
		(subscription) => subscription.id,
	);
}

export async function handleLifecycleNotifications(
	this: IWebhookFunctions,
	notifications: LifecycleNotification[],
): Promise<void> {
	const storedIds = getStoredSubscriptionIds(this.getWorkflowStaticData('node'));
	const ownNotifications = notifications.filter((notification) =>
		storedIds.includes(notification.subscriptionId),
	);

	const removedIds = new Set(
		ownNotifications
			.filter((notification) => notification.lifecycleEvent === 'subscriptionRemoved')
			.map((notification) => notification.subscriptionId),
	);
	const idsToRenew = new Set(
		ownNotifications
			.filter(
				(notification) =>
					notification.lifecycleEvent === 'reauthorizationRequired' &&
					!removedIds.has(notification.subscriptionId),
			)
			.map((notification) => notification.subscriptionId),
	);

	const { goneIds, errors } = await renewSubscriptions.call(this, [...idsToRenew]);
	const missingIds = [...removedIds, ...goneIds];

	if (missingIds.length > 0) {
		await restoreSubscriptions.call(this, missingIds);
	}

	if (errors.length > 0) {
		throw errors[0];
	}
}

export function verifyWebhook(this: IWebhookFunctions): boolean {
	const req = this.getRequestObject();
	const webhookData = this.getWorkflowStaticData('node');
	const expectedSecret = webhookData.webhookSecret;

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
			getExpectedSignature: () =>
				typeof expectedSecret === 'string' && expectedSecret.length > 0 ? expectedSecret : null,
			skipIfNoExpectedSignature: true,
			getActualSignature: () => (typeof actualClientState === 'string' ? actualClientState : null),
		});
	});
}

export async function getResourcePath(
	this: TriggerFunctions,
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
function throwChatTriggerUnsupported(this: TriggerFunctions): never {
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
function throwWatchAllUnsupported(this: TriggerFunctions): never {
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
function decodeSelectedId(this: TriggerFunctions, id: string): string {
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
