import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	INode,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { MicrosoftTeamsTrigger } from '../../../MicrosoftTeamsTrigger.node';
import {
	getBuckets,
	getChannels,
	getChatMembers,
	getChats,
	getGroups,
	getMembers,
	getPlans,
	getTeams,
	getUsers,
} from '../../methods/listSearch';
import {
	CHANNEL_MESSAGE_SUBSCRIPTION_FORBIDDEN,
	CHANNEL_SUBSCRIPTION_FORBIDDEN,
	CHAT_ALL_MESSAGES_SUBSCRIPTION_FORBIDDEN,
	CHAT_SUBSCRIPTION_FORBIDDEN,
	SUBSCRIPTION_LIMIT_FORBIDDEN,
	TEAM_MEMBER_SUBSCRIPTION_FORBIDDEN,
	TEAMS_FORBIDDEN_HINTS,
} from '../../transport/forbiddenHints';
import {
	joinedTeamsEndpoint,
	microsoftApiRequest,
	SERVICE_PRINCIPAL_AUTH,
} from '../../transport/index';

describe('Microsoft Teams Transport', () => {
	let mockExecuteFunctions: Mocked<IExecuteFunctions>;
	let mockNode: INode;
	let mockRequestOAuth2: Mock;
	let mockRequestWithAuthentication: Mock;

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockRequestOAuth2 = vi.fn();
		mockRequestWithAuthentication = vi.fn();
		mockExecuteFunctions.helpers.requestOAuth2 = mockRequestOAuth2;
		mockExecuteFunctions.helpers.requestWithAuthentication = mockRequestWithAuthentication;

		mockNode = {
			id: 'test-node',
			name: 'Test Teams Node',
			type: 'n8n-nodes-base.microsoftTeams',
			typeVersion: 2,
			position: [0, 0],
			parameters: {},
		};
		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftTeamsOAuth2Api');
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('joinedTeamsEndpoint', () => {
		it('returns /v1.0/teams under the Service Principal credential', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue(SERVICE_PRINCIPAL_AUTH);

			expect(joinedTeamsEndpoint.call(mockExecuteFunctions)).toBe('/v1.0/teams');
		});

		it('returns /v1.0/me/joinedTeams under OAuth2 (default)', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue(undefined);

			expect(joinedTeamsEndpoint.call(mockExecuteFunctions)).toBe('/v1.0/me/joinedTeams');
		});
	});

	describe('listSearch credential routing', () => {
		let mockLoadOptions: Mocked<ILoadOptionsFunctions>;
		let loadOptionsRequestOAuth2: Mock;
		let loadOptionsRequestWithAuthentication: Mock;

		beforeEach(() => {
			mockLoadOptions = mockDeep<ILoadOptionsFunctions>();
			loadOptionsRequestOAuth2 = vi.fn().mockResolvedValue({ value: [] });
			loadOptionsRequestWithAuthentication = vi.fn().mockResolvedValue({ value: [] });
			mockLoadOptions.helpers.requestOAuth2 = loadOptionsRequestOAuth2;
			mockLoadOptions.helpers.requestWithAuthentication = loadOptionsRequestWithAuthentication;
			mockLoadOptions.getCredentials.mockResolvedValue({ graphApiBaseUrl: '' });
		});

		it('should route list-search requests through the selected generic credential', async () => {
			mockLoadOptions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');

			await getTeams.call(mockLoadOptions);

			expect(mockLoadOptions.getCredentials).toHaveBeenCalledWith('microsoftOAuth2Api');
			expect(loadOptionsRequestOAuth2).toHaveBeenCalledWith(
				'microsoftOAuth2Api',
				expect.anything(),
			);
			expect(loadOptionsRequestWithAuthentication).not.toHaveBeenCalled();
		});

		it('should default list-search requests to the Teams credential', async () => {
			mockLoadOptions.getNodeParameter.mockReturnValue(undefined);

			await getTeams.call(mockLoadOptions);

			expect(mockLoadOptions.getCredentials).toHaveBeenCalledWith('microsoftTeamsOAuth2Api');
			expect(loadOptionsRequestOAuth2).toHaveBeenCalledWith(
				'microsoftTeamsOAuth2Api',
				expect.anything(),
			);
			expect(loadOptionsRequestWithAuthentication).not.toHaveBeenCalled();
		});

		it('should resolve a legacy node to Teams when getNodeParameter returns the fallback 0 (never getCredentials(0))', async () => {
			// load-options getNodeParameter('authentication', 0) returns the literal fallback
			// `0` for a legacy node — must resolve to Teams, never reach getCredentials(0).
			mockLoadOptions.getNodeParameter.mockReturnValue(0);

			await getTeams.call(mockLoadOptions);

			expect(mockLoadOptions.getCredentials).toHaveBeenCalledWith('microsoftTeamsOAuth2Api');
			expect(mockLoadOptions.getCredentials).not.toHaveBeenCalledWith(0);
			expect(loadOptionsRequestOAuth2).toHaveBeenCalledWith(
				'microsoftTeamsOAuth2Api',
				expect.anything(),
			);
			expect(loadOptionsRequestWithAuthentication).not.toHaveBeenCalled();
		});

		it('getTeams hits /v1.0/teams (not /me/joinedTeams) through requestWithAuthentication under SP', async () => {
			mockLoadOptions.getNodeParameter.mockReturnValue(SERVICE_PRINCIPAL_AUTH);
			mockLoadOptions.getCredentials.mockResolvedValue({
				accessToken: 'token',
				graphApiBaseUrl: '',
			});

			await getTeams.call(mockLoadOptions);

			expect(mockLoadOptions.getCredentials).toHaveBeenCalledWith(SERVICE_PRINCIPAL_AUTH);
			expect(loadOptionsRequestWithAuthentication).toHaveBeenCalledWith(
				SERVICE_PRINCIPAL_AUTH,
				expect.objectContaining({ uri: 'https://graph.microsoft.com/v1.0/teams' }),
			);
			const calledUri = loadOptionsRequestWithAuthentication.mock.calls[0][1].uri as string;
			expect(calledUri).not.toContain('/me/joinedTeams');
			expect(loadOptionsRequestOAuth2).not.toHaveBeenCalled();
		});

		it('getTeams pages through @odata.nextLink under SP (all org teams, not just page 1)', async () => {
			mockLoadOptions.getNodeParameter.mockReturnValue(SERVICE_PRINCIPAL_AUTH);
			mockLoadOptions.getCredentials.mockResolvedValue({
				accessToken: 'token',
				graphApiBaseUrl: '',
			});
			// page 1 carries @odata.nextLink → the paginator must follow it to page 2.
			loadOptionsRequestWithAuthentication
				.mockResolvedValueOnce({
					value: [{ id: 't1', displayName: 'Team 1' }],
					'@odata.nextLink': 'https://graph.microsoft.com/v1.0/teams?$skiptoken=p2',
				})
				.mockResolvedValueOnce({ value: [{ id: 't2', displayName: 'Team 2' }] });

			const { results } = await getTeams.call(mockLoadOptions);

			expect(loadOptionsRequestWithAuthentication).toHaveBeenCalledTimes(2);
			// page 2 fetched via the absolute nextLink uri
			expect(loadOptionsRequestWithAuthentication).toHaveBeenNthCalledWith(
				2,
				SERVICE_PRINCIPAL_AUTH,
				expect.objectContaining({
					uri: 'https://graph.microsoft.com/v1.0/teams?$skiptoken=p2',
				}),
			);
			expect(results.map((r) => r.value)).toEqual(['t1', 't2']);
		});

		it('getGroups lists the joined teams (/v1.0/me/joinedTeams), not tenant groups (/v1.0/groups)', async () => {
			mockLoadOptions.getNodeParameter.mockReturnValue(undefined);
			loadOptionsRequestOAuth2.mockResolvedValue({
				value: [
					{ id: 'g1', displayName: 'Team 1' },
					{ id: 'g2', displayName: 'Team 2' },
				],
			});

			const { results } = await getGroups.call(mockLoadOptions);

			const calledUri = loadOptionsRequestOAuth2.mock.calls[0][1].uri as string;
			expect(calledUri).toContain('/v1.0/me/joinedTeams');
			expect(calledUri).not.toContain('/v1.0/groups');
			expect(results.map((r) => r.value)).toEqual(['g1', 'g2']);
		});

		it('getGroups pages through @odata.nextLink (teams past the first page are found)', async () => {
			mockLoadOptions.getNodeParameter.mockReturnValue(undefined);
			// page 1 carries @odata.nextLink → the paginator must follow it to page 2.
			loadOptionsRequestOAuth2
				.mockResolvedValueOnce({
					value: [{ id: 'g1', displayName: 'Team 1' }],
					'@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/joinedTeams?$skiptoken=p2',
				})
				.mockResolvedValueOnce({ value: [{ id: 'g2', displayName: 'Team 2' }] });

			const { results } = await getGroups.call(mockLoadOptions);

			expect(loadOptionsRequestOAuth2).toHaveBeenCalledTimes(2);
			expect(loadOptionsRequestOAuth2).toHaveBeenNthCalledWith(
				2,
				'microsoftTeamsOAuth2Api',
				expect.objectContaining({
					uri: 'https://graph.microsoft.com/v1.0/me/joinedTeams?$skiptoken=p2',
				}),
			);
			expect(results.map((r) => r.value)).toEqual(['g1', 'g2']);
		});

		it('getChats throws a static error under SP and never issues a request', async () => {
			mockLoadOptions.getNodeParameter.mockReturnValue(SERVICE_PRINCIPAL_AUTH);

			await expect(getChats.call(mockLoadOptions)).rejects.toThrow(
				'Chats are not available with the Service Principal credential',
			);
			expect(loadOptionsRequestWithAuthentication).not.toHaveBeenCalled();
			expect(loadOptionsRequestOAuth2).not.toHaveBeenCalled();
		});

		// `getUsers` is the first Teams path handing a client-supplied string to the
		// transport's `uri` argument: an unparseable token must surface as a node error rather
		// than a bare TypeError from `new URL`, and a parseable one must still stay on the
		// credential's Graph host.
		it.each(['not-a-url', 'http', 'https://evil.example/users'])(
			'getUsers rejects the pagination token %j before any request',
			async (paginationToken) => {
				mockLoadOptions.getNodeParameter.mockReturnValue(undefined);

				await expect(getUsers.call(mockLoadOptions, undefined, paginationToken)).rejects.toThrow(
					'Refusing to send credentials to an unexpected host',
				);
				expect(loadOptionsRequestOAuth2).not.toHaveBeenCalled();
			},
		);

		// MAJOR B hard gate: every SP-reachable listSearch method that interpolates an id
		// must reject a malformed id via buildTeamsPath, before any request.
		describe('SP id validation gate (enumerated)', () => {
			const malformedId = 'x/../../groups/abc';

			beforeEach(() => {
				mockLoadOptions.getNodeParameter.mockReturnValue(SERVICE_PRINCIPAL_AUTH);
				mockLoadOptions.getCredentials.mockResolvedValue({
					accessToken: 'token',
					graphApiBaseUrl: '',
				});
			});

			it('getChannels rejects a malformed teamId', async () => {
				mockLoadOptions.getCurrentNodeParameter.mockReturnValue(malformedId);

				await expect(getChannels.call(mockLoadOptions)).rejects.toThrow('The ID is not valid');
				expect(loadOptionsRequestWithAuthentication).not.toHaveBeenCalled();
			});

			it('getPlans rejects a malformed groupId', async () => {
				mockLoadOptions.getCurrentNodeParameter.mockReturnValue(malformedId);

				await expect(getPlans.call(mockLoadOptions)).rejects.toThrow('The ID is not valid');
				expect(loadOptionsRequestWithAuthentication).not.toHaveBeenCalled();
			});

			it('getBuckets rejects a malformed planId', async () => {
				mockLoadOptions.getCurrentNodeParameter.mockReturnValue(malformedId);

				await expect(getBuckets.call(mockLoadOptions)).rejects.toThrow('The ID is not valid');
				expect(loadOptionsRequestWithAuthentication).not.toHaveBeenCalled();
			});

			it('getMembers rejects a malformed groupId', async () => {
				mockLoadOptions.getCurrentNodeParameter.mockReturnValue(malformedId);

				await expect(getMembers.call(mockLoadOptions)).rejects.toThrow('The ID is not valid');
				expect(loadOptionsRequestWithAuthentication).not.toHaveBeenCalled();
			});

			it('getChatMembers rejects a malformed chatId', async () => {
				mockLoadOptions.getCurrentNodeParameter.mockReturnValue(malformedId);

				await expect(getChatMembers.call(mockLoadOptions)).rejects.toThrow('The ID is not valid');
				expect(loadOptionsRequestWithAuthentication).not.toHaveBeenCalled();
			});
		});
	});

	// Drives the real Trigger hook through the real transport (no transport mock) to pin the
	// webhook hook -> microsoftApiRequest -> credential-resolution wiring end to end.
	describe('Trigger webhook hooks credential routing (end-to-end)', () => {
		let mockHookFunctions: Mocked<IHookFunctions>;
		let hookRequestOAuth2: Mock;

		beforeEach(() => {
			mockHookFunctions = mockDeep<IHookFunctions>();
			hookRequestOAuth2 = vi.fn().mockResolvedValue({});
			mockHookFunctions.helpers.requestOAuth2 = hookRequestOAuth2;
			mockHookFunctions.getCredentials.mockResolvedValue({ graphApiBaseUrl: '' });
			mockHookFunctions.getNode.mockReturnValue(mockNode);
			mockHookFunctions.getWorkflow.mockReturnValue({ id: 'wf1', active: true });
			mockHookFunctions.getWorkflowStaticData.mockReturnValue({ subscriptionIds: ['sub-1'] });
		});

		it('should delete subscriptions through the selected generic credential', async () => {
			mockHookFunctions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');

			const result = await new MicrosoftTeamsTrigger().webhookMethods.default.delete.call(
				mockHookFunctions,
			);

			expect(result).toBe(true);
			expect(mockHookFunctions.getCredentials).toHaveBeenCalledWith('microsoftOAuth2Api');
			expect(hookRequestOAuth2).toHaveBeenCalledWith(
				'microsoftOAuth2Api',
				expect.objectContaining({ method: 'DELETE' }),
			);
		});

		it('should default subscription deletes to the Teams credential (backward compatibility)', async () => {
			mockHookFunctions.getNodeParameter.mockReturnValue(undefined);

			const result = await new MicrosoftTeamsTrigger().webhookMethods.default.delete.call(
				mockHookFunctions,
			);

			expect(result).toBe(true);
			expect(mockHookFunctions.getCredentials).toHaveBeenCalledWith('microsoftTeamsOAuth2Api');
			expect(hookRequestOAuth2).toHaveBeenCalledWith(
				'microsoftTeamsOAuth2Api',
				expect.objectContaining({ method: 'DELETE' }),
			);
		});

		// The trigger counts a 404 as already removed, which needs the status on the error that the
		// delegated request path rejects with.
		it('counts a raw Graph 404 on a subscription delete as already removed', async () => {
			mockHookFunctions.getNodeParameter.mockReturnValue(undefined);
			const body = { error: { code: 'ResourceNotFound', message: 'The object was not found.' } };
			const notFound = Object.assign(new Error(`404 - ${JSON.stringify(body)}`), {
				statusCode: 404,
				error: body,
			});
			hookRequestOAuth2.mockImplementation(async (_type: string, options: { method: string }) => {
				if (options.method === 'DELETE') throw notFound;
				return { value: [] };
			});

			const result = await new MicrosoftTeamsTrigger().webhookMethods.default.delete.call(
				mockHookFunctions,
			);

			expect(result).toBe(true);
			expect(mockHookFunctions.logger.warn).not.toHaveBeenCalled();
		});
	});

	// Drives the real facade with the literal Graph 403 texts of a refused Trigger subscription.
	// Each fixture spells out its own resource path and never derives it from `hint.match`, so a
	// narrowed or permission-name `match` fails here.
	describe('subscription 403 hints (POST /v1.0/subscriptions)', () => {
		const TEAM_ID = '3b2d1c0a-1111-2222-3333-444444444444';
		const CHANNEL_ID = '19:abc123def456@thread.tacv2';
		const CHAT_ID = '19:0123456789abcdef0123456789abcdef@thread.v2';
		const USER_ID = '7f1e2d3c-5555-6666-7777-888888888888';
		const GENERIC_APP_ONLY_403 =
			'The app registration is missing a consented application permission for this operation. Grant the required Graph application permission and admin consent, then retry.';
		const refused = (resource: string) =>
			`Operation: Create; Exception: [Status Code: Forbidden; Reason: Caller does not have access to '${resource}' resource]`;

		// Every shape below was seen live on the QA tenant on 2026-10-19 (n8n 2.44.0, delegated and
		// app-only), with these ids replaced. Graph renders the posted slash-form path back in key form
		// and upper-cases the user id in the `/users(...)` shape.
		const MEMBERS_403 = refused(`/teams('${TEAM_ID}')/members`);
		const CHANNELS_403 = refused(`/teams('${TEAM_ID}')/channels`);
		const CHANNEL_MESSAGES_403 = refused(`/teams('${TEAM_ID}')/channels('${CHANNEL_ID}')/messages`);
		const CHAT_MESSAGES_403 = refused(`/chats('${CHAT_ID}')/messages`);
		const USER_CHATS_403 = refused(`/users('${USER_ID.toUpperCase()}')/chats`);
		// `/me/chats/getAllMessages` has its own renderer without a path
		const CHAT_ALL_MESSAGES_403 =
			"Operation: Create; Exception: [Status Code: Forbidden; Reason: Required permissions to access user-scoped chat message subscription ('Chat.Read, Chat.ReadWrite') are missing.]";
		// Same renderer, a resource no hint covers: an over-broad match such as `' resource` would fire
		const MAIL_403 = refused(`/users('${USER_ID}')/mailFolders('inbox')/messages`);
		// Seen live on the QA tenant for a second `/teams/{id}/channels` subscription of one user, with
		// the resource token in upper case. The app-subject form follows a Microsoft Q&A report.
		const LIMIT_403 = `Operation: Create; Exception: [Status Code: Forbidden; Reason: User '${USER_ID}' has reached its limit of '1' 'TEAMS/${TEAM_ID.toUpperCase()}/CHANNELS' subscription on tenant '${USER_ID}'.]`;
		const APP_LIMIT_403 = LIMIT_403.replace(`User '${USER_ID}'`, `App '${USER_ID}'`);
		// Modeled on LIMIT_403 for the documented quota of ten chat subscriptions per user, not seen live
		const LIMIT_OF_TEN_403 = `Operation: Create; Exception: [Status Code: Forbidden; Reason: User '${USER_ID}' has reached its limit of '10' 'ME/CHATS' subscription on tenant '${USER_ID}'.]`;
		// Names the hinted permissions only as granted roles (a listing 403 on GET /v1.0/subscriptions
		// has this shape too): no hint may fire on it
		const GRANTED_403 =
			"Missing role permissions on the request. API requires one of 'Subscription.Read.All'. Roles on the request 'TeamMember.Read.All, Channel.ReadBasic.All, ChannelMessage.Read.All, Chat.Read.All'. Resource specific consent grants on the request ''.";

		// Raw request-library shape: `<status> - <json body>` message, `statusCode`, and the
		// Graph body under `error`. Same construction as the kernel tests.
		const graphError = (message: string) =>
			Object.assign(
				new Error(`403 - ${JSON.stringify({ error: { code: 'ExtensionError', message } })}`),
				{ statusCode: 403, error: { error: { code: 'ExtensionError', message } } },
			);
		// `requestWithAuthentication` wraps the raw error in a NodeApiError before the kernel sees it
		const wrapped = (message: string) =>
			new NodeApiError(mockNode, graphError(message) as unknown as JsonObject);
		const post = async (resource = '/v1.0/subscriptions') =>
			(await microsoftApiRequest
				.call(mockExecuteFunctions, 'POST', resource, {})
				.catch((e: Error) => e)) as NodeApiError;
		// The kernel rebuilds the app-only error from static copy; pin that every surface the editor
		// renders (message, description, messages, serialized form) carries no Graph id, in any case.
		const expectNoGraphIds = (error: NodeApiError) => {
			const rendered = [error.message, error.description, ...error.messages, JSON.stringify(error)]
				.join('\n')
				.toLowerCase();
			for (const id of [TEAM_ID, CHANNEL_ID, CHAT_ID, USER_ID]) {
				expect(rendered).not.toContain(id.toLowerCase());
			}
		};

		const teamRows = [
			{
				label: 'team member',
				hint: TEAM_MEMBER_SUBSCRIPTION_FORBIDDEN,
				graphText: MEMBERS_403,
				permission: 'TeamMember.Read.All',
			},
			{
				label: 'new channel',
				hint: CHANNEL_SUBSCRIPTION_FORBIDDEN,
				graphText: CHANNELS_403,
				permission: 'Channel.ReadBasic.All',
			},
			{
				label: 'channel message',
				hint: CHANNEL_MESSAGE_SUBSCRIPTION_FORBIDDEN,
				graphText: CHANNEL_MESSAGES_403,
				permission: 'ChannelMessage.Read.All',
			},
		];
		const chatRows = [
			{
				label: 'chat message',
				hint: CHAT_SUBSCRIPTION_FORBIDDEN,
				graphText: CHAT_MESSAGES_403,
				permission: 'Chat.Read',
			},
			{
				label: 'user chats',
				hint: CHAT_SUBSCRIPTION_FORBIDDEN,
				graphText: USER_CHATS_403,
				permission: 'Chat.Read',
			},
			{
				label: 'all chat messages',
				hint: CHAT_ALL_MESSAGES_SUBSCRIPTION_FORBIDDEN,
				graphText: CHAT_ALL_MESSAGES_403,
				permission: 'Chat.Read',
			},
		];
		const unhintedRows: Array<{ when: string; graphText: string; resource?: string }> = [
			{ when: 'the hinted permissions appear only as granted roles', graphText: GRANTED_403 },
			{ when: 'the refused resource has no hint', graphText: MAIL_403 },
			{ when: 'the subscription quota is not one', graphText: LIMIT_OF_TEN_403 },
			// The endpoint gate: the members text on a path other than /subscriptions stays unhinted
			{
				when: 'the refused members path is not a subscription',
				graphText: MEMBERS_403,
				resource: `/v1.0/teams/${TEAM_ID}/members`,
			},
		];

		beforeEach(() => {
			mockExecuteFunctions.getCredentials.mockResolvedValue({ graphApiBaseUrl: '' });
		});

		const limitRows = [
			{ label: 'user limit', hint: SUBSCRIPTION_LIMIT_FORBIDDEN, graphText: LIMIT_403 },
			{ label: 'app limit', hint: SUBSCRIPTION_LIMIT_FORBIDDEN, graphText: APP_LIMIT_403 },
		];

		// Pins the hint-table comment: each text matches exactly one hint, so order does not matter
		it.each([...teamRows, ...chatRows, ...limitRows])(
			'matches exactly one hint for a $label text',
			({ hint, graphText }) => {
				expect(TEAMS_FORBIDDEN_HINTS.filter((h) => graphText.includes(h.match))).toEqual([hint]);
			},
		);

		describe('under the Service Principal credential', () => {
			beforeEach(() => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue(SERVICE_PRINCIPAL_AUTH);
			});

			it.each(teamRows)(
				'names the $permission application permission for a $label subscription',
				async ({ hint, graphText, permission }) => {
					mockRequestWithAuthentication.mockRejectedValue(wrapped(graphText));

					const error = await post();

					expect(error).toBeInstanceOf(NodeApiError);
					expect(error.httpCode).toBe('403');
					expect(error.message).toBe(hint.message);
					expect(error.description).toBe(hint.description);
					expect(error.message).toContain(`${permission} application permission`);
					expect(error.description).toContain(permission);
					expectNoGraphIds(error);
				},
			);

			// The trigger's guard throws this copy before any request under SP; the hint carries
			// the same copy for the kernel path.
			it.each(chatRows)(
				'keeps the chat-trigger guard copy for a $label subscription',
				async ({ hint, graphText }) => {
					mockRequestWithAuthentication.mockRejectedValue(wrapped(graphText));

					const error = await post();

					expect(error.message).toBe(hint.message);
					expect(error.description).toBe(hint.description);
					expectNoGraphIds(error);
				},
			);

			it.each(unhintedRows)(
				'keeps the generic copy when $when',
				async ({ graphText, resource }) => {
					mockRequestWithAuthentication.mockRejectedValue(wrapped(graphText));

					const error = await post(resource);

					expect(error.message).toBe(GENERIC_APP_ONLY_403);
					expect(error.description).toBeUndefined();
					// The static copy is all that reaches the error details
					expect(error.messages).toEqual([GENERIC_APP_ONLY_403]);
				},
			);

			it('explains the quota of one for an app limit text', async () => {
				mockRequestWithAuthentication.mockRejectedValue(wrapped(APP_LIMIT_403));

				const error = await post();

				expect(error.httpCode).toBe('403');
				expect(error.message).toBe(SUBSCRIPTION_LIMIT_FORBIDDEN.message);
				expect(error.description).toBe(SUBSCRIPTION_LIMIT_FORBIDDEN.description);
				expectNoGraphIds(error);
			});
		});

		describe('under a delegated OAuth2 credential', () => {
			beforeEach(() => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftTeamsOAuth2Api');
			});

			it.each([...teamRows, ...chatRows])(
				'names the $permission permission for a $label subscription',
				async ({ hint, graphText, permission }) => {
					mockRequestOAuth2.mockRejectedValue(graphError(graphText));

					const error = await post();

					expect(error).toBeInstanceOf(NodeApiError);
					expect(error.httpCode).toBe('403');
					expect(error.message).toBe(hint.delegated.message);
					expect(error.description).toBe(hint.delegated.description);
					expect(error.message).toContain(`the ${permission} permission`);
					expect(error.description).toContain(permission);
					// The raw Graph text stays in the error details
					expect(error.messages).toContain(graphText);
				},
			);

			it.each(unhintedRows)(
				'passes the raw text through when $when',
				async ({ graphText, resource }) => {
					mockRequestOAuth2.mockRejectedValue(graphError(graphText));

					const error = await post(resource);

					expect(error.message).toBe(graphText);
				},
			);

			it('explains the quota of one for a user limit text', async () => {
				mockRequestOAuth2.mockRejectedValue(graphError(LIMIT_403));

				const error = await post();

				expect(error.httpCode).toBe('403');
				expect(error.message).toBe(SUBSCRIPTION_LIMIT_FORBIDDEN.delegated.message);
				expect(error.description).toBe(SUBSCRIPTION_LIMIT_FORBIDDEN.delegated.description);
				// The raw Graph text stays in the error details
				expect(error.messages).toContain(LIMIT_403);
			});

			// The create hook has no catch of its own. Pin that the hint copy reaches the publish
			// surface unchanged through the real hook.
			it('surfaces the hint copy through the Trigger create hook', async () => {
				const hooks: Mocked<IHookFunctions> = mockDeep<IHookFunctions>();
				hooks.helpers.requestOAuth2 = vi.fn().mockRejectedValue(graphError(MEMBERS_403));
				hooks.getCredentials.mockResolvedValue({ graphApiBaseUrl: '' });
				hooks.getNode.mockReturnValue(mockNode);
				hooks.getWorkflow.mockReturnValue({ id: 'wf1', active: true });
				hooks.getNodeWebhookUrl.mockReturnValue('https://n8n.example.com/webhook/teams');
				hooks.getWorkflowStaticData.mockReturnValue({});
				const parameters: Partial<Record<string, string>> = {
					authentication: 'microsoftTeamsOAuth2Api',
					event: 'newTeamMember',
					teamId: TEAM_ID,
				};
				hooks.getNodeParameter.mockImplementation((name) => parameters[name] ?? false);

				await expect(
					new MicrosoftTeamsTrigger().webhookMethods.default.create.call(hooks),
				).rejects.toMatchObject({
					message: TEAM_MEMBER_SUBSCRIPTION_FORBIDDEN.delegated.message,
					description: TEAM_MEMBER_SUBSCRIPTION_FORBIDDEN.delegated.description,
				});
			});
		});
	});
});
