import { mock } from 'jest-mock-extended';
import type { IWebhookFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import {
	fetchAllTeams,
	fetchAllChannels,
	createSubscription,
	generateClientState,
	getResourcePath,
	verifyWebhook,
} from '../../v2/helpers/utils-trigger';
import { microsoftApiRequest } from '../../v2/transport';

jest.mock('../../v2/transport', () => ({
	microsoftApiRequest: {
		call: jest.fn(),
	},
}));

describe('Microsoft Teams Helpers Functions', () => {
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
			(microsoftApiRequest.call as jest.Mock).mockResolvedValue({
				id: 'subscription123',
				resource: '/resource/path',
				notificationUrl: 'https://webhook.url',
				expirationDateTime: '2024-01-01T00:00:00Z',
			});

			const result = await createSubscription.call(
				mockHookFunctions,
				'https://webhook.url',
				'/resource/path',
			);

			expect(result).toEqual({
				id: 'subscription123',
				resource: '/resource/path',
				notificationUrl: 'https://webhook.url',
				expirationDateTime: '2024-01-01T00:00:00Z',
			});
		});

		it('should include clientState in the subscription body when provided', async () => {
			(microsoftApiRequest.call as jest.Mock).mockResolvedValue({
				id: 'subscription123',
				resource: '/resource/path',
				notificationUrl: 'https://webhook.url',
				expirationDateTime: '2024-01-01T00:00:00Z',
			});

			await createSubscription.call(
				mockHookFunctions,
				'https://webhook.url',
				'/resource/path',
				'my-secret-state',
			);

			expect(microsoftApiRequest.call).toHaveBeenCalledWith(
				mockHookFunctions,
				'POST',
				'/v1.0/subscriptions',
				expect.objectContaining({ clientState: 'my-secret-state' }),
			);
		});

		it('should omit clientState from the subscription body when not provided', async () => {
			(microsoftApiRequest.call as jest.Mock).mockResolvedValue({
				id: 'subscription123',
				resource: '/resource/path',
				notificationUrl: 'https://webhook.url',
				expirationDateTime: '2024-01-01T00:00:00Z',
			});

			await createSubscription.call(mockHookFunctions, 'https://webhook.url', '/resource/path');

			const requestBody = (microsoftApiRequest.call as jest.Mock).mock.calls[0][3] as Record<
				string,
				unknown
			>;
			expect(requestBody.clientState).toBeUndefined();
		});

		it('should throw a NodeApiError if the API request fails', async () => {
			const error = new NodeApiError(mockHookFunctions.getNode(), {
				message: 'API request failed',
				httpCode: '400',
			});
			(microsoftApiRequest.call as jest.Mock).mockRejectedValue(error);

			await expect(
				createSubscription.call(mockHookFunctions, 'https://webhook.url', '/resource/path'),
			).rejects.toThrow(NodeApiError);
		});
	});

	describe('generateClientState', () => {
		it('should generate a 64-character hex string', () => {
			const state = generateClientState();
			expect(state).toHaveLength(64);
			expect(/^[0-9a-f]+$/.test(state)).toBe(true);
		});

		it('should generate unique values', () => {
			const a = generateClientState();
			const b = generateClientState();
			expect(a).not.toBe(b);
		});
	});

	describe('verifyWebhook', () => {
		let mockWebhookFunctions: Partial<IWebhookFunctions>;

		beforeEach(() => {
			mockWebhookFunctions = {
				getRequestObject: jest.fn(),
				getWorkflowStaticData: jest.fn(),
			};
		});

		it('should return true when no secret is stored (backward compatibility)', () => {
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				body: { value: [{ clientState: 'anything' }] },
			});
			(mockWebhookFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue({});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(true);
		});

		it('should return true when clientState matches the stored secret', () => {
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				body: {
					value: [{ clientState: 'expected-secret' }],
				},
			});
			(mockWebhookFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue({
				webhookSecret: 'expected-secret',
			});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(true);
		});

		it('should return false when clientState does not match the stored secret', () => {
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				body: { value: [{ clientState: 'wrong-secret-aa' }] },
			});
			(mockWebhookFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue({
				webhookSecret: 'expected-secret',
			});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(false);
		});

		it('should return false when clientState is missing from the notification', () => {
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				body: { value: [{}] },
			});
			(mockWebhookFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue({
				webhookSecret: 'expected-secret',
			});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(false);
		});

		it('should return true when all notifications in a batch have matching clientState', () => {
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				body: {
					value: [
						{ clientState: 'expected-secret' },
						{ clientState: 'expected-secret' },
						{ clientState: 'expected-secret' },
					],
				},
			});
			(mockWebhookFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue({
				webhookSecret: 'expected-secret',
			});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(true);
		});

		it('should return false when any notification in a batch has mismatched clientState', () => {
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				body: {
					value: [
						{ clientState: 'expected-secret' },
						{ clientState: 'wrong-secret' },
						{ clientState: 'expected-secret' },
					],
				},
			});
			(mockWebhookFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue({
				webhookSecret: 'expected-secret',
			});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(false);
		});

		it('should return false when any notification in a batch is missing clientState', () => {
			(mockWebhookFunctions.getRequestObject as jest.Mock).mockReturnValue({
				body: {
					value: [{ clientState: 'expected-secret' }, {}, { clientState: 'expected-secret' }],
				},
			});
			(mockWebhookFunctions.getWorkflowStaticData as jest.Mock).mockReturnValue({
				webhookSecret: 'expected-secret',
			});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(false);
		});
	});

	describe('getResourcePath', () => {
		it('should return the correct resource path for newChat event', async () => {
			const result = await getResourcePath.call(mockHookFunctions, 'newChat');
			expect(result).toBe('/me/chats');
		});

		it('should return the correct resource path for newChatMessage event with watchAllChats', async () => {
			mockHookFunctions.getNodeParameter.mockReturnValueOnce(true);
			const result = await getResourcePath.call(mockHookFunctions, 'newChatMessage');
			expect(result).toBe('/me/chats/getAllMessages');
		});

		it('should return the correct resource path for newChatMessage event with chatId', async () => {
			mockHookFunctions.getNodeParameter.mockReturnValueOnce(false).mockReturnValueOnce('chat123');

			const result = await getResourcePath.call(mockHookFunctions, 'newChatMessage');
			expect(result).toBe('/chats/chat123/messages');
		});

		it('should return the correct resource path for newChatMessage event with chatId missing', async () => {
			mockHookFunctions.getNodeParameter.mockReturnValueOnce(false);
			mockHookFunctions.getNodeParameter.mockReturnValueOnce(undefined);

			const result = await getResourcePath.call(mockHookFunctions, 'newChatMessage');
			expect(result).toBe('/chats/undefined/messages');
		});
		it('should return the correct resource path for newChannel event', async () => {
			mockHookFunctions.getNodeParameter.mockReturnValueOnce(false);
			mockHookFunctions.getNodeParameter.mockReturnValueOnce('team123');

			const result = await getResourcePath.call(mockHookFunctions, 'newChannel');
			expect(result).toBe('/teams/team123/channels');
		});

		it('should return the correct resource path for newChannel event with teamId missing', async () => {
			mockHookFunctions.getNodeParameter.mockReturnValueOnce(undefined);

			const result = await getResourcePath.call(mockHookFunctions, 'newChannel');
			expect(result).toBe('/teams/undefined/channels');
		});

		it('should return the correct resource path for newChannelMessage event with a specific team and channel', async () => {
			mockHookFunctions.getNodeParameter
				.mockReturnValueOnce(false)
				.mockReturnValueOnce('team123')
				.mockReturnValueOnce(false)
				.mockReturnValueOnce('channel123');

			const result = await getResourcePath.call(mockHookFunctions, 'newChannelMessage');
			expect(result).toBe('/teams/team123/channels/channel123/messages');
		});

		it('should return the correct resource path for newTeamMember event', async () => {
			mockHookFunctions.getNodeParameter.mockReturnValueOnce(false);
			mockHookFunctions.getNodeParameter.mockReturnValueOnce('team123');

			const result = await getResourcePath.call(mockHookFunctions, 'newTeamMember');
			expect(result).toBe('/teams/team123/members');
		});

		it('should return the correct resource path for newTeamMember event with teamId missing', async () => {
			mockHookFunctions.getNodeParameter.mockReturnValueOnce(undefined);

			const result = await getResourcePath.call(mockHookFunctions, 'newTeamMember');
			expect(result).toBe('/teams/undefined/members');
		});

		it('should return the correct resource path for newTeamMember event with watchAllTeams', async () => {
			mockHookFunctions.getNodeParameter.mockReturnValueOnce(true);

			(microsoftApiRequest.call as jest.Mock).mockResolvedValueOnce({
				value: [
					{ id: 'team1', displayName: 'Team 1' },
					{ id: 'team2', displayName: 'Team 2' },
				],
			});

			const result = await getResourcePath.call(mockHookFunctions, 'newTeamMember');
			expect(result).toEqual(['/teams/team1/members', '/teams/team2/members']);
		});
	});
});
