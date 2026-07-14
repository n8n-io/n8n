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
	getChats,
	getGroups,
	getMembers,
	getPlans,
	getTeams,
} from '../../methods/listSearch';
import {
	buildTeamsPath,
	getTeamsCredentialType,
	joinedTeamsEndpoint,
	microsoftApiRequest,
	SERVICE_PRINCIPAL_AUTH,
	validateTeamsId,
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

	describe('microsoftApiRequest', () => {
		describe('graphApiBaseUrl from credentials', () => {
			it('should use base URL from credentials', async () => {
				const mockResponse = { data: 'test' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://graph.microsoft.us',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.us/teams',
						json: true,
					}),
				);
			});

			it('should fall back to default when credentials.graphApiBaseUrl is empty', async () => {
				const mockResponse = { data: 'test' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: '',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/teams',
						json: true,
					}),
				);
			});

			it('should fall back to default when credentials.graphApiBaseUrl is undefined', async () => {
				const mockResponse = { data: 'test' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/teams',
						json: true,
					}),
				);
			});

			it('should strip trailing slashes from base URL using regex', async () => {
				const mockResponse = { data: 'test' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://graph.microsoft.com/',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/teams',
						json: true,
					}),
				);
			});

			it('should strip multiple trailing slashes from base URL', async () => {
				const mockResponse = { data: 'test' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://graph.microsoft.com///',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/teams',
						json: true,
					}),
				);
			});

			it('should use US Government cloud endpoint', async () => {
				const mockResponse = { data: 'test' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://graph.microsoft.us',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.us/teams',
						json: true,
					}),
				);
			});

			it('should use US Government DOD cloud endpoint', async () => {
				const mockResponse = { data: 'test' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://dod-graph.microsoft.us',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://dod-graph.microsoft.us/teams',
						json: true,
					}),
				);
			});

			it('should use China cloud endpoint', async () => {
				const mockResponse = { data: 'test' };
				mockRequestOAuth2.mockResolvedValue(mockResponse);
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: {
						access_token: 'test-access-token',
					},
					graphApiBaseUrl: 'https://microsoftgraph.chinacloudapi.cn',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: 'https://microsoftgraph.chinacloudapi.cn/teams',
						json: true,
					}),
				);
			});
		});

		describe('authentication credential resolution', () => {
			beforeEach(() => {
				mockRequestOAuth2.mockResolvedValue({ data: 'test' });
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					graphApiBaseUrl: 'https://graph.microsoft.us',
				});
			});

			it('should use microsoftTeamsOAuth2Api when authentication is not set (backward compatibility)', async () => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue(undefined);

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('microsoftTeamsOAuth2Api');
				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.anything(),
				);
				// dual-branch lock: the OAuth2 path must never reach requestWithAuthentication
				expect(mockRequestWithAuthentication).not.toHaveBeenCalled();
			});

			it('should use microsoftTeamsOAuth2Api when explicitly selected', async () => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftTeamsOAuth2Api');

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('microsoftTeamsOAuth2Api');
				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.anything(),
				);
				expect(mockRequestWithAuthentication).not.toHaveBeenCalled();
			});

			it('should use microsoftOAuth2Api when the generic credential is selected', async () => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('microsoftOAuth2Api');
				expect(mockRequestOAuth2).toHaveBeenCalledWith('microsoftOAuth2Api', expect.anything());
				expect(mockRequestWithAuthentication).not.toHaveBeenCalled();
			});

			it('should resolve the credential name from the authentication parameter at index 0', async () => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('authentication', 0);
			});

			it('should honor graphApiBaseUrl from the generic credential (sovereign cloud)', async () => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('microsoftOAuth2Api');
				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftOAuth2Api',
					expect.objectContaining({
						uri: 'https://graph.microsoft.us/teams',
					}),
				);
			});
		});

		describe('service principal authentication', () => {
			beforeEach(() => {
				mockRequestWithAuthentication.mockResolvedValue({ data: 'test' });
				// Drive selection by parameter NAME, not a flat return value, so the
				// resolver's `getNodeParameter('authentication', 0)` resolves to SP while
				// other reads (resource, etc.) fall through to undefined.
				mockExecuteFunctions.getNodeParameter.mockImplementation((name: string) =>
					name === 'authentication' ? SERVICE_PRINCIPAL_AUTH : undefined,
				);
				// SP credential carries a minted accessToken, NOT oauthTokenData.
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					accessToken: 'token',
					graphApiBaseUrl: 'https://graph.microsoft.com',
				});
			});

			it('routes the request through requestWithAuthentication (NOT requestOAuth2)', async () => {
				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/v1.0/teams');

				expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith(SERVICE_PRINCIPAL_AUTH);
				expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
					SERVICE_PRINCIPAL_AUTH,
					expect.objectContaining({
						method: 'GET',
						uri: 'https://graph.microsoft.com/v1.0/teams',
					}),
				);
				// dual-branch lock: the SP path must never reach requestOAuth2
				expect(mockRequestOAuth2).not.toHaveBeenCalled();
			});

			it('never composes a /me path under the Service Principal credential', async () => {
				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/v1.0/teams');

				const calledUri = mockRequestWithAuthentication.mock.calls[0][1].uri as string;
				expect(calledUri).not.toContain('/me');
			});

			it('honors a sovereign graphApiBaseUrl', async () => {
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					accessToken: 'token',
					graphApiBaseUrl: 'https://graph.microsoft.us',
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/v1.0/teams');

				expect(mockRequestWithAuthentication).toHaveBeenCalledWith(
					SERVICE_PRINCIPAL_AUTH,
					expect.objectContaining({
						uri: 'https://graph.microsoft.us/v1.0/teams',
					}),
				);
			});

			describe('error suppression (no raw Graph body leaks at any status)', () => {
				// The REAL error shape: `requestWithAuthentication` wraps the underlying
				// request error in a `NodeApiError`. The underlying (legacy-request) error
				// carries `statusCode` + an `error` body + a `message` of the form
				// `"<status> - <json>"`, and NodeApiError surfaces the status on `httpCode`
				// (string) and copies that raw message into `messages`. A correlation id +
				// reflected input ride the raw body — none of it may reach the surfaced
				// message at ANY status.
				const rawLeak =
					'request-id: 11111111-2222-3333-4444-555555555555; client-request-id: aaaa; token=eyJ0eParrotedSecret; resource /teams/19:injected@thread.tacv2';
				const realError = (statusCode: number, code: string) => {
					const underlying = Object.assign(
						new Error(`${statusCode} - {"error":{"code":"${code}","message":"${rawLeak}"}}`),
						{
							statusCode,
							status: statusCode,
							error: { error: { code, message: rawLeak } },
							response: { status: statusCode, statusText: code, headers: {} },
						},
					);
					return new NodeApiError(mockNode, underlying as unknown as JsonObject);
				};

				it.each([
					[
						401,
						'InvalidAuthenticationToken',
						"The Service Principal token was rejected. Check the app registration's client secret and that admin consent is granted.",
					],
					[
						402,
						'PaymentRequired',
						'This operation requires a metered Microsoft Teams API to be enabled on the tenant.',
					],
					[
						403,
						'Forbidden',
						'The app registration is missing a consented application permission for this operation. Grant the required Graph application permission and admin consent, then retry.',
					],
					[
						400,
						'BadRequest',
						"Microsoft Graph rejected the request (HTTP 400). Check the operation's inputs and the app registration's permissions.",
					],
					[
						429,
						'TooManyRequests',
						"Microsoft Graph rejected the request (HTTP 429). Check the operation's inputs and the app registration's permissions.",
					],
					[
						503,
						'ServiceUnavailable',
						"Microsoft Graph rejected the request (HTTP 503). Check the operation's inputs and the app registration's permissions.",
					],
				])(
					'maps HTTP %i to a static message and never leaks the raw body',
					async (statusCode, code, expectedMessage) => {
						mockRequestWithAuthentication.mockRejectedValue(realError(statusCode, code));

						const error = (await microsoftApiRequest
							.call(mockExecuteFunctions, 'GET', '/v1.0/teams')
							.catch((e: Error) => e)) as Error & { messages?: string[] };

						expect(error.constructor.name).toBe('NodeApiError');
						// proves the SPECIFIC 401/402/403 messages fire in production (the status
						// is read from NodeApiError.httpCode, not the absent statusCode/error.error)
						expect(error.message).toBe(expectedMessage);
						// The raw body must not leak through the surfaced message…
						expect(error.message).not.toContain('request-id');
						expect(error.message).not.toContain('token=');
						expect(error.message).not.toContain('injected');
						// …nor through the error's `messages` array…
						for (const m of error.messages ?? []) {
							expect(m).not.toContain('request-id');
							expect(m).not.toContain('token=');
							expect(m).not.toContain('injected');
						}
						// …nor anywhere in the serialized error object.
						const serialized = JSON.stringify(error);
						expect(serialized).not.toContain('request-id');
						expect(serialized).not.toContain('client-request-id');
						expect(serialized).not.toContain('token=');
						expect(serialized).not.toContain('injected');
					},
				);

				it('rewrites a 404 to the static "{Resource} not found" message', async () => {
					mockExecuteFunctions.getNodeParameter.mockImplementation((name: string) => {
						if (name === 'authentication') return SERVICE_PRINCIPAL_AUTH;
						if (name === 'resource') return 'channel';
						return undefined;
					});
					mockRequestWithAuthentication.mockRejectedValue(realError(404, 'NotFound'));

					const error = await microsoftApiRequest
						.call(mockExecuteFunctions, 'GET', '/v1.0/teams/x/channels/y')
						.catch((e: Error) => e);

					expect(error.message).toBe('Channel not found');
				});
			});
		});
	});

	describe('getTeamsCredentialType', () => {
		it('should default to microsoftTeamsOAuth2Api when authentication is undefined', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue(undefined);

			expect(getTeamsCredentialType.call(mockExecuteFunctions)).toBe('microsoftTeamsOAuth2Api');
		});

		it('should default to microsoftTeamsOAuth2Api when the fallback value 0 is returned (load-options/hook legacy node)', () => {
			// In load-options/hook contexts getNodeParameter treats the 2nd arg as the
			// FALLBACK, so a legacy node with no stored authentication returns the literal
			// `0`. The allow-list must map it to Teams (a `?? default` would keep `0`).
			mockExecuteFunctions.getNodeParameter.mockReturnValue(0);

			expect(getTeamsCredentialType.call(mockExecuteFunctions)).toBe('microsoftTeamsOAuth2Api');
		});

		it('should return microsoftTeamsOAuth2Api when selected', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftTeamsOAuth2Api');

			expect(getTeamsCredentialType.call(mockExecuteFunctions)).toBe('microsoftTeamsOAuth2Api');
		});

		it('should return microsoftOAuth2Api when the generic credential is selected', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');

			expect(getTeamsCredentialType.call(mockExecuteFunctions)).toBe('microsoftOAuth2Api');
		});

		it('should return the Service Principal credential when selected', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue(SERVICE_PRINCIPAL_AUTH);

			expect(getTeamsCredentialType.call(mockExecuteFunctions)).toBe(SERVICE_PRINCIPAL_AUTH);
		});
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

	describe('validateTeamsId', () => {
		it('accepts a GUID and a Planner-style id', () => {
			expect(() => validateTeamsId('1111-2222-3333-4444-555566667777', mockNode)).not.toThrow();
			expect(() => validateTeamsId('rl1HYb0cUEiHPc7zgB_KWWUAA7Of', mockNode)).not.toThrow();
		});

		it('accepts a real colon-bearing channel id (`:` and `@` are allowed)', () => {
			expect(() => validateTeamsId('19:abc@thread.tacv2', mockNode)).not.toThrow();
		});

		it.each(['', '   '])('rejects empty / whitespace-only ids', (id) => {
			expect(() => validateTeamsId(id, mockNode)).toThrow();
		});

		it.each(['.', '..', '...'])('rejects dots-only ids', (id) => {
			expect(() => validateTeamsId(id, mockNode)).toThrow();
		});

		it.each(['a/b', 'a\\b', 'a?b', 'a#b', 'x/../../groups/abc', 'abc?$expand=foo'])(
			'rejects path-escape / query-injection ids (%s)',
			(id) => {
				expect(() => validateTeamsId(id, mockNode)).toThrow();
			},
		);

		it('throws a static message that never echoes the rejected id', () => {
			const error = (() => {
				try {
					validateTeamsId('x/../../groups/secretInjected', mockNode);
					return undefined;
				} catch (e) {
					return e as Error;
				}
			})();

			expect(error).toBeDefined();
			expect(error?.message).not.toContain('secretInjected');
			expect(error?.message).not.toContain('groups');
			expect(error?.message).not.toContain('..');
		});
	});

	describe('buildTeamsPath', () => {
		it('passes ids verbatim under OAuth2 (no validate, no encode)', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftTeamsOAuth2Api');

			const path = buildTeamsPath.call(mockExecuteFunctions, [
				'/v1.0/teams/',
				{ id: '19:abc@thread.tacv2' },
				'/channels',
			]);

			expect(path).toBe('/v1.0/teams/19:abc@thread.tacv2/channels');
		});

		it('validates and interpolates each id RAW under the Service Principal credential', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue(SERVICE_PRINCIPAL_AUTH);

			const path = buildTeamsPath.call(mockExecuteFunctions, [
				'/v1.0/planner/plans/',
				{ id: 'plan_id-123' },
				'/tasks',
			]);

			expect(path).toBe('/v1.0/planner/plans/plan_id-123/tasks');
		});

		it('passes a colon/at-bearing id RAW under SP (same shape as OAuth2, not encoded)', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue(SERVICE_PRINCIPAL_AUTH);

			const path = buildTeamsPath.call(mockExecuteFunctions, [
				'/v1.0/teams/',
				{ id: '1111-2222' },
				'/channels/',
				{ id: '19:abc@thread.tacv2' },
			]);

			expect(path).toBe('/v1.0/teams/1111-2222/channels/19:abc@thread.tacv2');
			// proven raw Graph shape — never percent-encoded
			expect(path).not.toContain('%3A');
			expect(path).not.toContain('%40');
		});

		// A node expression like `={{ 123 }}` resolves to a non-string at runtime; the
		// call sites' `as string` is compile-time only. The SP path must coerce before
		// `.trim()` or it throws a raw `TypeError` (regression guard).
		it('coerces a non-string id under SP without throwing', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue(SERVICE_PRINCIPAL_AUTH);

			const path = buildTeamsPath.call(mockExecuteFunctions, [
				'/v1.0/planner/tasks/',
				{ id: 123 as unknown as string },
			]);

			expect(path).toBe('/v1.0/planner/tasks/123');
		});

		it('stringifies a non-string id under OAuth2 (join coercion, no throw)', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftTeamsOAuth2Api');

			const path = buildTeamsPath.call(mockExecuteFunctions, [
				'/v1.0/planner/tasks/',
				{ id: 123 as unknown as string },
			]);

			expect(path).toBe('/v1.0/planner/tasks/123');
		});

		it.each(['x/../../groups/abc', 'abc?$expand=foo', 'a\\b', 'a#frag'])(
			'throws on a crafted separator/injection id (%s) under the Service Principal credential',
			(craftedId) => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue(SERVICE_PRINCIPAL_AUTH);

				expect(() =>
					buildTeamsPath.call(mockExecuteFunctions, [
						'/v1.0/teams/',
						{ id: craftedId },
						'/channels',
					]),
				).toThrow();
			},
		);
	});

	describe('OAuth2 back-compat lock (byte-for-byte unchanged)', () => {
		it('composes the legacy raw uri for a colon-bearing channelId', async () => {
			// Default OAuth2 selected. A realistic colon-bearing channel id flows through
			// buildTeamsPath verbatim — no throw, no encoding — proving OAuth2 URL shapes
			// are unchanged. SP composes the SAME raw shape for this valid id (see the
			// buildTeamsPath SP test); the two paths differ only in that SP rejects the
			// separator/query-injection vectors.
			mockExecuteFunctions.getNodeParameter.mockReturnValue(undefined);
			mockRequestOAuth2.mockResolvedValue({ data: 'test' });
			mockExecuteFunctions.getCredentials.mockResolvedValue({ graphApiBaseUrl: '' });

			const resource = buildTeamsPath.call(mockExecuteFunctions, [
				'/v1.0/teams/',
				{ id: '1111-2222' },
				'/channels/',
				{ id: '19:abc@thread.tacv2' },
			]);
			await microsoftApiRequest.call(mockExecuteFunctions, 'GET', resource);

			expect(mockRequestOAuth2).toHaveBeenCalledWith(
				'microsoftTeamsOAuth2Api',
				expect.objectContaining({
					uri: 'https://graph.microsoft.com/v1.0/teams/1111-2222/channels/19:abc@thread.tacv2',
				}),
			);
			expect(mockRequestWithAuthentication).not.toHaveBeenCalled();
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

		// MAJOR B hard gate: every SP-reachable listSearch method that interpolates an id
		// must reject a crafted traversal id via buildTeamsPath, before any request.
		describe('SP id-injection gate (enumerated)', () => {
			const craftedId = 'x/../../groups/abc';

			beforeEach(() => {
				mockLoadOptions.getNodeParameter.mockReturnValue(SERVICE_PRINCIPAL_AUTH);
				mockLoadOptions.getCredentials.mockResolvedValue({
					accessToken: 'token',
					graphApiBaseUrl: '',
				});
			});

			it('getChannels rejects a crafted teamId', async () => {
				mockLoadOptions.getCurrentNodeParameter.mockReturnValue(craftedId);

				await expect(getChannels.call(mockLoadOptions)).rejects.toThrow('The ID is not valid');
				expect(loadOptionsRequestWithAuthentication).not.toHaveBeenCalled();
			});

			it('getPlans rejects a crafted groupId', async () => {
				mockLoadOptions.getCurrentNodeParameter.mockReturnValue(craftedId);

				await expect(getPlans.call(mockLoadOptions)).rejects.toThrow('The ID is not valid');
				expect(loadOptionsRequestWithAuthentication).not.toHaveBeenCalled();
			});

			it('getBuckets rejects a crafted (unvalidated) planId', async () => {
				mockLoadOptions.getCurrentNodeParameter.mockReturnValue(craftedId);

				await expect(getBuckets.call(mockLoadOptions)).rejects.toThrow('The ID is not valid');
				expect(loadOptionsRequestWithAuthentication).not.toHaveBeenCalled();
			});

			it('getMembers rejects a crafted groupId', async () => {
				mockLoadOptions.getCurrentNodeParameter.mockReturnValue(craftedId);

				await expect(getMembers.call(mockLoadOptions)).rejects.toThrow('The ID is not valid');
				expect(loadOptionsRequestWithAuthentication).not.toHaveBeenCalled();
			});
		});
	});

	describe('microsoftApiRequest under a webhook hook (IHookFunctions) context', () => {
		let mockHookFunctions: Mocked<IHookFunctions>;
		let hookRequestOAuth2: Mock;
		let hookRequestWithAuthentication: Mock;

		beforeEach(() => {
			mockHookFunctions = mockDeep<IHookFunctions>();
			hookRequestOAuth2 = vi.fn().mockResolvedValue({ value: [] });
			hookRequestWithAuthentication = vi.fn().mockResolvedValue({ value: [] });
			mockHookFunctions.helpers.requestOAuth2 = hookRequestOAuth2;
			mockHookFunctions.helpers.requestWithAuthentication = hookRequestWithAuthentication;
			mockHookFunctions.getCredentials.mockResolvedValue({ graphApiBaseUrl: '' });
			mockHookFunctions.getNode.mockReturnValue(mockNode);
		});

		it('should resolve the generic credential when selected', async () => {
			mockHookFunctions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');

			await microsoftApiRequest.call(mockHookFunctions, 'GET', '/v1.0/subscriptions');

			expect(mockHookFunctions.getCredentials).toHaveBeenCalledWith('microsoftOAuth2Api');
			expect(hookRequestOAuth2).toHaveBeenCalledWith('microsoftOAuth2Api', expect.anything());
			expect(hookRequestWithAuthentication).not.toHaveBeenCalled();
		});

		it('should default to the Teams credential', async () => {
			mockHookFunctions.getNodeParameter.mockReturnValue(undefined);

			await microsoftApiRequest.call(mockHookFunctions, 'GET', '/v1.0/subscriptions');

			expect(mockHookFunctions.getCredentials).toHaveBeenCalledWith('microsoftTeamsOAuth2Api');
			expect(hookRequestOAuth2).toHaveBeenCalledWith('microsoftTeamsOAuth2Api', expect.anything());
			expect(hookRequestWithAuthentication).not.toHaveBeenCalled();
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
