import { randomBytes } from 'crypto';
import type { IHookFunctions, IDataObject, IWebhookFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { TeamResponse, ChannelResponse, SubscriptionResponse } from './types';
import { verifySignature as verifySignatureGeneric } from '../../../../../utils/webhook-signature-verification';
import {
	buildTeamsPath,
	getTeamsCredentialType,
	joinedTeamsEndpoint,
	microsoftApiRequest,
	SERVICE_PRINCIPAL_AUTH,
} from '../transport';

export function generateClientState(): string {
	return randomBytes(32).toString('hex');
}

export async function fetchAllTeams(this: IHookFunctions): Promise<TeamResponse[]> {
	const { value: teams } = (await microsoftApiRequest.call(
		this,
		'GET',
		joinedTeamsEndpoint.call(this),
	)) as { value: TeamResponse[] };
	return teams;
}

export async function fetchAllChannels(
	this: IHookFunctions,
	teamId: string,
): Promise<ChannelResponse[]> {
	// Route through buildTeamsPath so `teamId` is validated under SP (non-bypassable
	// defense-in-depth — watch-all is also guarded in getResourcePath); verbatim under OAuth2.
	const { value: channels } = (await microsoftApiRequest.call(
		this,
		'GET',
		buildTeamsPath.call(this, ['/v1.0/teams/', { id: teamId }, '/channels']),
	)) as { value: ChannelResponse[] };
	return channels;
}

export async function createSubscription(
	this: IHookFunctions,
	webhookUrl: string,
	resourcePath: string,
	clientState?: string,
): Promise<SubscriptionResponse> {
	const expirationTime = new Date(Date.now() + 4318 * 60 * 1000).toISOString();
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
	this: IHookFunctions,
	event: string,
): Promise<string | string[]> {
	// App-only Graph has no signed-in user. On the SP-reachable branches the
	// path-interpolated ids are validated + interpolated via buildTeamsPath. A By-URL
	// channel id arrives percent-encoded, so newChannelMessage decodes it first (parity
	// with the OAuth2 path) so validation runs on the decoded value. Watch-all is disabled
	// under SP (UI-hidden + the runtime guards below, since fetchAllTeams/fetchAllChannels
	// fan out an org-wide-token request). The OAuth2 branches are byte-for-byte unchanged.
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
				return `/chats/${decodeURIComponent(chatId)}/messages`;
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
				if (isServicePrincipal) {
					return buildTeamsPath.call(this, ['/teams/', { id: teamId }, '/channels']);
				}
				return `/teams/${teamId}/channels`;
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
					if (isServicePrincipal) {
						// `channelId` is percent-encoded when selected By URL; decode it first (via the
						// guarded helper, so a malformed `%` yields a NodeOperationError not a raw
						// URIError) so validation runs on the decoded value and the subscription resource
						// carries the raw channel id Graph matches against (parity with the OAuth2 path).
						return buildTeamsPath.call(this, [
							'/teams/',
							{ id: teamId },
							'/channels/',
							{ id: decodeChannelId.call(this, channelId) },
							'/messages',
						]);
					}
					return `/teams/${teamId}/channels/${decodeURIComponent(channelId)}/messages`;
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
				if (isServicePrincipal) {
					return buildTeamsPath.call(this, ['/teams/', { id: teamId }, '/members']);
				}
				return `/teams/${teamId}/members`;
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
function throwChatTriggerUnsupported(this: IHookFunctions): never {
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
function throwWatchAllUnsupported(this: IHookFunctions): never {
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
 * Decodes a By-URL channel id (percent-encoded, e.g. `19%3A...%40thread.tacv2`) before it is
 * validated and interpolated under SP. A malformed `%` sequence makes `decodeURIComponent` throw a
 * raw `URIError`; convert it to a static `NodeOperationError` so the SP path never surfaces a raw
 * decode error (the OAuth2 path keeps its pre-existing unguarded decode).
 */
function decodeChannelId(this: IHookFunctions, channelId: string): string {
	try {
		return decodeURIComponent(channelId);
	} catch {
		throw new NodeOperationError(this.getNode(), 'The ID is not valid', {
			description:
				'The channel ID could not be decoded. Re-select the channel from the list or by URL.',
		});
	}
}
