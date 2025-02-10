import { type MockProxy, mock } from 'jest-mock-extended';
import type { IExecuteFunctions, IHookFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import {
	fetchAllTeams,
	fetchAllChannels,
	createSubscription,
	getResourcePath,
} from '../../MicrosoftTeamsTriggerHelpers.node';
import { getTeams, getChannels } from '../../v2/methods/listSearch';
import { microsoftApiRequest } from '../../v2/transport';

// Mock the external dependencies (getTeams.call, getChannels.call, microsoftApiRequest.call)
jest.mock('../../v2/methods/listSearch', () => ({
	getTeams: {
		call: jest.fn(),
	},
	getChannels: {
		call: jest.fn(),
	},
}));

jest.mock('../../v2/transport', () => ({
	microsoftApiRequest: {
		call: jest.fn(),
	},
}));

describe('Microsoft Teams Utility Functions', () => {
	let mockLoadOptionsFunctions: MockProxy<ILoadOptionsFunctions>;
	let mockHookFunctions: MockProxy<IHookFunctions>;
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		mockLoadOptionsFunctions = mock<ILoadOptionsFunctions>();
		mockHookFunctions = mock<IHookFunctions>();
		mockExecuteFunctions = mock<IExecuteFunctions>();

		// Mock the getNode method to return a valid node
		mockLoadOptionsFunctions.getNode.mockReturnValue({
			name: 'Microsoft Teams',
			typeVersion: 1,
		} as any);
		mockHookFunctions.getNode.mockReturnValue({ name: 'Microsoft Teams', typeVersion: 1 } as any);
		mockExecuteFunctions.getNode.mockReturnValue({
			name: 'Microsoft Teams',
			typeVersion: 1,
		} as any);

		jest.clearAllMocks();
	});

	describe('Unit Tests (Mocked Dependencies)', () => {
		describe('fetchAllTeams', () => {
			it('should fetch all teams and map them correctly', async () => {
				(getTeams.call as jest.Mock).mockResolvedValue({
					results: [
						{ value: 'team1', name: 'Team 1' },
						{ value: 'team2', name: 'Team 2' },
					],
				});

				const result = await fetchAllTeams.call(mockLoadOptionsFunctions);

				expect(result).toEqual([
					{ id: 'team1', displayName: 'Team 1' },
					{ id: 'team2', displayName: 'Team 2' },
				]);

				expect(getTeams.call).toHaveBeenCalledWith(mockLoadOptionsFunctions);
			});

			it('should throw an error if getTeams fails', async () => {
				(getTeams.call as jest.Mock).mockRejectedValue(new Error('Failed to fetch teams'));

				await expect(fetchAllTeams.call(mockLoadOptionsFunctions)).rejects.toThrow(
					'Failed to fetch teams',
				);
			});
		});

		describe('fetchAllChannels', () => {
			it('should fetch all channels for a team and map them correctly', async () => {
				(getChannels.call as jest.Mock).mockResolvedValue({
					results: [
						{ value: 'channel1', name: 'Channel 1' },
						{ value: 'channel2', name: 'Channel 2' },
					],
				});

				const result = await fetchAllChannels.call(mockLoadOptionsFunctions, 'team1');

				expect(result).toEqual([
					{ id: 'channel1', displayName: 'Channel 1' },
					{ id: 'channel2', displayName: 'Channel 2' },
				]);

				expect(getChannels.call).toHaveBeenCalledWith(mockLoadOptionsFunctions);
			});

			it('should throw an error if getChannels fails', async () => {
				(getChannels.call as jest.Mock).mockRejectedValue(new Error('Failed to fetch channels'));

				await expect(fetchAllChannels.call(mockLoadOptionsFunctions, 'team1')).rejects.toThrow(
					'Failed to fetch channels',
				);
			});
		});

		describe('createSubscription', () => {
			it('should create a subscription and return the subscription ID', async () => {
				(microsoftApiRequest.call as jest.Mock).mockResolvedValue({ id: 'subscription123' });

				const result = await createSubscription.call(
					mockHookFunctions,
					'https://webhook.url',
					'/resource/path',
				);

				expect(result).toBe('subscription123');

				expect(microsoftApiRequest.call).toHaveBeenCalledWith(
					mockHookFunctions,
					'POST',
					'/v1.0/subscriptions',
					{
						changeType: 'created',
						notificationUrl: 'https://webhook.url',
						resource: '/resource/path',
						expirationDateTime: expect.any(String),
						latestSupportedTlsVersion: 'v1_2',
						lifecycleNotificationUrl: 'https://webhook.url',
					},
				);
			});

			it('should throw a NodeApiError if the API request fails', async () => {
				const error = new Error('API request failed');
				(microsoftApiRequest.call as jest.Mock).mockRejectedValue(error);

				await expect(
					createSubscription.call(mockHookFunctions, 'https://webhook.url', '/resource/path'),
				).rejects.toThrow(NodeApiError);
			});
		});

		describe('getResourcePath', () => {
			it('should return the correct resource path for newChat event', async () => {
				mockHookFunctions.getNodeParameter.mockReturnValueOnce('newChat');

				const result = await getResourcePath.call(mockHookFunctions, 'newChat');

				expect(result).toBe('/me/chats');
			});

			it('should return the correct resource path for newChatMessage event with watchAllChats', async () => {
				mockHookFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
					if (parameterName === 'watchAllChats') return true;
					return null;
				});

				const result = await getResourcePath.call(mockHookFunctions, 'newChatMessage');

				expect(result).toBe('/me/chats/getAllMessages');
			});

			it('should return the correct resource path for newChannel event with watchAllTeams', async () => {
				mockHookFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
					if (parameterName === 'watchAllTeams') return true;
					return null;
				});

				(getTeams.call as jest.Mock).mockResolvedValue({
					results: [
						{ value: 'team1', name: 'Team 1' },
						{ value: 'team2', name: 'Team 2' },
					],
				});

				const result = await getResourcePath.call(mockHookFunctions, 'newChannel');

				expect(result).toEqual(['/teams/team1/channels', '/teams/team2/channels']);
			});

			it('should throw an error for an invalid event', async () => {
				await expect(getResourcePath.call(mockHookFunctions, 'invalidEvent')).rejects.toThrow(
					'Invalid event: invalidEvent',
				);
			});
		});
	});
});
