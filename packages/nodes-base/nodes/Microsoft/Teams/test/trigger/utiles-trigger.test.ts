import { mock } from 'vitest-mock-extended';
import type { INode, IWebhookFunctions } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import {
	fetchAllTeams,
	fetchAllChannels,
	createSubscription,
	createSubscriptions,
	deleteSubscriptions,
	generateClientState,
	getResourcePath,
	handleLifecycleNotifications,
	isLifecycleNotification,
	isLiveSubscription,
	isSubscriptionResponse,
	listOwnSubscriptions,
	reconcileSubscriptions,
	verifyWebhook,
} from '../../v2/helpers/utils-trigger';
import {
	microsoftApiRequest,
	microsoftApiRequestAllItems,
	SERVICE_PRINCIPAL_AUTH,
} from '../../v2/transport';
import type { Mock } from 'vitest';
import type * as _transport from '../../v2/transport';

// Keep the real credential-resolution + path helpers (getTeamsCredentialType,
// joinedTeamsEndpoint, buildTeamsPath) so the SP-gated trigger branches are
// exercised; only stub the network helpers.
vi.mock('../../v2/transport', async () => {
	const actual = await vi.importActual<typeof _transport>('../../v2/transport');
	return {
		...actual,
		microsoftApiRequest: {
			call: vi.fn(),
		},
		microsoftApiRequestAllItems: {
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
				'secret',
			);

			expect(result).toEqual({
				id: 'subscription123',
				resource: '/resource/path',
				notificationUrl: 'https://webhook.url',
				expirationDateTime: '2024-01-01T00:00:00Z',
			});
		});

		it('sends the clientState in the subscription body', async () => {
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

		it('should throw a NodeApiError if the API request fails', async () => {
			const error = new NodeApiError(mockHookFunctions.getNode(), {
				message: 'API request failed',
				httpCode: '400',
			});
			(microsoftApiRequest.call as Mock).mockRejectedValue(error);

			await expect(
				createSubscription.call(mockHookFunctions, 'https://webhook.url', '/resource/path', 's'),
			).rejects.toThrow(NodeApiError);
		});
	});

	describe('isLiveSubscription', () => {
		const NOW = Date.parse('2026-10-16T10:00:00.000Z');

		beforeEach(() => {
			vi.useFakeTimers({ toFake: ['Date'], now: NOW });
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it.each([
			['5 minutes and 1 second', 5 * 60 * 1000 + 1000, true],
			['4 minutes and 59 seconds', 5 * 60 * 1000 - 1000, false],
			['exactly 5 minutes', 5 * 60 * 1000, false],
			['1 minute ago', -60 * 1000, false],
		])('expiry in %s: live is %s', (_label, offsetMs, expected) => {
			const subscription = {
				id: 'sub1',
				resource: '/me/chats',
				notificationUrl: 'https://webhook.url',
				expirationDateTime: new Date(NOW + offsetMs).toISOString(),
			};

			expect(isLiveSubscription(subscription)).toBe(expected);
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

		it('returns an empty array when no secret is stored', () => {
			(mockWebhookFunctions.getRequestObject as Mock).mockReturnValue({
				body: { value: [{ clientState: 'anything' }] },
			});
			(mockWebhookFunctions.getWorkflowStaticData as Mock).mockReturnValue({});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toEqual([]);
		});

		it('returns an empty array when the stored secret is empty', () => {
			(mockWebhookFunctions.getRequestObject as Mock).mockReturnValue({
				body: { value: [{ clientState: '' }] },
			});
			(mockWebhookFunctions.getWorkflowStaticData as Mock).mockReturnValue({
				webhookSecret: '',
			});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toEqual([]);
		});

		it('returns the item whose clientState matches', () => {
			(mockWebhookFunctions.getRequestObject as Mock).mockReturnValue({
				body: {
					value: [{ clientState: 'expected-secret' }],
				},
			});
			(mockWebhookFunctions.getWorkflowStaticData as Mock).mockReturnValue({
				webhookSecret: 'expected-secret',
			});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toEqual([{ clientState: 'expected-secret' }]);
		});

		it('returns an empty array when clientState does not match the stored secret', () => {
			(mockWebhookFunctions.getRequestObject as Mock).mockReturnValue({
				body: { value: [{ clientState: 'wrong-secret-aa' }] },
			});
			(mockWebhookFunctions.getWorkflowStaticData as Mock).mockReturnValue({
				webhookSecret: 'expected-secret',
			});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toEqual([]);
		});

		it('returns an empty array when clientState is missing from the notification', () => {
			(mockWebhookFunctions.getRequestObject as Mock).mockReturnValue({
				body: { value: [{}] },
			});
			(mockWebhookFunctions.getWorkflowStaticData as Mock).mockReturnValue({
				webhookSecret: 'expected-secret',
			});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toEqual([]);
		});

		it('returns every item when all notifications in a batch have matching clientState', () => {
			const value = [
				{ clientState: 'expected-secret' },
				{ clientState: 'expected-secret' },
				{ clientState: 'expected-secret' },
			];
			(mockWebhookFunctions.getRequestObject as Mock).mockReturnValue({ body: { value } });
			(mockWebhookFunctions.getWorkflowStaticData as Mock).mockReturnValue({
				webhookSecret: 'expected-secret',
			});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toEqual(value);
		});

		it('returns only the items whose clientState matches', () => {
			(mockWebhookFunctions.getRequestObject as Mock).mockReturnValue({
				body: {
					value: [
						{ clientState: 'expected-secret', id: 1 },
						{ clientState: 'wrong-secret', id: 2 },
						{ clientState: 'expected-secret', id: 3 },
					],
				},
			});
			(mockWebhookFunctions.getWorkflowStaticData as Mock).mockReturnValue({
				webhookSecret: 'expected-secret',
			});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toEqual([
				{ clientState: 'expected-secret', id: 1 },
				{ clientState: 'expected-secret', id: 3 },
			]);
		});

		it('drops the item without a clientState', () => {
			(mockWebhookFunctions.getRequestObject as Mock).mockReturnValue({
				body: {
					value: [
						{ clientState: 'expected-secret', id: 1 },
						{ id: 2 },
						{ clientState: 'expected-secret', id: 3 },
					],
				},
			});
			(mockWebhookFunctions.getWorkflowStaticData as Mock).mockReturnValue({
				webhookSecret: 'expected-secret',
			});

			const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
			expect(result).toEqual([
				{ clientState: 'expected-secret', id: 1 },
				{ clientState: 'expected-secret', id: 3 },
			]);
		});

		it.each([[undefined], [[]], ['x']])(
			'returns an empty array for a missing, empty or non-array value (%j)',
			(value) => {
				(mockWebhookFunctions.getRequestObject as Mock).mockReturnValue({ body: { value } });
				(mockWebhookFunctions.getWorkflowStaticData as Mock).mockReturnValue({});

				const result = verifyWebhook.call(mockWebhookFunctions as IWebhookFunctions);
				expect(result).toEqual([]);
			},
		);
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

		it('should reject a missing chatId for the newChatMessage event', async () => {
			setParams({ watchAllChats: false, chatId: undefined });

			await expect(getResourcePath.call(mockHookFunctions, 'newChatMessage')).rejects.toThrow(
				'A required ID is empty',
			);
		});

		it('should reject a missing channelId for the newChannelMessage event', async () => {
			setParams({
				watchAllTeams: false,
				teamId: 'team123',
				watchAllChannels: false,
				channelId: undefined,
			});

			await expect(getResourcePath.call(mockHookFunctions, 'newChannelMessage')).rejects.toThrow(
				'A required ID is empty',
			);
		});
		it('should return the correct resource path for newChannel event', async () => {
			setParams({ watchAllTeams: false, teamId: 'team123' });

			const result = await getResourcePath.call(mockHookFunctions, 'newChannel');
			expect(result).toBe('/teams/team123/channels');
		});

		it('should reject a missing teamId for the newChannel event', async () => {
			setParams({ watchAllTeams: false, teamId: undefined });

			await expect(getResourcePath.call(mockHookFunctions, 'newChannel')).rejects.toThrow(
				'A required ID is empty',
			);
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

		it('should reject a missing teamId for the newTeamMember event', async () => {
			setParams({ watchAllTeams: false, teamId: undefined });

			await expect(getResourcePath.call(mockHookFunctions, 'newTeamMember')).rejects.toThrow(
				'A required ID is empty',
			);
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

	describe('isLifecycleNotification', () => {
		const changeNotification = {
			subscriptionId: 's',
			subscriptionExpirationDateTime: '2026-10-19T00:00:00Z',
			clientState: 'secret',
			changeType: 'created',
			resource: 'chats/1/messages/2',
			tenantId: 't1',
			resourceData: { id: '2' },
		};

		it.each([
			[{ lifecycleEvent: 'reauthorizationRequired', subscriptionId: 's' }, true],
			[{ lifecycleEvent: 'subscriptionRemoved' }, true],
			[changeNotification, false],
			[null, false],
		])('returns %s for %j', (item, expected) => {
			expect(isLifecycleNotification(item)).toBe(expected);
		});
	});

	describe('isSubscriptionResponse', () => {
		const answer = {
			id: 'sub1',
			resource: '/me/chats',
			notificationUrl: 'https://webhook.url',
			expirationDateTime: '2026-10-19T00:00:00Z',
		};

		it.each([
			[answer, true],
			[{ ...answer, notificationUrl: undefined }, false],
			['sub1', false],
		])('returns %s for %j', (value, expected) => {
			expect(isSubscriptionResponse(value)).toBe(expected);
		});
	});

	describe('listOwnSubscriptions', () => {
		it('returns every subscription that posts to the webhook URL, expired ones included', async () => {
			const own = {
				id: 'sub1',
				resource: '/me/chats',
				notificationUrl: 'https://webhook.url',
				expirationDateTime: new Date(Date.now() + 60_000).toISOString(),
			};
			const ownExpired = {
				...own,
				id: 'sub2',
				expirationDateTime: new Date(Date.now() - 60_000).toISOString(),
			};
			const foreign = { ...own, id: 'subX', notificationUrl: 'https://other.url' };
			(microsoftApiRequestAllItems.call as Mock).mockResolvedValue([own, ownExpired, foreign]);

			const result = await listOwnSubscriptions.call(mockHookFunctions, 'https://webhook.url');

			expect(result).toEqual([own, ownExpired]);
			expect(microsoftApiRequestAllItems.call).toHaveBeenCalledWith(
				mockHookFunctions,
				'value',
				'GET',
				'/v1.0/subscriptions',
			);
		});
	});

	describe('subscription helpers', () => {
		const NOW = Date.parse('2026-10-16T10:00:00.000Z');
		const webhookUrl = 'https://webhook.url';
		const minutes = (n: number) => n * 60 * 1000;

		const subscription = (
			id: string,
			resource: string,
			expiresInMs: number,
			notificationUrl = webhookUrl,
		) => ({
			id,
			resource,
			notificationUrl,
			expirationDateTime: new Date(NOW + expiresInMs).toISOString(),
		});

		// POST answers with an id derived from the resource so a case can tell which resources were created.
		const NEW_IDS: Record<string, string> = {
			'/me/chats': 'new-chats',
			'/teams/team1/channels': 'new-team1',
			'/teams/team2/channels': 'new-team2',
		};

		const arrange = ({
			staticData = { subscriptionIds: ['sub1'], webhookSecret: 'secret' },
			params = { event: 'newChat' },
			subscriptions = [],
		}: {
			staticData?: Record<string, unknown>;
			params?: Record<string, unknown>;
			subscriptions?: unknown[];
		} = {}) => {
			const ctx: any = mock({ logger: { warn: vi.fn(), debug: vi.fn() } });
			ctx.getWorkflowStaticData.mockReturnValue(staticData);
			ctx.getNode.mockReturnValue({ name: 'Microsoft Teams Trigger' });
			ctx.getWorkflow.mockReturnValue({ id: 'wf1' });
			ctx.getNodeWebhookUrl.mockReturnValue(webhookUrl);
			ctx.getNodeParameter.mockImplementation((name: string, fallback?: unknown) =>
				name in params ? params[name] : fallback,
			);
			(microsoftApiRequestAllItems.call as Mock).mockResolvedValue(subscriptions);
			(microsoftApiRequest.call as Mock).mockImplementation(
				async (_ctx: unknown, method: string, path: string, body?: Record<string, unknown>) => {
					if (method === 'GET') return { value: [{ id: 'team1' }, { id: 'team2' }] };
					if (method === 'POST') return { id: NEW_IDS[String(body?.resource)] };
					if (method === 'PATCH') {
						return {
							id: path.slice('/v1.0/subscriptions/'.length),
							resource: '/me/chats',
							notificationUrl: webhookUrl,
							expirationDateTime: body?.expirationDateTime,
						};
					}
					return {};
				},
			);
			return { ctx, staticData };
		};

		const calls = (method: string) =>
			(microsoftApiRequest.call as Mock).mock.calls.filter((call) => call[1] === method);

		beforeEach(() => {
			vi.useFakeTimers({ toFake: ['Date'], now: NOW });
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		describe('createSubscriptions', () => {
			it('creates one subscription per resource and returns the ids in resource order', async () => {
				const { ctx } = arrange();
				let releaseA: (value: unknown) => void = () => {};
				(microsoftApiRequest.call as Mock).mockImplementation(
					async (_ctx: unknown, _method: string, _path: string, body?: Record<string, unknown>) =>
						body?.resource === '/a'
							? await new Promise((resolve) => {
									releaseA = resolve;
								})
							: { id: 'b' },
				);

				const pending = createSubscriptions.call(ctx, webhookUrl, ['/a', '/b'], 'secret');
				await new Promise((resolve) => setImmediate(resolve));
				expect(calls('POST').map((call) => call[3].resource)).toEqual(['/a', '/b']);
				releaseA({ id: 'a' });

				await expect(pending).resolves.toEqual({ ids: ['a', 'b'], failures: [] });
			});

			it('returns the failures with the original error and the ids that landed', async () => {
				const { ctx } = arrange();
				const error = new Error('create failed');
				(microsoftApiRequest.call as Mock).mockImplementation(
					async (_ctx: unknown, _method: string, _path: string, body?: Record<string, unknown>) => {
						if (body?.resource === '/a') throw error;
						return { id: 'b' };
					},
				);

				const result = await createSubscriptions.call(ctx, webhookUrl, ['/a', '/b'], 'secret');

				expect(result.ids).toEqual(['b']);
				expect(result.failures).toHaveLength(1);
				expect(result.failures[0]).toMatchObject({ step: 'create', resource: '/a' });
				expect(result.failures[0].error).toBe(error);
				expect(ctx.logger.warn).toHaveBeenCalledTimes(1);
				expect(ctx.logger.warn).toHaveBeenCalledWith(
					'Microsoft Teams Trigger: failed to create subscription',
					expect.objectContaining({ workflowId: 'wf1', resource: '/a', error: 'create failed' }),
				);
			});

			it('logs nothing on success', async () => {
				const { ctx } = arrange();

				const result = await createSubscriptions.call(ctx, webhookUrl, ['/me/chats'], 'secret');

				expect(result).toEqual({ ids: ['new-chats'], failures: [] });
				expect(microsoftApiRequest.call).toHaveBeenCalledWith(
					ctx,
					'POST',
					'/v1.0/subscriptions',
					expect.objectContaining({ resource: '/me/chats', clientState: 'secret' }),
				);
				expect(ctx.logger.warn).not.toHaveBeenCalled();
				expect(ctx.logger.debug).not.toHaveBeenCalled();
			});
		});

		describe('deleteSubscriptions', () => {
			it('deletes each id once, in order, and treats 404 as done', async () => {
				const { ctx } = arrange();
				let releaseFirst: (value: unknown) => void = () => {};
				(microsoftApiRequest.call as Mock).mockImplementation(
					async (_ctx: unknown, _method: string, path: string) => {
						if (path === '/v1.0/subscriptions/sub1') {
							return await new Promise((resolve) => {
								releaseFirst = resolve;
							});
						}
						throw new NodeApiError(ctx.getNode(), { message: 'Not found', httpCode: '404' });
					},
				);

				const pending = deleteSubscriptions.call(ctx, ['sub1', 'sub1', 'sub2']);
				await new Promise((resolve) => setImmediate(resolve));
				expect(calls('DELETE').map((call) => call[2])).toEqual(['/v1.0/subscriptions/sub1']);
				releaseFirst({});

				await expect(pending).resolves.toEqual([]);
				expect(calls('DELETE').map((call) => call[2])).toEqual([
					'/v1.0/subscriptions/sub1',
					'/v1.0/subscriptions/sub2',
				]);
				expect(ctx.logger.warn).not.toHaveBeenCalled();
			});

			it.each([
				[
					'a 403',
					(node: INode) => new NodeApiError(node, { message: 'Forbidden', httpCode: '403' }),
				],
				['a NodeOperationError', (node: INode) => new NodeOperationError(node, 'Refused')],
			])('warns and reports a failure when the request throws %s', async (_label, makeError) => {
				const { ctx } = arrange();
				const error = makeError(ctx.getNode());
				(microsoftApiRequest.call as Mock).mockRejectedValue(error);

				const result = await deleteSubscriptions.call(ctx, ['sub1']);

				expect(result).toHaveLength(1);
				expect(result[0]).toMatchObject({ step: 'delete', id: 'sub1' });
				expect(result[0].error).toBe(error);
				expect(ctx.logger.warn).toHaveBeenCalledTimes(1);
				expect(ctx.logger.warn).toHaveBeenCalledWith(
					'Microsoft Teams Trigger: failed to remove subscription',
					expect.objectContaining({ subscriptionId: 'sub1', error: expect.any(String) }),
				);
			});

			it('warns and reports nothing for an id that fails validation', async () => {
				const { ctx } = arrange();

				const result = await deleteSubscriptions.call(ctx, ['sub1/../x']);

				expect(result).toEqual([]);
				expect(microsoftApiRequest.call).not.toHaveBeenCalled();
				expect(ctx.logger.warn).toHaveBeenCalledTimes(1);
				expect(ctx.logger.warn).toHaveBeenCalledWith(
					'Microsoft Teams Trigger: failed to remove subscription',
					expect.objectContaining({ subscriptionId: 'sub1/../x', error: 'The ID is not valid' }),
				);
			});
		});

		describe('reconcileSubscriptions', () => {
			const TEAM1 = '/teams/team1/channels';
			const TEAM2 = '/teams/team2/channels';
			const reconcile = async (
				ctx: any,
				input: Partial<Parameters<typeof reconcileSubscriptions>[0]> = {},
			) =>
				await reconcileSubscriptions.call(ctx, {
					webhookUrl,
					clientState: 'secret',
					requiredResources: ['/me/chats'],
					subscriptions: [],
					...input,
				});
			const deleted = () => calls('DELETE').map((call) => call[2]);
			const created = () => calls('POST').map((call) => call[3].resource);

			it('keeps the later-expiring id and breaks a tie by id', async () => {
				const { ctx, staticData } = arrange({
					staticData: { subscriptionIds: ['c', 'b', 'a'], webhookSecret: 'secret' },
				});

				const result = await reconcile(ctx, {
					subscriptions: [
						subscription('c', '/me/chats', minutes(90)),
						subscription('a', '/me/chats', minutes(60)),
						subscription('b', '/me/chats', minutes(90)),
					],
				});

				expect(deleted()).toEqual(['/v1.0/subscriptions/c', '/v1.0/subscriptions/a']);
				expect(created()).toEqual([]);
				expect(result).toEqual({ ids: ['b'], failures: [] });
				expect(staticData.subscriptionIds).toEqual(['b']);
			});

			it('keeps one keeper per resource', async () => {
				const { ctx } = arrange({
					staticData: { subscriptionIds: ['a1', 'a2', 'b1', 'b2'], webhookSecret: 'secret' },
				});

				const result = await reconcile(ctx, {
					requiredResources: [TEAM1, TEAM2],
					subscriptions: [
						subscription('a1', TEAM1, minutes(60)),
						subscription('a2', TEAM1, minutes(90)),
						subscription('b1', TEAM2, minutes(60)),
						subscription('b2', TEAM2, minutes(90)),
					],
					renewed: new Set(['b1']),
				});

				expect(deleted()).toEqual(['/v1.0/subscriptions/a1', '/v1.0/subscriptions/b2']);
				expect(created()).toEqual([]);
				expect(result.ids).toEqual(['a2', 'b1']);
			});

			it('keeps a renewed listed subscription whose listed expiry has passed', async () => {
				const { ctx } = arrange();

				const result = await reconcile(ctx, {
					subscriptions: [subscription('sub1', '/me/chats', -minutes(1))],
					renewed: new Set(['sub1']),
				});

				expect(microsoftApiRequest.call).not.toHaveBeenCalled();
				expect(result).toEqual({ ids: ['sub1'], failures: [] });
			});

			it('deletes an unlisted renewed id whose PATCH answer was unusable and re-creates its resource', async () => {
				const { ctx, staticData } = arrange();

				const result = await reconcile(ctx, { renewed: new Set(['sub1']) });

				expect(deleted()).toEqual(['/v1.0/subscriptions/sub1']);
				expect(created()).toEqual(['/me/chats']);
				expect(result.ids).toEqual(['new-chats']);
				expect(staticData.subscriptionIds).toEqual(['new-chats']);
			});

			it('exempts gone ids from the stored-absent delete', async () => {
				const { ctx } = arrange();

				const result = await reconcile(ctx, { gone: new Set(['sub1']) });

				expect(deleted()).toEqual([]);
				expect(created()).toEqual(['/me/chats']);
				expect(result.ids).toEqual(['new-chats']);
			});

			it('creates one subscription when a resource is required twice', async () => {
				const { ctx } = arrange({ staticData: { webhookSecret: 'secret' } });

				const result = await reconcile(ctx, { requiredResources: ['/me/chats', '/me/chats'] });

				expect(created()).toEqual(['/me/chats']);
				expect(result.ids).toEqual(['new-chats']);
			});

			it('finishes the deletes before the first create', async () => {
				const { ctx } = arrange({
					staticData: { subscriptionIds: ['old'], webhookSecret: 'secret' },
				});
				let releaseDelete: (value: unknown) => void = () => {};
				(microsoftApiRequest.call as Mock).mockImplementation(
					async (_ctx: unknown, method: string) => {
						if (method === 'DELETE') {
							return await new Promise((resolve) => {
								releaseDelete = resolve;
							});
						}
						return { id: 'new-chats' };
					},
				);

				const pending = reconcile(ctx);
				await new Promise((resolve) => setImmediate(resolve));
				expect(deleted()).toEqual(['/v1.0/subscriptions/old']);
				expect(created()).toEqual([]);
				releaseDelete({});

				await expect(pending).resolves.toEqual({ ids: ['new-chats'], failures: [] });
				expect(created()).toEqual(['/me/chats']);
			});

			it.each([
				{ raw: ['b', 'a'], required: [TEAM1, TEAM2], written: false, ids: ['b', 'a'] },
				{ raw: ['a', 7], required: [TEAM1], written: true, ids: ['a'] },
				{ raw: 'garbage', required: [TEAM1], written: true, ids: ['new-team1'] },
				{ raw: ['a', 'a'], required: [TEAM1], written: true, ids: ['a'] },
				{ raw: ['a', 'a'], required: [TEAM1, TEAM2], written: true, ids: ['a', 'new-team2'] },
			])(
				'writes the ids only when the membership changed (stored $raw, written: $written)',
				async ({ raw, required, written, ids }) => {
					const { ctx, staticData } = arrange({
						staticData: { subscriptionIds: raw, webhookSecret: 'secret' },
					});

					await reconcile(ctx, {
						requiredResources: required,
						subscriptions: [
							subscription('a', TEAM1, minutes(60)),
							subscription('b', TEAM2, minutes(60)),
						],
					});

					expect(staticData.subscriptionIds).toEqual(ids);
					expect(staticData.subscriptionIds !== raw).toBe(written);
				},
			);
		});

		describe('handleLifecycleNotifications', () => {
			const expectedExpiry = new Date(NOW + 4318 * 60 * 1000).toISOString();

			const lifecycleItem = (
				lifecycleEvent: string,
				subscriptionId: string,
				clientState = 'secret',
			) => ({
				subscriptionId,
				subscriptionExpirationDateTime: new Date(NOW + minutes(10)).toISOString(),
				tenantId: 't1',
				clientState,
				lifecycleEvent,
			});

			it('re-creates every removed resource once for a batch of subscriptionRemoved items', async () => {
				const { ctx, staticData } = arrange({
					staticData: { subscriptionIds: ['sub1', 'sub2'], webhookSecret: 'secret' },
					params: { event: 'newChannel', watchAllTeams: true },
				});

				await handleLifecycleNotifications.call(ctx, [
					lifecycleItem('subscriptionRemoved', 'sub1'),
					lifecycleItem('subscriptionRemoved', 'sub2'),
				]);

				expect(microsoftApiRequestAllItems.call).toHaveBeenCalledTimes(1);
				expect(calls('POST').map((call) => call[3].resource)).toEqual([
					'/teams/team1/channels',
					'/teams/team2/channels',
				]);
				expect(staticData.subscriptionIds).toEqual(['new-team1', 'new-team2']);
			});

			it('removes an own subscription that is not stored, ignores a foreign one and re-creates the resource', async () => {
				const { ctx, staticData } = arrange({
					staticData: { subscriptionIds: ['sub0'], webhookSecret: 'secret' },
					subscriptions: [
						subscription('sub1', '/me/chats', minutes(60)),
						subscription('subX', '/me/chats', minutes(60), 'https://other.url'),
					],
				});

				await handleLifecycleNotifications.call(ctx, [
					lifecycleItem('subscriptionRemoved', 'sub0'),
				]);

				expect(calls('DELETE').map((call) => call[2])).toEqual(['/v1.0/subscriptions/sub1']);
				expect(calls('POST').map((call) => call[3].resource)).toEqual(['/me/chats']);
				expect(staticData.subscriptionIds).toEqual(['new-chats']);
			});

			it('removes an own subscription that expires within the liveness margin, then replaces it', async () => {
				const { ctx, staticData } = arrange({
					staticData: { subscriptionIds: ['sub0', 'sub1'], webhookSecret: 'secret' },
					subscriptions: [subscription('sub1', '/me/chats', minutes(2))],
				});

				await handleLifecycleNotifications.call(ctx, [
					lifecycleItem('subscriptionRemoved', 'sub0'),
				]);

				const graphCalls = (microsoftApiRequest.call as Mock).mock.calls.map((call) =>
					call.slice(1, 3),
				);
				expect(graphCalls).toEqual([
					['DELETE', '/v1.0/subscriptions/sub1'],
					['POST', '/v1.0/subscriptions'],
				]);
				expect(calls('POST')[0][3].resource).toBe('/me/chats');
				expect(staticData.subscriptionIds).toEqual(['new-chats']);
			});

			it('leaves the stored ids untouched when the reconcile finds the same set', async () => {
				const ids = ['sub1'];
				const { ctx, staticData } = arrange({
					staticData: { subscriptionIds: ids, webhookSecret: 'secret' },
					subscriptions: [subscription('sub1', '/me/chats', minutes(60))],
				});

				await handleLifecycleNotifications.call(ctx, [
					lifecycleItem('subscriptionRemoved', 'sub0'),
				]);

				expect(calls('POST')).toHaveLength(0);
				// Same reference: a copy would mean a save.
				expect(staticData.subscriptionIds).toBe(ids);
			});

			it('re-creates the resource when only a foreign subscription covers it', async () => {
				const { ctx, staticData } = arrange({
					staticData: { subscriptionIds: ['sub0'], webhookSecret: 'secret' },
					subscriptions: [subscription('subX', '/me/chats', minutes(60), 'https://other.url')],
				});

				await handleLifecycleNotifications.call(ctx, [
					lifecycleItem('subscriptionRemoved', 'sub0'),
				]);

				expect(calls('POST').map((call) => call[3].resource)).toEqual(['/me/chats']);
				expect(staticData.subscriptionIds).toEqual(['new-chats']);
			});

			it('keeps the ids that were created when one create fails', async () => {
				const { ctx, staticData } = arrange({
					params: { event: 'newChannel', watchAllTeams: true },
					subscriptions: [subscription('sub3', '/teams/team3/channels', minutes(60))],
				});
				(microsoftApiRequest.call as Mock).mockImplementation(
					async (_ctx: unknown, method: string, _path: string, body?: Record<string, unknown>) => {
						if (method === 'GET') return { value: [{ id: 'team1' }, { id: 'team2' }] };
						if (body?.resource === '/teams/team1/channels') throw new Error('create failed');
						return { id: 'new-team2' };
					},
				);

				await handleLifecycleNotifications.call(ctx, [
					lifecycleItem('subscriptionRemoved', 'sub1'),
				]);

				expect(calls('DELETE').map((call) => call[2])).toEqual(['/v1.0/subscriptions/sub3']);
				expect(ctx.logger.warn).toHaveBeenCalledTimes(1);
				expect(ctx.logger.warn).toHaveBeenCalledWith(
					'Microsoft Teams Trigger: failed to create subscription',
					expect.objectContaining({ resource: '/teams/team1/channels', error: 'create failed' }),
				);
				expect(staticData.subscriptionIds).toEqual(['new-team2']);
			});

			it.each([
				['the listing fails', 'newChat', new Error('list failed')],
				['the event is unknown', 'bogus', undefined],
			])('warns and leaves the static data alone when %s', async (_label, event, listError) => {
				const { ctx, staticData } = arrange({ params: { event } });
				if (listError) (microsoftApiRequestAllItems.call as Mock).mockRejectedValue(listError);

				await handleLifecycleNotifications.call(ctx, [
					lifecycleItem('subscriptionRemoved', 'sub1'),
				]);

				expect(ctx.logger.warn).toHaveBeenCalledTimes(1);
				expect(ctx.logger.warn).toHaveBeenCalledWith(
					'Microsoft Teams Trigger: failed to list subscriptions or resolve resources, skipped re-create',
					expect.objectContaining({ subscriptionIds: ['sub1'], error: expect.any(String) }),
				);
				expect(calls('POST')).toHaveLength(0);
				expect(staticData).toEqual({ subscriptionIds: ['sub1'], webhookSecret: 'secret' });
			});

			it('re-creates with the stored secret as clientState, not the inbound value', async () => {
				const { ctx } = arrange({
					staticData: { subscriptionIds: ['sub1'], webhookSecret: 'stored-secret' },
				});

				await handleLifecycleNotifications.call(ctx, [
					lifecycleItem('subscriptionRemoved', 'sub1', 'inbound-value'),
				]);

				expect(microsoftApiRequest.call).toHaveBeenCalledWith(
					ctx,
					'POST',
					'/v1.0/subscriptions',
					expect.objectContaining({ clientState: 'stored-secret' }),
				);
			});

			it.each([{ subscriptionIds: ['sub1'] }, { subscriptionIds: ['sub1'], webhookSecret: '' }])(
				'makes no Graph call and warns when no secret is stored (%j)',
				async (stored) => {
					const { ctx, staticData } = arrange({ staticData: { ...stored } });

					await handleLifecycleNotifications.call(ctx, [
						lifecycleItem('subscriptionRemoved', 'sub1', 'anything'),
						lifecycleItem('reauthorizationRequired', 'sub1', 'anything'),
					]);

					expect(microsoftApiRequest.call).not.toHaveBeenCalled();
					expect(microsoftApiRequestAllItems.call).not.toHaveBeenCalled();
					expect(ctx.logger.warn).toHaveBeenCalledTimes(1);
					expect(ctx.logger.warn).toHaveBeenCalledWith(
						'Microsoft Teams Trigger: skipped lifecycle notifications: no stored secret, republish the workflow',
						expect.objectContaining({ workflowId: 'wf1' }),
					);
					expect(staticData).toEqual(stored);
				},
			);

			it('ignores a lifecycle item whose subscriptionId is not a string', async () => {
				const { ctx, staticData } = arrange();

				await handleLifecycleNotifications.call(ctx, [
					{ ...lifecycleItem('subscriptionRemoved', 'x'), subscriptionId: 42 },
					{ ...lifecycleItem('reauthorizationRequired', 'x'), subscriptionId: undefined },
				]);

				expect(microsoftApiRequest.call).not.toHaveBeenCalled();
				expect(microsoftApiRequestAllItems.call).not.toHaveBeenCalled();
				expect(ctx.logger.debug).toHaveBeenCalledTimes(2);
				expect(ctx.logger.debug).toHaveBeenCalledWith(
					'Microsoft Teams Trigger: ignored lifecycle event without a subscription id',
					expect.objectContaining({ lifecycleEvent: 'subscriptionRemoved' }),
				);
				expect(staticData).toEqual({ subscriptionIds: ['sub1'], webhookSecret: 'secret' });
			});

			it('skips the renewal of an unknown subscription and reconciles instead', async () => {
				const { ctx, staticData } = arrange({
					staticData: { subscriptionIds: ['sub0'], webhookSecret: 'secret' },
					subscriptions: [subscription('sub1', '/me/chats', minutes(60))],
				});

				await handleLifecycleNotifications.call(ctx, [
					lifecycleItem('reauthorizationRequired', 'sub9'),
				]);

				expect(calls('PATCH')).toHaveLength(0);
				expect(microsoftApiRequestAllItems.call).toHaveBeenCalledTimes(1);
				expect(calls('DELETE').map((call) => call[2])).toEqual([
					'/v1.0/subscriptions/sub1',
					'/v1.0/subscriptions/sub0',
				]);
				expect(calls('POST').map((call) => call[3].resource)).toEqual(['/me/chats']);
				expect(ctx.logger.debug).toHaveBeenCalledWith(
					'Microsoft Teams Trigger: skipped renewal: unknown subscription',
					expect.objectContaining({ subscriptionId: 'sub9' }),
				);
				expect(staticData.subscriptionIds).toEqual(['new-chats']);
			});

			it.each([
				{ stored: [], deleted: ['sub1'] },
				{ stored: 'garbage', deleted: ['sub1'] },
				{ stored: undefined, deleted: ['sub1'] },
				{ stored: ['sub0', 7], deleted: ['sub1', 'sub0'] },
			])(
				'removes an own subscription that the static data does not know and re-creates its resource (stored: $stored)',
				async ({ stored, deleted }) => {
					const { ctx, staticData } = arrange({
						staticData: { subscriptionIds: stored, webhookSecret: 'secret' },
						subscriptions: [subscription('sub1', '/me/chats', minutes(60))],
					});

					await handleLifecycleNotifications.call(ctx, [
						lifecycleItem('reauthorizationRequired', 'sub1'),
					]);

					expect(calls('PATCH')).toHaveLength(0);
					expect(microsoftApiRequestAllItems.call).toHaveBeenCalledTimes(1);
					expect(calls('DELETE').map((call) => call[2])).toEqual(
						deleted.map((id) => `/v1.0/subscriptions/${id}`),
					);
					expect(calls('POST').map((call) => call[3].resource)).toEqual(['/me/chats']);
					expect(ctx.logger.warn).not.toHaveBeenCalled();
					expect(staticData.subscriptionIds).toEqual(['new-chats']);
				},
			);

			it('renews a stored subscription without rewriting the stored ids', async () => {
				const ids = ['sub1'];
				const { ctx, staticData } = arrange({
					staticData: { subscriptionIds: ids, webhookSecret: 'secret' },
				});

				await handleLifecycleNotifications.call(ctx, [
					lifecycleItem('reauthorizationRequired', 'sub1'),
				]);

				expect(calls('PATCH')).toHaveLength(1);
				expect(microsoftApiRequestAllItems.call).not.toHaveBeenCalled();
				// Same reference: a copy would mean a save.
				expect(staticData.subscriptionIds).toBe(ids);
			});

			it('skips the listing for a renew-only batch', async () => {
				const ids = ['sub1', 'sub2'];
				const { ctx, staticData } = arrange({
					staticData: { subscriptionIds: ids, webhookSecret: 'secret' },
				});

				await handleLifecycleNotifications.call(ctx, [
					lifecycleItem('reauthorizationRequired', 'sub1'),
					lifecycleItem('reauthorizationRequired', 'sub2'),
				]);

				expect(calls('PATCH').map((call) => call[2])).toEqual([
					'/v1.0/subscriptions/sub1',
					'/v1.0/subscriptions/sub2',
				]);
				expect(microsoftApiRequest.call).toHaveBeenCalledTimes(2);
				expect(microsoftApiRequestAllItems.call).not.toHaveBeenCalled();
				expect(staticData.subscriptionIds).toBe(ids);
			});

			it('reconciles a renew-only batch when the request rejected an item', async () => {
				const ids = ['sub1'];
				const { ctx, staticData } = arrange({
					staticData: { subscriptionIds: ids, webhookSecret: 'secret' },
					subscriptions: [
						subscription('sub1', '/me/chats', minutes(60)),
						subscription('sub2', '/me/chats', minutes(60)),
					],
				});

				await handleLifecycleNotifications.call(
					ctx,
					[lifecycleItem('reauthorizationRequired', 'sub1')],
					1,
				);

				expect(calls('PATCH').map((call) => call[2])).toEqual(['/v1.0/subscriptions/sub1']);
				expect(microsoftApiRequestAllItems.call).toHaveBeenCalledTimes(1);
				expect(calls('DELETE').map((call) => call[2])).toEqual(['/v1.0/subscriptions/sub2']);
				expect(calls('POST')).toHaveLength(0);
				expect(staticData.subscriptionIds).toBe(ids);
			});

			it('renews a stored id and leaves the static data alone when the listing fails', async () => {
				const ids = ['sub1'];
				const { ctx, staticData } = arrange({
					staticData: { subscriptionIds: ids, webhookSecret: 'secret' },
				});
				(microsoftApiRequestAllItems.call as Mock).mockRejectedValue(new Error('list failed'));

				await handleLifecycleNotifications.call(
					ctx,
					[lifecycleItem('reauthorizationRequired', 'sub1')],
					1,
				);

				expect(calls('PATCH')).toHaveLength(1);
				expect(microsoftApiRequestAllItems.call).toHaveBeenCalledTimes(1);
				expect(ctx.logger.warn).toHaveBeenCalledTimes(1);
				expect(ctx.logger.warn).toHaveBeenCalledWith(
					'Microsoft Teams Trigger: failed to list subscriptions or resolve resources, skipped re-create',
					expect.objectContaining({ subscriptionIds: ['sub1'] }),
				);
				expect(staticData.subscriptionIds).toBe(ids);
			});

			it('counts a renewed subscription as coverage when the listing lags', async () => {
				const { ctx, staticData } = arrange();

				await handleLifecycleNotifications.call(ctx, [
					lifecycleItem('reauthorizationRequired', 'sub1'),
					lifecycleItem('subscriptionRemoved', 'sub0'),
				]);

				expect(calls('PATCH')).toHaveLength(1);
				expect(microsoftApiRequestAllItems.call).toHaveBeenCalledTimes(1);
				expect(calls('DELETE')).toHaveLength(0);
				expect(calls('POST')).toHaveLength(0);
				expect(staticData.subscriptionIds).toEqual(['sub1']);
			});

			const validAnswer = {
				id: 'sub1',
				resource: '/me/chats',
				notificationUrl: webhookUrl,
				expirationDateTime: expectedExpiry,
			};

			it.each([
				['an empty answer', {}],
				['an answer with another notificationUrl', { ...validAnswer, notificationUrl: 'https://other.url' }],
				['an answer without notificationUrl', { ...validAnswer, notificationUrl: undefined }],
				['an answer for another id', { ...validAnswer, id: 'other' }],
			])(
				'deletes and re-creates a renewed subscription that the listing does not show after %s',
				async (_label, answer) => {
					const { ctx, staticData } = arrange();
					(microsoftApiRequest.call as Mock).mockImplementation(
						async (_ctx: unknown, method: string) =>
							method === 'PATCH' ? answer : { id: 'new-chats' },
					);

					await handleLifecycleNotifications.call(ctx, [
						lifecycleItem('reauthorizationRequired', 'sub1'),
						lifecycleItem('subscriptionRemoved', 'sub0'),
					]);

					expect(calls('PATCH')).toHaveLength(1);
					expect(microsoftApiRequestAllItems.call).toHaveBeenCalledTimes(1);
					expect(calls('DELETE').map((call) => call[2])).toEqual(['/v1.0/subscriptions/sub1']);
					expect(calls('POST').map((call) => call[3].resource)).toEqual(['/me/chats']);
					expect(ctx.logger.debug).toHaveBeenCalledWith(
						'Microsoft Teams Trigger: renewed subscription without a usable answer',
						expect.objectContaining({ subscriptionId: 'sub1' }),
					);
					expect(staticData.subscriptionIds).toEqual(['new-chats']);
				},
			);

			it('re-creates the resource when a failed renewal leaves the listed subscription inside the margin', async () => {
				const { ctx, staticData } = arrange({
					subscriptions: [subscription('sub1', '/me/chats', minutes(2))],
				});
				(microsoftApiRequest.call as Mock).mockImplementation(
					async (_ctx: unknown, method: string) => {
						if (method === 'PATCH') {
							throw new NodeApiError(ctx.getNode(), { message: 'Forbidden', httpCode: '403' });
						}
						return { id: 'new-chats' };
					},
				);

				await handleLifecycleNotifications.call(ctx, [
					lifecycleItem('reauthorizationRequired', 'sub1'),
					lifecycleItem('subscriptionRemoved', 'sub0'),
				]);

				expect(ctx.logger.warn).toHaveBeenCalledTimes(1);
				expect(ctx.logger.warn).toHaveBeenCalledWith(
					'Microsoft Teams Trigger: failed to renew subscription',
					expect.objectContaining({ subscriptionId: 'sub1' }),
				);
				expect(
					(microsoftApiRequest.call as Mock).mock.calls.map((call) => call.slice(1, 3)),
				).toEqual([
					['PATCH', '/v1.0/subscriptions/sub1'],
					['DELETE', '/v1.0/subscriptions/sub1'],
					['POST', '/v1.0/subscriptions'],
				]);
				expect(staticData.subscriptionIds).toEqual(['new-chats']);
			});

			it('keeps a subscription renewed in this request when its listed expiry has passed', async () => {
				const { ctx, staticData } = arrange({
					staticData: { subscriptionIds: ['sub1'], webhookSecret: 'secret' },
					subscriptions: [subscription('sub1', '/me/chats', 1000)],
				});
				(microsoftApiRequest.call as Mock).mockImplementation(
					async (_ctx: unknown, method: string) => {
						if (method === 'PATCH') vi.setSystemTime(NOW + 2000);
						return {};
					},
				);

				await handleLifecycleNotifications.call(ctx, [
					lifecycleItem('reauthorizationRequired', 'sub1'),
					lifecycleItem('subscriptionRemoved', 'sub0'),
				]);

				expect(microsoftApiRequest.call).toHaveBeenCalledWith(
					ctx,
					'PATCH',
					'/v1.0/subscriptions/sub1',
					{ expirationDateTime: expectedExpiry },
				);
				expect(ctx.logger.debug).toHaveBeenCalledWith(
					'Microsoft Teams Trigger: renewed subscription without a usable answer',
					expect.objectContaining({ subscriptionId: 'sub1' }),
				);
				expect(calls('DELETE')).toHaveLength(0);
				expect(calls('POST')).toHaveLength(0);
				expect(staticData.subscriptionIds).toEqual(['sub1']);
			});

			it('drops a listed subscription that Graph reports gone and re-creates its resource', async () => {
				const { ctx, staticData } = arrange({
					staticData: { subscriptionIds: ['sub1'], webhookSecret: 'secret' },
					subscriptions: [subscription('sub1', '/me/chats', minutes(60))],
				});
				(microsoftApiRequest.call as Mock).mockImplementation(
					async (_ctx: unknown, method: string) => {
						if (method === 'PATCH') {
							throw new NodeApiError(ctx.getNode(), { message: 'Not found', httpCode: '404' });
						}
						return { id: 'new-chats' };
					},
				);

				await handleLifecycleNotifications.call(ctx, [
					lifecycleItem('reauthorizationRequired', 'sub1'),
				]);

				expect(microsoftApiRequestAllItems.call).toHaveBeenCalledTimes(1);
				expect(calls('DELETE').map((call) => call[2])).toEqual(['/v1.0/subscriptions/sub1']);
				expect(calls('POST').map((call) => call[3].resource)).toEqual(['/me/chats']);
				expect(staticData.subscriptionIds).toEqual(['new-chats']);
			});

			it('lists once and warns once when the listing fails for a whole batch', async () => {
				const { ctx, staticData } = arrange();
				(microsoftApiRequestAllItems.call as Mock).mockRejectedValue(new Error('list failed'));

				await handleLifecycleNotifications.call(ctx, [
					lifecycleItem('reauthorizationRequired', 'subA'),
					lifecycleItem('reauthorizationRequired', 'subB'),
					lifecycleItem('subscriptionRemoved', 'sub1'),
				]);

				expect(microsoftApiRequestAllItems.call).toHaveBeenCalledTimes(1);
				expect(ctx.logger.warn).toHaveBeenCalledTimes(1);
				expect(ctx.logger.warn).toHaveBeenCalledWith(
					expect.any(String),
					expect.objectContaining({ subscriptionIds: ['sub1', 'subA', 'subB'] }),
				);
				expect(microsoftApiRequest.call).not.toHaveBeenCalled();
				expect(staticData).toEqual({ subscriptionIds: ['sub1'], webhookSecret: 'secret' });
			});

			it('renews a subscription once when the batch repeats it', async () => {
				const { ctx } = arrange();

				await handleLifecycleNotifications.call(ctx, [
					lifecycleItem('reauthorizationRequired', 'sub1'),
					lifecycleItem('reauthorizationRequired', 'sub1'),
					lifecycleItem('reauthorizationRequired', 'sub1'),
				]);

				expect(calls('PATCH')).toHaveLength(1);
				expect(microsoftApiRequest.call).toHaveBeenCalledTimes(1);
			});

			it.each([
				['before', ['subscriptionRemoved', 'reauthorizationRequired']],
				['after', ['reauthorizationRequired', 'subscriptionRemoved']],
			])(
				'does not renew a subscription that the same batch reports removed (removal %s)',
				async (_label, events) => {
					const { ctx } = arrange();

					await handleLifecycleNotifications.call(
						ctx,
						events.map((event) => lifecycleItem(event, 'sub1')),
					);

					expect(calls('PATCH')).toHaveLength(0);
					expect(calls('DELETE')).toHaveLength(0);
					expect(calls('POST').map((call) => call[3].resource)).toEqual(['/me/chats']);
				},
			);

			it('warns and skips the renewal when the id fails path validation', async () => {
				const { ctx, staticData } = arrange({
					staticData: { subscriptionIds: ['sub1/../x'], webhookSecret: 'secret' },
				});

				await handleLifecycleNotifications.call(ctx, [
					lifecycleItem('reauthorizationRequired', 'sub1/../x'),
				]);

				expect(calls('PATCH')).toHaveLength(0);
				expect(calls('DELETE')).toHaveLength(0);
				expect(microsoftApiRequestAllItems.call).toHaveBeenCalledTimes(1);
				expect(ctx.logger.warn).toHaveBeenCalledTimes(2);
				expect(ctx.logger.warn).toHaveBeenNthCalledWith(
					1,
					'Microsoft Teams Trigger: failed to renew subscription',
					expect.objectContaining({ error: 'The ID is not valid' }),
				);
				expect(ctx.logger.warn).toHaveBeenNthCalledWith(
					2,
					'Microsoft Teams Trigger: failed to remove subscription',
					expect.objectContaining({ subscriptionId: 'sub1/../x' }),
				);
				expect(calls('POST').map((call) => call[3].resource)).toEqual(['/me/chats']);
				expect(staticData).toEqual({ subscriptionIds: ['new-chats'], webhookSecret: 'secret' });
			});

			it('still re-creates when a stale subscription cannot be removed', async () => {
				const { ctx, staticData } = arrange({
					staticData: { subscriptionIds: ['sub0', 'sub1'], webhookSecret: 'secret' },
					subscriptions: [subscription('sub1', '/me/chats', minutes(2))],
				});
				(microsoftApiRequest.call as Mock).mockImplementation(
					async (_ctx: unknown, method: string, _path: string, body?: Record<string, unknown>) => {
						if (method === 'DELETE') {
							throw new NodeApiError(ctx.getNode(), { message: 'Forbidden', httpCode: '403' });
						}
						if (method === 'POST') return { id: NEW_IDS[String(body?.resource)] };
						return {};
					},
				);

				await handleLifecycleNotifications.call(ctx, [
					lifecycleItem('subscriptionRemoved', 'sub0'),
				]);

				expect(calls('DELETE').map((call) => call[2])).toEqual(['/v1.0/subscriptions/sub1']);
				expect(calls('POST').map((call) => call[3].resource)).toEqual(['/me/chats']);
				expect(staticData.subscriptionIds).toEqual(['new-chats']);
				expect(ctx.logger.warn).toHaveBeenCalledTimes(1);
				expect(ctx.logger.warn).toHaveBeenCalledWith(
					'Microsoft Teams Trigger: failed to remove subscription',
					expect.objectContaining({ subscriptionId: 'sub1', error: expect.any(String) }),
				);
			});

			it('partitions live and stale subscriptions once, before the deletes', async () => {
				const { ctx, staticData } = arrange({
					staticData: { subscriptionIds: ['sub0', 'subA', 'subB'], webhookSecret: 'secret' },
					params: { event: 'newChannel', watchAllTeams: true },
					subscriptions: [
						subscription('subA', '/teams/team1/channels', minutes(2)),
						subscription('subB', '/teams/team2/channels', minutes(5) + 1000),
					],
				});
				(microsoftApiRequest.call as Mock).mockImplementation(
					async (_ctx: unknown, method: string, _path: string, body?: Record<string, unknown>) => {
						if (method === 'GET') return { value: [{ id: 'team1' }, { id: 'team2' }] };
						// A slow delete moves the clock past subB's margin.
						if (method === 'DELETE') vi.setSystemTime(Date.now() + 2000);
						if (method === 'POST') return { id: NEW_IDS[String(body?.resource)] };
						return {};
					},
				);

				await handleLifecycleNotifications.call(ctx, [
					lifecycleItem('subscriptionRemoved', 'sub0'),
				]);

				expect(calls('DELETE').map((call) => call[2])).toEqual(['/v1.0/subscriptions/subA']);
				expect(calls('POST').map((call) => call[3].resource)).toEqual(['/teams/team1/channels']);
				expect(staticData.subscriptionIds).toEqual(['subB', 'new-team1']);
			});
		});
	});
});
