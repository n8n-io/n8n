import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { getTeams, getChannels } from './v2/methods/listSearch';
import { microsoftApiRequest } from './v2/transport';

export const fetchAllTeams = async function (
	this: ILoadOptionsFunctions,
): Promise<Array<{ id: string; displayName: string }>> {
	const teams = await getTeams.call(this);
	return teams.results.map((team) => ({
		id: team.value as string,
		displayName: team.name,
	}));
};

export const fetchAllChannels = async function (
	this: ILoadOptionsFunctions,
	teamId: string,
): Promise<Array<{ id: string; displayName: string }>> {
	this.getCurrentNodeParameter = () => teamId;

	const channels = await getChannels.call(this);

	return channels.results.map((channel) => ({
		id: channel.value as string,
		displayName: channel.name,
	}));
};

// Create a subscription
export const createSubscription = async function (
	this: IHookFunctions | IExecuteFunctions,
	webhookUrl: string,
	resourcePath: string,
): Promise<string> {
	const expirationTime = new Date(Date.now() + 3600 * 2 * 1000).toISOString();
	const body: IDataObject = {
		changeType: 'created',
		notificationUrl: webhookUrl,
		resource: resourcePath,
		expirationDateTime: expirationTime,
		latestSupportedTlsVersion: 'v1_2',
		lifecycleNotificationUrl: webhookUrl,
	};

	try {
		const response = await microsoftApiRequest.call(
			this as unknown as IExecuteFunctions,
			'POST',
			'/v1.0/subscriptions',
			body,
		);

		return response.id;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
};

// Get resource path based on the event
export const getResourcePath = async function (
	this: IHookFunctions,
	event: string,
): Promise<string | string[]> {
	switch (event) {
		case 'newChat': {
			return '/me/chats';
		}

		case 'newChatMessage': {
			const watchAllChats = this.getNodeParameter('watchAllChats', 0, {
				extractValue: true,
			}) as boolean;
			if (watchAllChats) return '/me/chats/getAllMessages';

			const chatId = this.getNodeParameter('chatId', 0, { extractValue: true }) as string;
			if (!chatId) throw new NodeApiError(this.getNode(), { message: 'Chat ID is required' });

			return `/chats/${chatId}/messages`;
		}

		case 'newChannel': {
			const watchAllTeams = this.getNodeParameter('watchAllTeams', 0, {
				extractValue: true,
			}) as boolean;

			if (watchAllTeams) {
				const teams = await fetchAllTeams.call(this as unknown as ILoadOptionsFunctions);
				return teams.map((team) => `/teams/${team.id}/channels`);
			}

			const teamId = this.getNodeParameter('teamId', 0, { extractValue: true }) as string;
			if (!teamId) throw new NodeApiError(this.getNode(), { message: 'Team ID is required' });

			return `/teams/${teamId}/channels`;
		}

		case 'newChannelMessage': {
			const watchAllTeams = this.getNodeParameter('watchAllTeams', 0, {
				extractValue: true,
			}) as boolean;

			if (watchAllTeams) {
				const teams = await fetchAllTeams.call(this as unknown as ILoadOptionsFunctions);

				// Fetch all channels for each team
				const teamChannels = await Promise.all(
					teams.map(async (team) => {
						const channels = await fetchAllChannels.call(
							this as unknown as ILoadOptionsFunctions,
							team.id,
						);
						return channels.map((channel) => `/teams/${team.id}/channels/${channel.id}/messages`);
					}),
				);

				return teamChannels.flat();
			}

			// If not watching all teams, fetch channels for a specific team
			const teamId = this.getNodeParameter('teamId', 0, { extractValue: true }) as string;
			if (!teamId) throw new NodeApiError(this.getNode(), { message: 'Team ID is required' });

			const watchAllChannels = this.getNodeParameter('watchAllChannels', 0, {
				extractValue: true,
			}) as boolean;

			if (watchAllChannels) {
				const channels = await fetchAllChannels.call(
					this as unknown as ILoadOptionsFunctions,
					teamId,
				);
				return channels.map((channel) => `/teams/${teamId}/channels/${channel.id}/messages`);
			}

			// If watching a specific channel in a specific team
			const channelId = this.getNodeParameter('channelId', 0, { extractValue: true }) as string;
			if (!channelId) throw new NodeApiError(this.getNode(), { message: 'Channel ID is required' });

			return `/teams/${teamId}/channels/${channelId}/messages`;
		}

		case 'newTeamMember': {
			const watchAllTeams = this.getNodeParameter('watchAllTeams', 0, {
				extractValue: true,
			}) as boolean;

			if (watchAllTeams) {
				const teams = await fetchAllTeams.call(this as unknown as ILoadOptionsFunctions);
				return teams.map((team) => `/teams/${team.id}/members`);
			}

			const teamId = this.getNodeParameter('teamId', 0, { extractValue: true }) as string;
			if (!teamId) throw new NodeApiError(this.getNode(), { message: 'Team ID is required' });

			return `/teams/${teamId}/members`;
		}

		default: {
			throw new NodeApiError(this.getNode(), {
				message: `Invalid event: ${event}`,
				description: `The selected event "${event}" is not recognized.`,
			});
		}
	}
};
