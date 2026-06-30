import { mock } from 'vitest-mock-extended';
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
import { microsoftApiRequest, SERVICE_PRINCIPAL_AUTH } from '../../v2/transport';
import type { Mock } from 'vitest';
import type * as _transport from '../../v2/transport';

// Keep the real credential-resolution + path helpers (getTeamsCredentialType,
// joinedTeamsEndpoint, buildTeamsPath) so the SP-gated trigger branches are
// exercised; only stub the network helper.
vi.mock('../../v2/transport', async () => {
	const actual = await vi.importActual<typeof _transport>('../../v2/transport');
	return {
		...actual,
		microsoftApiRequest: {
			call: vi.fn(),
		},
	};
});

describe('Microsoft Teams Helpers Functions', () => {
	let mockLoadOptionsFunctions: any;
	let mockHookFunctions: any;

	beforeEach(() => {
		mockLoadOptionsFunctions = mock();
		mockHookFunctions = mock();
		vi.clearAllMocks();
	});

	describe('fetchAllTeams', () => {
		it('should fetch all teams and map them correctly', async () => {
			(microsoftApiRequest.call as Mock).mockResolvedValue({
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
			(microsoftApiRequest.call as Mock).mockRejectedValue(new Error('Failed to fetch teams'));

			await expect(fetchAllTeams.call(mockLoadOptionsFunctions)).rejects.toThrow(
				'Failed to fetch teams',
			);
		});
	});

	describe('fetchAllChannels', () => {
		it('should fetch all channels for a team and map them correctly', async () => {
			(microsoftApiRequest.call as Mock).mockResolvedValue({
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
			(microsoftApiRequest.call as Mock).mockRejectedValue(new Error('Failed to fetch channels'));

			await expect(fetchAllChannels.call(mockLoadOptionsFunctions, 'team1')).rejects.toThrow(
				'Failed to fetch channels',
			);
		});

		it('rejects a crafted teamId under SP via buildTeamsPath (non-bypassable defense-in-depth)', async () => {
			mockHookFunctions.getNodeParameter.mockImplementation((name: string) =>
				name === 'authentication' ? SERVICE_PRINCIPAL_AUTH : undefined,
			);

			await expect(fetchAllChannels.call(mockHookFunctions, 'x/../../groups/abc')).rejects.toThrow(
				'The ID is not valid',
			);
			expect(microsoftApiRequest.call).not.toHaveBeenCalled();
		});
	});

	describe('createSubscription', () => {
		it('should create a subscription and return the subscription ID', async () => {
			(microsoftApiRequest.call as Mock).mockResolvedValue({
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
			(microsoftApiRequest.call as Mock).mockResolvedValue({
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
			(microsoftApiRequest.call as Mock).mockResolvedValue({
				id: 'subscription123',
				resource: '/resource/path',
				notificationUrl: 'https://webhook.url',
				expirationDateTime: '2024-01-01T00:00:00Z',
			});

			await createSubscription.call(mockHookFunctions, 'https://webhook.url', '/resource/path');

			const requestBody = (microsoftApiRequest.call as Mock).mock.calls[0][3] as Record<
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
			(microsoftApiRequest.call as Mock).mockRejectedValue(error);

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
				getRequestObject: vi.fn(),
				getWorkflowStaticData: vi.fn(),
			};
		});

		it('should return true when no secret is stored (backward compatibility)', () => {
			(mockWebhookFunctions.getRequestObject as Mock).mockReturnValue({
				body: { value: [{ clientState: 'anything' }] },
			});
			(mockWebhookFunctions.getWorkflowStaticData as Mock).mockReturnValue({});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(true);
		});

		it('should return true when clientState matches the stored secret', () => {
			(mockWebhookFunctions.getRequestObject as Mock).mockReturnValue({
				body: {
					value: [{ clientState: 'expected-secret' }],
				},
			});
			(mockWebhookFunctions.getWorkflowStaticData as Mock).mockReturnValue({
				webhookSecret: 'expected-secret',
			});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(true);
		});

		it('should return false when clientState does not match the stored secret', () => {
			(mockWebhookFunctions.getRequestObject as Mock).mockReturnValue({
				body: { value: [{ clientState: 'wrong-secret-aa' }] },
			});
			(mockWebhookFunctions.getWorkflowStaticData as Mock).mockReturnValue({
				webhookSecret: 'expected-secret',
			});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(false);
		});

		it('should return false when clientState is missing from the notification', () => {
			(mockWebhookFunctions.getRequestObject as Mock).mockReturnValue({
				body: { value: [{}] },
			});
			(mockWebhookFunctions.getWorkflowStaticData as Mock).mockReturnValue({
				webhookSecret: 'expected-secret',
			});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(false);
		});

		it('should return true when all notifications in a batch have matching clientState', () => {
			(mockWebhookFunctions.getRequestObject as Mock).mockReturnValue({
				body: {
					value: [
						{ clientState: 'expected-secret' },
						{ clientState: 'expected-secret' },
						{ clientState: 'expected-secret' },
					],
				},
			});
			(mockWebhookFunctions.getWorkflowStaticData as Mock).mockReturnValue({
				webhookSecret: 'expected-secret',
			});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(true);
		});

		it('should return false when any notification in a batch has mismatched clientState', () => {
			(mockWebhookFunctions.getRequestObject as Mock).mockReturnValue({
				body: {
					value: [
						{ clientState: 'expected-secret' },
						{ clientState: 'wrong-secret' },
						{ clientState: 'expected-secret' },
					],
				},
			});
			(mockWebhookFunctions.getWorkflowStaticData as Mock).mockReturnValue({
				webhookSecret: 'expected-secret',
			});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(false);
		});

		it('should return false when any notification in a batch is missing clientState', () => {
			(mockWebhookFunctions.getRequestObject as Mock).mockReturnValue({
				body: {
					value: [{ clientState: 'expected-secret' }, {}, { clientState: 'expected-secret' }],
				},
			});
			(mockWebhookFunctions.getWorkflowStaticData as Mock).mockReturnValue({
				webhookSecret: 'expected-secret',
			});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toBe(false);
		});
	});

	describe('getResourcePath', () => {
		// Resolve getNodeParameter by NAME so a leading authentication read (the SP
		// resolver) doesn't shift the assertion. `authentication` defaults to OAuth2.
		const setParams = (params: Record<string, unknown>) => {
			mockHookFunctions.getNodeParameter.mockImplementation((name: string, fallback?: unknown) =>
				name in params ? params[name] : fallback,
			);
		};

		it('should return the correct resource path for newChat event', async () => {
			setParams({});
			const result = await getResourcePath.call(mockHookFunctions, 'newChat');
			expect(result).toBe('/me/chats');
		});

		it('should return the correct resource path for newChatMessage event with watchAllChats', async () => {
			setParams({ watchAllChats: true });
			const result = await getResourcePath.call(mockHookFunctions, 'newChatMessage');
			expect(result).toBe('/me/chats/getAllMessages');
		});

		it('should return the correct resource path for newChatMessage event with chatId', async () => {
			setParams({ watchAllChats: false, chatId: 'chat123' });

			const result = await getResourcePath.call(mockHookFunctions, 'newChatMessage');
			expect(result).toBe('/chats/chat123/messages');
		});

		it('should return the correct resource path for newChatMessage event with chatId missing', async () => {
			setParams({ watchAllChats: false, chatId: undefined });

			const result = await getResourcePath.call(mockHookFunctions, 'newChatMessage');
			expect(result).toBe('/chats/undefined/messages');
		});
		it('should return the correct resource path for newChannel event', async () => {
			setParams({ watchAllTeams: false, teamId: 'team123' });

			const result = await getResourcePath.call(mockHookFunctions, 'newChannel');
			expect(result).toBe('/teams/team123/channels');
		});

		it('should return the correct resource path for newChannel event with teamId missing', async () => {
			setParams({ watchAllTeams: false, teamId: undefined });

			const result = await getResourcePath.call(mockHookFunctions, 'newChannel');
			expect(result).toBe('/teams/undefined/channels');
		});

		it('should return the correct resource path for newChannelMessage event with a specific team and channel', async () => {
			setParams({
				watchAllTeams: false,
				teamId: 'team123',
				watchAllChannels: false,
				channelId: 'channel123',
			});

			const result = await getResourcePath.call(mockHookFunctions, 'newChannelMessage');
			expect(result).toBe('/teams/team123/channels/channel123/messages');
		});

		it('should return the correct resource path for newTeamMember event', async () => {
			setParams({ watchAllTeams: false, teamId: 'team123' });

			const result = await getResourcePath.call(mockHookFunctions, 'newTeamMember');
			expect(result).toBe('/teams/team123/members');
		});

		it('should return the correct resource path for newTeamMember event with teamId missing', async () => {
			setParams({ watchAllTeams: false, teamId: undefined });

			const result = await getResourcePath.call(mockHookFunctions, 'newTeamMember');
			expect(result).toBe('/teams/undefined/members');
		});

		it('should return the correct resource path for newTeamMember event with watchAllTeams', async () => {
			setParams({ watchAllTeams: true });

			(microsoftApiRequest.call as Mock).mockResolvedValueOnce({
				value: [
					{ id: 'team1', displayName: 'Team 1' },
					{ id: 'team2', displayName: 'Team 2' },
				],
			});

			const result = await getResourcePath.call(mockHookFunctions, 'newTeamMember');
			expect(result).toEqual(['/teams/team1/members', '/teams/team2/members']);
		});
	});

	describe('getResourcePath under the Service Principal credential', () => {
		const setSpParams = (params: Record<string, unknown>) => {
			mockHookFunctions.getNodeParameter.mockImplementation((name: string, fallback?: unknown) => {
				if (name === 'authentication') return SERVICE_PRINCIPAL_AUTH;
				return name in params ? params[name] : fallback;
			});
		};

		it.each(['newChat', 'newChatMessage'])(
			'throws a static error for %s and never composes a /me path',
			async (event) => {
				setSpParams({ watchAllChats: false, chatId: 'chat123' });

				await expect(getResourcePath.call(mockHookFunctions, event)).rejects.toThrow(
					'Chat triggers are not available with the Service Principal credential',
				);
				expect(microsoftApiRequest.call).not.toHaveBeenCalled();
			},
		);

		it('interpolates the teamId RAW for newChannel (no decode round-trip, fetchAllTeams not called)', async () => {
			setSpParams({ watchAllTeams: false, teamId: 'team_id-123' });

			const result = await getResourcePath.call(mockHookFunctions, 'newChannel');
			expect(result).toBe('/teams/team_id-123/channels');
			expect(microsoftApiRequest.call).not.toHaveBeenCalled();
		});

		// Regression: under SP the watch-all toggles are hidden (SP_HIDE) and absent, so the
		// reads must fall back to `false` WITHOUT `{ extractValue: true }` — extractValue on a
		// hidden param throws a raw "Could not find property" before the channel path is built.
		it('composes the channel path when watch-all toggles are absent, and reads them without extractValue', async () => {
			setSpParams({ teamId: '1111-2222', channelId: '19:abc@thread.tacv2' });

			const result = await getResourcePath.call(mockHookFunctions, 'newChannelMessage');

			expect(result).toBe('/teams/1111-2222/channels/19:abc@thread.tacv2/messages');
			expect(mockHookFunctions.getNodeParameter).not.toHaveBeenCalledWith(
				'watchAllTeams',
				expect.anything(),
				expect.objectContaining({ extractValue: true }),
			);
			expect(mockHookFunctions.getNodeParameter).not.toHaveBeenCalledWith(
				'watchAllChannels',
				expect.anything(),
				expect.objectContaining({ extractValue: true }),
			);
		});

		it('passes a colon channelId RAW for newChannelMessage (same shape as OAuth2, not encoded)', async () => {
			setSpParams({
				watchAllTeams: false,
				teamId: '1111-2222',
				watchAllChannels: false,
				channelId: '19:abc@thread.tacv2',
			});

			const result = await getResourcePath.call(mockHookFunctions, 'newChannelMessage');
			expect(result).toBe('/teams/1111-2222/channels/19:abc@thread.tacv2/messages');
			expect(result).not.toContain('%3A');
			expect(result).not.toContain('%40');
		});

		it('decodes a By-URL (percent-encoded) channelId for newChannelMessage under SP (parity with OAuth2)', async () => {
			setSpParams({
				watchAllTeams: false,
				teamId: '1111-2222',
				watchAllChannels: false,
				// The By-URL mode extracts the channel id percent-encoded (19%3A...%40thread.tacv2).
				channelId: '19%3Aabc%40thread.tacv2',
			});

			const result = await getResourcePath.call(mockHookFunctions, 'newChannelMessage');
			// Decoded to the raw id Graph matches against, identical to the OAuth2 path.
			expect(result).toBe('/teams/1111-2222/channels/19:abc@thread.tacv2/messages');
			expect(result).not.toContain('%3A');
			expect(result).not.toContain('%40');
		});

		it('rejects a percent-encoded traversal channelId for newChannelMessage under SP (decoded before validation)', async () => {
			setSpParams({
				watchAllTeams: false,
				teamId: 'team123',
				watchAllChannels: false,
				// %2F decodes to `/`; validation runs on the decoded value and rejects the traversal.
				channelId: 'c%2F..%2F..%2Fgroups%2Fabc',
			});

			await expect(getResourcePath.call(mockHookFunctions, 'newChannelMessage')).rejects.toThrow(
				'The ID is not valid',
			);
		});

		it('throws a friendly error (not a raw URIError) for a malformed percent-encoded channelId under SP', async () => {
			setSpParams({
				watchAllTeams: false,
				teamId: '1111-2222',
				watchAllChannels: false,
				// `%zz` is not valid percent-encoding; an unguarded decodeURIComponent throws a raw URIError.
				channelId: '19%zzabc',
			});

			await expect(getResourcePath.call(mockHookFunctions, 'newChannelMessage')).rejects.toThrow(
				'The ID is not valid',
			);
		});

		it('rejects a crafted (separator) channelId for newChannelMessage', async () => {
			setSpParams({
				watchAllTeams: false,
				teamId: 'team123',
				watchAllChannels: false,
				channelId: 'c/../../groups/abc',
			});

			await expect(getResourcePath.call(mockHookFunctions, 'newChannelMessage')).rejects.toThrow(
				'The ID is not valid',
			);
		});

		it('interpolates the teamId RAW for newTeamMember', async () => {
			setSpParams({ watchAllTeams: false, teamId: 'team123' });

			const result = await getResourcePath.call(mockHookFunctions, 'newTeamMember');
			expect(result).toBe('/teams/team123/members');
		});

		// Watch-all is UI-hidden under SP, but a hand-edited workflow can still set it.
		// The runtime guard must fire before any fan-out (fetchAllTeams/fetchAllChannels),
		// which would otherwise send a crafted teamId raw under the org-wide token.
		it.each(['newChannel', 'newChannelMessage', 'newTeamMember'])(
			'blocks watchAllTeams under SP for %s before any request (crafted teamId)',
			async (event) => {
				setSpParams({ watchAllTeams: true, teamId: 'x/../../groups/abc' });

				await expect(getResourcePath.call(mockHookFunctions, event)).rejects.toThrow(
					'Watching all teams/channels is not available with the Service Principal credential',
				);
				expect(microsoftApiRequest.call).not.toHaveBeenCalled();
			},
		);

		it('blocks watchAllChannels under SP for newChannelMessage before any request (crafted teamId)', async () => {
			setSpParams({
				watchAllTeams: false,
				teamId: 'x/../../groups/abc',
				watchAllChannels: true,
			});

			await expect(getResourcePath.call(mockHookFunctions, 'newChannelMessage')).rejects.toThrow(
				'Watching all teams/channels is not available with the Service Principal credential',
			);
			expect(microsoftApiRequest.call).not.toHaveBeenCalled();
		});
	});
});
