import type { IHookFunctions, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { TeamResponse, ChannelResponse, SubscriptionResponse } from './types';
import { microsoftApiRequest } from '../transport';

export async function fetchAllTeams(this: IHookFunctions): Promise<TeamResponse[]> {
	const { value: teams } = (await microsoftApiRequest.call(
		this,
		'GET',
		'/v1.0/me/joinedTeams',
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

	const response = (await microsoftApiRequest.call(
		this,
		'POST',
		'/v1.0/subscriptions',
		body,
	)) as SubscriptionResponse;

	return response;
}

export async function getResourcePath(
	this: IHookFunctions,
	event: string,
): Promise<string | string[]> {
	switch (event) {
		case 'newChat': {
			return '/me/chats';
		}

		case 'newChatMessage': {
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
