import { mock } from 'jest-mock-extended';
import type { IWebhookFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import {
	fetchAllTeams,
	fetchAllChannels,
	createSubscription,
	deleteSubscriptions,
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

		it.each([
			['send the clientState it is given', 'a-secret', ['clientState']],
			['leave clientState off the body when it is not given', undefined, []],
		])('should %s', async (_label, clientState, expectedKeys) => {
			(microsoftApiRequest.call as jest.Mock).mockResolvedValue({ id: 'subscription123' });

			await createSubscription.call(
				mockHookFunctions,
				'https://webhook.url',
				'/resource/path',
				clientState,
			);

			const [, , , body] = (microsoftApiRequest.call as jest.Mock).mock.calls[0];
			// Compare keys: a present key holding undefined satisfies both `toBe` and
			// `toEqual`, so neither tells the two branches apart.
			expect(Object.keys(body).filter((key) => key === 'clientState')).toEqual(expectedKeys);
			if (clientState) expect(body.clientState).toBe(clientState);
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

	describe('deleteSubscriptions', () => {
		const graphError = (httpCode: string) =>
			new NodeApiError(mockHookFunctions.getNode(), { message: 'Graph rejected it' }, { httpCode });

		it('should delete every id it is given', async () => {
			(microsoftApiRequest.call as jest.Mock).mockResolvedValue({});

			await deleteSubscriptions.call(mockHookFunctions, ['sub1', 'sub2']);

			expect(microsoftApiRequest.call).toHaveBeenCalledWith(
				mockHookFunctions,
				'DELETE',
				'/v1.0/subscriptions/sub1',
			);
			expect(microsoftApiRequest.call).toHaveBeenCalledWith(
				mockHookFunctions,
				'DELETE',
				'/v1.0/subscriptions/sub2',
			);
		});

		// The transport reports the status on `httpCode`, so reading `httpStatusCode`
		// rethrows the 404 this is meant to tolerate.
		it('should accept a subscription that is already gone', async () => {
			(microsoftApiRequest.call as jest.Mock).mockRejectedValue(graphError('404'));

			await expect(deleteSubscriptions.call(mockHookFunctions, ['sub1'])).resolves.toBeUndefined();
		});

		it.each([
			['any other status', () => graphError('500')],
			['an error the transport did not wrap', () => new Error('socket hang up')],
		])('should rethrow %s', async (_label, buildError) => {
			(microsoftApiRequest.call as jest.Mock).mockRejectedValue(buildError());

			await expect(deleteSubscriptions.call(mockHookFunctions, ['sub1'])).rejects.toThrow();
		});
	});

	describe('generateClientState', () => {
		it('should generate a 64-character hex string', () => {
			const state = generateClientState();
			expect(state).toHaveLength(64);
			expect(/^[0-9a-f]+$/.test(state)).toBe(true);
		});

		it('should generate unique values', () => {
			expect(generateClientState()).not.toBe(generateClientState());
		});
	});

	describe('verifyWebhook', () => {
		let mockWebhookFunctions: any;

		beforeEach(() => {
			mockWebhookFunctions = mock<IWebhookFunctions>();
		});

		const callWith = (staticData: object, body: unknown) => {
			mockWebhookFunctions.getWorkflowStaticData.mockReturnValue(staticData);
			mockWebhookFunctions.getRequestObject.mockReturnValue({ body });
			return verifyWebhook.call(mockWebhookFunctions);
		};

		it('should return false when no secret is stored', () => {
			expect(callWith({}, { value: [{ clientState: 'anything' }] })).toBe(false);
		});

		it('should return false when the stored secret is empty', () => {
			expect(callWith({ webhookSecret: '' }, { value: [{ clientState: '' }] })).toBe(false);
		});

		it('should return true when clientState matches the stored secret', () => {
			expect(
				callWith(
					{ webhookSecret: 'expected-secret' },
					{ value: [{ clientState: 'expected-secret' }] },
				),
			).toBe(true);
		});

		it.each([
			['the clientState does not match', [{ clientState: 'wrong-secret-aa' }]],
			['the clientState is missing', [{}]],
			['the batch has no notifications', []],
			[
				'one of a batch does not match',
				[{ clientState: 'expected-secret' }, { clientState: 'wrong' }],
			],
			['one of a batch is missing it', [{ clientState: 'expected-secret' }, {}]],
		])('should return false when %s', (_label, value) => {
			expect(callWith({ webhookSecret: 'expected-secret' }, { value })).toBe(false);
		});

		it('should return true when every notification in a batch matches', () => {
			expect(
				callWith(
					{ webhookSecret: 'expected-secret' },
					{
						value: [
							{ clientState: 'expected-secret' },
							{ clientState: 'expected-secret' },
							{ clientState: 'expected-secret' },
						],
					},
				),
			).toBe(true);
		});

		it('should return false when the body carries no notification array', () => {
			expect(callWith({ webhookSecret: 'expected-secret' }, undefined)).toBe(false);
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
