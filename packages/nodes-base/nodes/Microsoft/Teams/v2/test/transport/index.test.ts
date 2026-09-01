import type { IExecuteFunctions, IHookFunctions, ILoadOptionsFunctions, INode } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { MicrosoftTeamsTrigger } from '../../../MicrosoftTeamsTrigger.node';
import {
	getBuckets,
	getChannels,
	getChats,
	getGroups,
	getMembers,
	getPlans,
	getTeams,
	getUsers,
} from '../../methods/listSearch';
import { joinedTeamsEndpoint, SERVICE_PRINCIPAL_AUTH } from '../../transport/index';

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
		// transport's `uri` argument, so a malformed pagination token must surface as a node
		// error rather than a bare TypeError from `new URL`.
		it.each(['not-a-url', 'http'])(
			'getUsers rejects the malformed pagination token %j before any request',
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
	});
});
