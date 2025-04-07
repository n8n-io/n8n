import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { microsoftApiRequest } from './v2/transport';

export async function fetchAllTeams(
	this: ILoadOptionsFunctions,
): Promise<Array<{ id: string; displayName: string }>> {
	const { value: teams } = await microsoftApiRequest.call(this, 'GET', '/v1.0/me/joinedTeams');
	return teams.map((team: IDataObject) => ({
		id: team.id as string,
		displayName: team.displayName as string,
	}));
}

export async function fetchAllChannels(
	this: ILoadOptionsFunctions,
	teamId: string,
): Promise<Array<{ id: string; displayName: string }>> {
	const { value: channels } = await microsoftApiRequest.call(
		this,
		'GET',
		`/v1.0/teams/${teamId}/channels`,
	);
	return channels.map((channel: IDataObject) => ({
		id: channel.id as string,
		displayName: channel.displayName as string,
	}));
}

export async function fetchAllChats(
	this: ILoadOptionsFunctions,
): Promise<Array<{ id: string; displayName: string; url?: string }>> {
	const { value: chats } = await microsoftApiRequest.call(this, 'GET', '/v1.0/chats');
	return chats.map((chat: IDataObject) => ({
		id: chat.id as string,
		displayName: (chat.topic || chat.id) as string,
		url: chat.webUrl as string,
	}));
}

export async function createSubscription(
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
			const watchAllChats = this.getNodeParameter('watchAllChats', 0, {
				extractValue: true,
			}) as boolean;
			if (watchAllChats) return '/me/chats/getAllMessages';

			let chatId = this.getNodeParameter('chatId', 0, { extractValue: true }) as string;
			if (!chatId) {
				throw new NodeApiError(this.getNode(), { message: 'Chat ID is required' });
			}

			chatId = decodeURIComponent(chatId);
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
			if (!teamId) {
				throw new NodeApiError(this.getNode(), { message: 'Team ID is required' });
			}

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
			const teamId = this.getNodeParameter('teamId', undefined, { extractValue: true }) as string;
			if (!teamId) {
				throw new NodeApiError(this.getNode(), { message: 'Team ID is required' });
			}

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

			let channelId = this.getNodeParameter('channelId', 0, { extractValue: true }) as string;
			if (!channelId) {
				throw new NodeApiError(this.getNode(), { message: 'Channel ID is required' });
			}

			channelId = decodeURIComponent(channelId);

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
			if (!teamId) {
				throw new NodeApiError(this.getNode(), { message: 'Team ID is required' });
			}

			return `/teams/${teamId}/members`;
		}

		default: {
			throw new NodeApiError(this.getNode(), {
				message: `Invalid event: ${event}`,
				description: `The selected event \"${event}\" is not recognized.`,
			});
		}
	}
}
