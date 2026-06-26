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
	const { value: channels } = (await microsoftApiRequest.call(
		this,
		'GET',
		`/v1.0/teams/${teamId}/channels`,
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
	// path-interpolated teamId/channelId are validated + encoded via buildTeamsPath
	// (which also drops the OAuth2-only decodeURIComponent on the SP path). The OAuth2
	// branches below are byte-for-byte unchanged (incl. the pre-existing decode).
	const isServicePrincipal = getTeamsCredentialType.call(this) === SERVICE_PRINCIPAL_AUTH;

	switch (event) {
		case 'newChat': {
			if (isServicePrincipal) throwChatTriggerUnsupported.call(this);
			return '/me/chats';
		}

		case 'newChatMessage': {
			if (isServicePrincipal) throwChatTriggerUnsupported.call(this);

			const watchAllChats = this.getNodeParameter('watchAllChats', false, {
				extractValue: true,
			}) as boolean;

			if (watchAllChats) {
				return '/me/chats/getAllMessages';
			} else {
				const chatId = this.getNodeParameter('chatId', undefined, { extractValue: true }) as string;
				return `/chats/${decodeURIComponent(chatId)}/messages`;
			}
		}

		case 'newChannel': {
			const watchAllTeams = this.getNodeParameter('watchAllTeams', false, {
				extractValue: true,
			}) as boolean;

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
			const watchAllTeams = this.getNodeParameter('watchAllTeams', false, {
				extractValue: true,
			}) as boolean;

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
				const watchAllChannels = this.getNodeParameter('watchAllChannels', false, {
					extractValue: true,
				}) as boolean;

				if (watchAllChannels) {
					const channels = await fetchAllChannels.call(this, teamId);
					return channels.map((channel) => `/teams/${teamId}/channels/${channel.id}/messages`);
				} else {
					const channelId = this.getNodeParameter('channelId', undefined, {
						extractValue: true,
					}) as string;
					if (isServicePrincipal) {
						// SP path: validate + encode, and DO NOT decodeURIComponent.
						return buildTeamsPath.call(this, [
							'/teams/',
							{ id: teamId },
							'/channels/',
							{ id: channelId },
							'/messages',
						]);
					}
					return `/teams/${teamId}/channels/${decodeURIComponent(channelId)}/messages`;
				}
			}
		}

		case 'newTeamMember': {
			const watchAllTeams = this.getNodeParameter('watchAllTeams', false, {
				extractValue: true,
			}) as boolean;

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
				'App-only Microsoft Graph cannot subscribe to a signed-in user’s chats. Use an OAuth2 credential for chat triggers.',
		},
	);
}
