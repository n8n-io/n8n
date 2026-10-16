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

// Graph caps Teams subscriptions at 4320 minutes.
const SUBSCRIPTION_TTL_MINUTES = 4318;

export function newSubscriptionExpiry(): string {
	return new Date(Date.now() + SUBSCRIPTION_TTL_MINUTES * 60 * 1000).toISOString();
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
	clientState?: string,
): Promise<SubscriptionResponse> {
	const expirationTime = newSubscriptionExpiry();
	const body: IDataObject = {
		changeType: 'created',
		notificationUrl: webhookUrl,
		resource: resourcePath,
		expirationDateTime: expirationTime,
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

export function isLifecycleNotification(item: unknown): item is LifecycleNotification {
	return (
		isRecord(item) &&
		typeof item.lifecycleEvent === 'string' &&
		typeof item.subscriptionId === 'string'
	);
}

export async function handleLifecycleNotifications(
	this: IWebhookFunctions,
	items: LifecycleNotification[],
): Promise<void> {
	const webhookData = this.getWorkflowStaticData('node');
	const webhookUrl = this.getNodeWebhookUrl('default');
	const storedIds: unknown[] = Array.isArray(webhookData.subscriptionIds)
		? webhookData.subscriptionIds
		: [];
	const meta = { workflowId: this.getWorkflow().id, nodeName: this.getNode().name };

	// One listing per request; a rejected listing is never fetched again.
	let ownList: Promise<SubscriptionResponse[]> | undefined;
	const ownSubscriptions = async () =>
		await (ownList ??= listOwnSubscriptions.call(this, webhookUrl));

	const gone = new Set<string>();
	const unresolved = new Set<string>();
	const patched = new Set<string>();
	let needsReconcile = false;

	for (const { subscriptionId, lifecycleEvent } of items) {
		switch (lifecycleEvent) {
			case 'reauthorizationRequired': {
				if (gone.has(subscriptionId) || patched.has(subscriptionId)) break;

				let isOwn: boolean;
				try {
					isOwn =
						storedIds.includes(subscriptionId) ||
						(await ownSubscriptions()).some((subscription) => subscription.id === subscriptionId);
				} catch {
					// Route to the reconcile, which awaits the same rejected listing and warns once.
					unresolved.add(subscriptionId);
					needsReconcile = true;
					break;
				}
				if (!isOwn) {
					this.logger.debug('Microsoft Teams Trigger: skipped renewal: unknown subscription', {
						...meta,
						subscriptionId: String(subscriptionId).slice(0, 64),
						lifecycleEvent: String(lifecycleEvent).slice(0, 64),
					});
					needsReconcile = true;
					break;
				}

				patched.add(subscriptionId);
				try {
					await microsoftApiRequest.call(
						this,
						'PATCH',
						buildTeamsPath.call(this, ['/v1.0/subscriptions/', { id: subscriptionId }]),
						{ expirationDateTime: newSubscriptionExpiry() },
					);
					this.logger.debug('Microsoft Teams Trigger: renewed subscription', {
						...meta,
						subscriptionId,
						lifecycleEvent,
					});
				} catch (error) {
					if (error instanceof NodeApiError && error.httpCode === '404') {
						gone.add(subscriptionId);
						needsReconcile = true;
						this.logger.debug('Microsoft Teams Trigger: subscription gone, will re-create', {
							...meta,
							subscriptionId,
							lifecycleEvent,
						});
					} else {
						this.logger.warn('Microsoft Teams Trigger: failed to renew subscription', {
							...meta,
							subscriptionId,
							lifecycleEvent,
							error: ensureError(error).message,
						});
					}
				}
				break;
			}
			case 'subscriptionRemoved':
				gone.add(subscriptionId);
				needsReconcile = true;
				break;
			default:
				this.logger.debug('Microsoft Teams Trigger: ignored lifecycle event', {
					...meta,
					subscriptionId: String(subscriptionId).slice(0, 64),
					lifecycleEvent: String(lifecycleEvent).slice(0, 64),
				});
		}
	}

	if (!needsReconcile) return;

	const affectedIds = [...gone, ...unresolved];
	if (webhookUrl === undefined) {
		this.logger.warn('Microsoft Teams Trigger: no webhook URL, skipped re-create', {
			...meta,
			subscriptionIds: affectedIds,
		});
		return;
	}

	let subscriptions: SubscriptionResponse[];
	let requiredResources: string[];
	try {
		subscriptions = await ownSubscriptions();
		const resourcePaths = await getResourcePath.call(
			this,
			this.getNodeParameter('event', 0) as string,
		);
		requiredResources = Array.isArray(resourcePaths) ? resourcePaths : [resourcePaths];
	} catch (error) {
		this.logger.warn(
			'Microsoft Teams Trigger: failed to list subscriptions or resolve resources, skipped re-create',
			{ ...meta, subscriptionIds: affectedIds, error: ensureError(error).message },
		);
		return;
	}

	const live = subscriptions.filter(
		(subscription) =>
			!gone.has(subscription.id) &&
			new Date(subscription.expirationDateTime).getTime() > Date.now(),
	);
	const liveResources = new Set(live.map((subscription) => subscription.resource));
	const secret = webhookData.webhookSecret;
	const clientState = typeof secret === 'string' && secret.length > 0 ? secret : undefined;
	const created: string[] = [];
	for (const resource of requiredResources.filter((path) => !liveResources.has(path))) {
		try {
			const subscription = await createSubscription.call(this, webhookUrl, resource, clientState);
			created.push(subscription.id);
			this.logger.debug('Microsoft Teams Trigger: re-created subscription', {
				...meta,
				resource,
				subscriptionId: subscription.id,
			});
		} catch (error) {
			this.logger.warn('Microsoft Teams Trigger: failed to re-create subscription', {
				...meta,
				resource,
				subscriptionIds: affectedIds,
				error: ensureError(error).message,
			});
		}
	}
	webhookData.subscriptionIds = [...live.map((subscription) => subscription.id), ...created];
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
