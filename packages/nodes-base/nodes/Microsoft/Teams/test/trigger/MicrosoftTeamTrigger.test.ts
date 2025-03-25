import { mock } from 'jest-mock-extended';
import { NodeApiError } from 'n8n-workflow';

import {
	fetchAllTeams,
	fetchAllChannels,
	createSubscription,
	getResourcePath,
} from '../../MicrosoftTeamsTriggerHelpers.node';
import { microsoftApiRequest } from '../../v2/transport';

jest.mock('../../v2/transport', () => ({
	microsoftApiRequest: {
		call: jest.fn(),
	},
}));

describe('Microsoft Teams Utility Functions', () => {
	let mockLoadOptionsFunctions: any;
	let mockHookFunctions: any;

	beforeEach(() => {
		mockLoadOptionsFunctions = mock();
		mockHookFunctions = mock();
		jest.clearAllMocks();
	});

	describe('fetchAllTeams', () => {
		it('should fetch all teams and map them correctly', async () => {
			(microsoftApiRequest.call as jest.Mock).mockResolvedValue({
				value: [
					{ id: 'team1', displayName: 'Team 1' },
					{ id: 'team2', displayName: 'Team 2' },
				],
			});

			const result = await fetchAllTeams.call(mockLoadOptionsFunctions);

			expect(result).toEqual([
				{ id: 'team1', displayName: 'Team 1' },
				{ id: 'team2', displayName: 'Team 2' },
			]);
			expect(microsoftApiRequest.call).toHaveBeenCalledWith(
				mockLoadOptionsFunctions,
				'GET',
				'/v1.0/me/joinedTeams',
			);
		});

		it('should throw an error if getTeams fails', async () => {
			(microsoftApiRequest.call as jest.Mock).mockRejectedValue(new Error('Failed to fetch teams'));

			await expect(fetchAllTeams.call(mockLoadOptionsFunctions)).rejects.toThrow(
				'Failed to fetch teams',
			);
		});
	});

	describe('fetchAllChannels', () => {
		it('should fetch all channels for a team and map them correctly', async () => {
			(microsoftApiRequest.call as jest.Mock).mockResolvedValue({
				value: [
					{ id: 'channel1', displayName: 'Channel 1' },
					{ id: 'channel2', displayName: 'Channel 2' },
				],
			});

			const result = await fetchAllChannels.call(mockLoadOptionsFunctions, 'team1');

			expect(result).toEqual([
				{ id: 'channel1', displayName: 'Channel 1' },
				{ id: 'channel2', displayName: 'Channel 2' },
			]);
			expect(microsoftApiRequest.call).toHaveBeenCalledWith(
				mockLoadOptionsFunctions,
				'GET',
				'/v1.0/teams/team1/channels',
			);
		});

		it('should throw an error if getChannels fails', async () => {
			(microsoftApiRequest.call as jest.Mock).mockRejectedValue(
				new Error('Failed to fetch channels'),
			);

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
				expect.objectContaining({
					changeType: 'created',
					notificationUrl: 'https://webhook.url',
					resource: '/resource/path',
					expirationDateTime: expect.any(String),
					latestSupportedTlsVersion: 'v1_2',
					lifecycleNotificationUrl: 'https://webhook.url',
				}),
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
		it('should return the correct resource path for newChannel event with watchAllTeams', async () => {
			(microsoftApiRequest.call as jest.Mock).mockResolvedValue({
				value: [
					{ id: 'team1', displayName: 'Team 1' },
					{ id: 'team2', displayName: 'Team 2' },
				],
			});

			mockHookFunctions.getNodeParameter.mockReturnValueOnce(true);

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
