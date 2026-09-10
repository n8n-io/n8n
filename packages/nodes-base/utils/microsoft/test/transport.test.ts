import type { IExecuteFunctions, IHookFunctions, INode, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import {
	buildMicrosoftGraphPath,
	createMicrosoftGraphTransport,
	SERVICE_PRINCIPAL_AUTH,
	validateMicrosoftGraphId,
} from '../transport';

const { getCredentialType, microsoftApiRequest, microsoftApiRequestAllItems } =
	createMicrosoftGraphTransport({ defaultCredentialType: 'microsoftTeamsOAuth2Api' });

describe('Microsoft Graph transport kernel', () => {
	let mockExecuteFunctions: Mocked<IExecuteFunctions>;
	let mockNode: INode;
	let mockRequestOAuth2: Mock;
	let mockRequestWithAuthentication: Mock;

	beforeEach(() => {
		vi.clearAllMocks();
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
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe('microsoftApiRequest', () => {
		describe('graphApiBaseUrl from credentials', () => {
			it.each([
				[
					'falls back to the default when graphApiBaseUrl is empty',
					{ graphApiBaseUrl: '' },
					'https://graph.microsoft.com/teams',
				],
				[
					'falls back to the default when graphApiBaseUrl is undefined',
					{},
					'https://graph.microsoft.com/teams',
				],
				[
					'strips a trailing slash from the base URL',
					{ graphApiBaseUrl: 'https://graph.microsoft.com/' },
					'https://graph.microsoft.com/teams',
				],
				[
					'strips multiple trailing slashes from the base URL',
					{ graphApiBaseUrl: 'https://graph.microsoft.com///' },
					'https://graph.microsoft.com/teams',
				],
				[
					'uses the US Government cloud endpoint from credentials',
					{ graphApiBaseUrl: 'https://graph.microsoft.us' },
					'https://graph.microsoft.us/teams',
				],
				[
					'uses the US Government DOD cloud endpoint from credentials',
					{ graphApiBaseUrl: 'https://dod-graph.microsoft.us' },
					'https://dod-graph.microsoft.us/teams',
				],
				[
					'uses the China cloud endpoint from credentials',
					{ graphApiBaseUrl: 'https://microsoftgraph.chinacloudapi.cn' },
					'https://microsoftgraph.chinacloudapi.cn/teams',
				],
			])('%s', async (_name, baseUrlCredential, expectedUri) => {
				mockRequestOAuth2.mockResolvedValue({ data: 'test' });
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					oauthTokenData: { access_token: 'test-access-token' },
					...baseUrlCredential,
				});

				await microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/teams');

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.objectContaining({
						method: 'GET',
						uri: expectedUri,
						json: true,
					}),
				);
			});
		});

		describe('custom headers', () => {
			it('merges custom headers over the defaults', async () => {
				mockRequestOAuth2.mockResolvedValue({ data: 'test' });
				mockExecuteFunctions.getCredentials.mockResolvedValue({ graphApiBaseUrl: '' });

				await microsoftApiRequest.call(
					mockExecuteFunctions,
					'POST',
					'/teams',
					{ displayName: 'x' },
					{},
					undefined,
					{ 'If-Match': 'etag' },
				);

				expect(mockRequestOAuth2).toHaveBeenCalledWith(
					'microsoftTeamsOAuth2Api',
					expect.objectContaining({
						headers: { 'Content-Type': 'application/json', 'If-Match': 'etag' },
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

				it('maps a status-less failure (network error) to the static unknown-status message', async () => {
					mockRequestWithAuthentication.mockRejectedValue(
						new Error('connect ECONNREFUSED 127.0.0.1:443'),
					);

					const error = (await microsoftApiRequest
						.call(mockExecuteFunctions, 'GET', '/v1.0/teams')
						.catch((e: Error) => e)) as Error;

					expect(error.constructor.name).toBe('NodeApiError');
					expect(error.message).toBe(
						"Microsoft Graph rejected the request (HTTP unknown). Check the operation's inputs and the app registration's permissions.",
					);
					// the underlying failure detail must not ride along
					expect(JSON.stringify(error)).not.toContain('ECONNREFUSED');
				});
			});
		});

		describe('delegated OAuth2 error mapping', () => {
			const delegatedError = (statusCode: number, code: string, message: string) =>
				Object.assign(new Error(`${statusCode} - {"error":{"code":"${code}"}}`), {
					statusCode,
					error: { error: { code, message } },
				});

			beforeEach(() => {
				mockExecuteFunctions.getCredentials.mockResolvedValue({ graphApiBaseUrl: '' });
			});

			it('rewrites a 404 NotFound to the static "{Resource} not found" message', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((name: string) =>
					name === 'resource' ? 'channel' : undefined,
				);
				mockRequestOAuth2.mockRejectedValue(delegatedError(404, 'NotFound', 'Resource not found'));

				const error = await microsoftApiRequest
					.call(mockExecuteFunctions, 'GET', '/v1.0/teams/x/channels/y')
					.catch((e: Error) => e);

				expect(error.constructor.name).toBe('NodeApiError');
				expect(error.message).toBe('Channel not found');
			});

			it('passes the Graph error message through for other delegated errors', async () => {
				mockRequestOAuth2.mockRejectedValue(
					delegatedError(400, 'BadRequest', 'Invalid filter clause'),
				);

				const error = await microsoftApiRequest
					.call(mockExecuteFunctions, 'GET', '/v1.0/teams')
					.catch((e: Error) => e);

				expect(error.constructor.name).toBe('NodeApiError');
				expect(error.message).toBe('Invalid filter clause');
			});

			it('keeps the raw NotFound message when `resource` is unavailable (trigger hook context)', async () => {
				const mockHookFunctions: Mocked<IHookFunctions> = mockDeep<IHookFunctions>();
				const hookRequestOAuth2 = vi
					.fn()
					.mockRejectedValue(delegatedError(404, 'NotFound', 'Resource not found'));
				mockHookFunctions.helpers.requestOAuth2 = hookRequestOAuth2;
				mockHookFunctions.getCredentials.mockResolvedValue({ graphApiBaseUrl: '' });
				mockHookFunctions.getNode.mockReturnValue(mockNode);
				// Hook contexts treat the 2nd getNodeParameter arg as the FALLBACK, so both
				// `authentication` and `resource` resolve to the literal `0` on legacy nodes.
				mockHookFunctions.getNodeParameter.mockReturnValue(0);

				const error = await microsoftApiRequest
					.call(mockHookFunctions, 'GET', '/v1.0/subscriptions')
					.catch((e: Error) => e);

				// never "0 not found": without a usable resource name the Graph message stands
				expect(error.message).toBe('Resource not found');
			});
		});
	});

	describe('getCredentialType', () => {
		it('should default to microsoftTeamsOAuth2Api when authentication is undefined', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue(undefined);

			expect(getCredentialType.call(mockExecuteFunctions)).toBe('microsoftTeamsOAuth2Api');
		});

		it('should default to microsoftTeamsOAuth2Api when the fallback value 0 is returned (load-options/hook legacy node)', () => {
			// In load-options/hook contexts getNodeParameter treats the 2nd arg as the
			// FALLBACK, so a legacy node with no stored authentication returns the literal
			// `0`. The allow-list must map it to Teams (a `?? default` would keep `0`).
			mockExecuteFunctions.getNodeParameter.mockReturnValue(0);

			expect(getCredentialType.call(mockExecuteFunctions)).toBe('microsoftTeamsOAuth2Api');
		});

		it('should return microsoftTeamsOAuth2Api when selected', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftTeamsOAuth2Api');

			expect(getCredentialType.call(mockExecuteFunctions)).toBe('microsoftTeamsOAuth2Api');
		});

		it('should return microsoftOAuth2Api when the generic credential is selected', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftOAuth2Api');

			expect(getCredentialType.call(mockExecuteFunctions)).toBe('microsoftOAuth2Api');
		});

		it('should return the Service Principal credential when selected', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue(SERVICE_PRINCIPAL_AUTH);

			expect(getCredentialType.call(mockExecuteFunctions)).toBe(SERVICE_PRINCIPAL_AUTH);
		});
	});

	describe('validateMicrosoftGraphId', () => {
		it('accepts a GUID and a Planner-style id', () => {
			expect(() =>
				validateMicrosoftGraphId('1111-2222-3333-4444-555566667777', mockNode),
			).not.toThrow();
			expect(() =>
				validateMicrosoftGraphId('rl1HYb0cUEiHPc7zgB_KWWUAA7Of', mockNode),
			).not.toThrow();
		});

		it('accepts a real colon-bearing channel id (`:` and `@` are allowed)', () => {
			expect(() => validateMicrosoftGraphId('19:abc@thread.tacv2', mockNode)).not.toThrow();
		});

		it('accepts a URL-copied percent-encoded channel id and returns the decoded form', () => {
			// Teams URLs only ever expose the threadId percent-encoded.
			expect(
				validateMicrosoftGraphId('19%3A16259efabba44a66916d91dd91862a6f%40thread.tacv2', mockNode),
			).toBe('19:16259efabba44a66916d91dd91862a6f@thread.tacv2');
		});

		it('leaves an already-decoded id unchanged', () => {
			expect(validateMicrosoftGraphId('19:abc@thread.tacv2', mockNode)).toBe('19:abc@thread.tacv2');
		});

		it.each(['', '   '])('rejects empty / whitespace-only ids', (id) => {
			expect(() => validateMicrosoftGraphId(id, mockNode)).toThrow();
		});

		it.each(['.', '..', '...'])('rejects dots-only ids', (id) => {
			expect(() => validateMicrosoftGraphId(id, mockNode)).toThrow();
		});

		it.each([
			'a/b',
			'a\\b',
			'a?b',
			'a#b',
			// malformed percent-encoding rejects in the decode step
			'a%b',
			// decodes to `../..` and is caught by the separator class
			'..%2F..',
			// double-encoded separator decodes to `..%2F..` and is caught by the residual `%`
			'..%252F..',
			'x/../../groups/abc',
			'abc?$expand=foo',
		])('rejects ids containing separators or query characters, raw or encoded (%s)', (id) => {
			expect(() => validateMicrosoftGraphId(id, mockNode)).toThrow();
		});

		it('throws a static message that never echoes the rejected id', () => {
			const error = (() => {
				try {
					validateMicrosoftGraphId('x/../../groups/secretInjected', mockNode);
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

	describe('buildMicrosoftGraphPath', () => {
		it('validates and interpolates a valid id RAW under OAuth2 (no encoding)', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftTeamsOAuth2Api');

			const path = buildMicrosoftGraphPath.call(mockExecuteFunctions, [
				'/v1.0/teams/',
				{ id: '19:abc@thread.tacv2' },
				'/channels',
			]);

			expect(path).toBe('/v1.0/teams/19:abc@thread.tacv2/channels');
		});

		it('validates and interpolates each id RAW under the Service Principal credential', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue(SERVICE_PRINCIPAL_AUTH);

			const path = buildMicrosoftGraphPath.call(mockExecuteFunctions, [
				'/v1.0/planner/plans/',
				{ id: 'plan_id-123' },
				'/tasks',
			]);

			expect(path).toBe('/v1.0/planner/plans/plan_id-123/tasks');
		});

		it('passes a colon/at-bearing id RAW under SP (same shape as OAuth2, not encoded)', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue(SERVICE_PRINCIPAL_AUTH);

			const path = buildMicrosoftGraphPath.call(mockExecuteFunctions, [
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

		it('interpolates a URL-copied percent-encoded id in its decoded form', () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('microsoftTeamsOAuth2Api');

			const path = buildMicrosoftGraphPath.call(mockExecuteFunctions, [
				'/v1.0/teams/',
				{ id: '1111-2222' },
				'/channels/',
				{ id: '19%3Aabc%40thread.tacv2' },
			]);

			expect(path).toBe('/v1.0/teams/1111-2222/channels/19:abc@thread.tacv2');
		});

		// A node expression like `={{ 123 }}` resolves to a non-string at runtime; the
		// call sites' `as string` is compile-time only — ids must be coerced before
		// trimming or the build throws a raw `TypeError` (regression guard).
		it.each(['microsoftTeamsOAuth2Api', SERVICE_PRINCIPAL_AUTH])(
			'coerces a non-string id under %s without throwing',
			(credential) => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue(credential);

				const path = buildMicrosoftGraphPath.call(mockExecuteFunctions, [
					'/v1.0/planner/tasks/',
					{ id: 123 as unknown as string },
				]);

				expect(path).toBe('/v1.0/planner/tasks/123');
			},
		);

		it.each(['microsoftTeamsOAuth2Api', SERVICE_PRINCIPAL_AUTH])(
			'trims surrounding whitespace from a valid id under %s',
			(credential) => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue(credential);

				const path = buildMicrosoftGraphPath.call(mockExecuteFunctions, [
					'/v1.0/teams/',
					{ id: '  19:abc@thread.tacv2  ' },
					'/channels',
				]);

				expect(path).toBe('/v1.0/teams/19:abc@thread.tacv2/channels');
			},
		);

		const malformedIds = ['x/../../groups/abc', 'abc?$expand=foo', 'a\\b', 'a#frag'];
		it.each(
			['microsoftTeamsOAuth2Api', SERVICE_PRINCIPAL_AUTH].flatMap((credential) =>
				malformedIds.map((id) => [credential, id]),
			),
		)('rejects an id containing separators under %s (%s)', (credential, malformedId) => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue(credential);

			expect(() =>
				buildMicrosoftGraphPath.call(mockExecuteFunctions, [
					'/v1.0/teams/',
					{ id: malformedId },
					'/channels',
				]),
			).toThrow('The ID is not valid');
		});

		it.each(['microsoftTeamsOAuth2Api', SERVICE_PRINCIPAL_AUTH])(
			'rejects an empty id under %s',
			(credential) => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue(credential);

				expect(() =>
					buildMicrosoftGraphPath.call(mockExecuteFunctions, [
						'/v1.0/teams/',
						{ id: '' },
						'/channels',
					]),
				).toThrow('A required ID is empty');
			},
		);
	});

	describe('OAuth2 back-compat lock (valid ids byte-for-byte unchanged)', () => {
		it('composes the legacy raw uri for a colon-bearing channelId', async () => {
			// Default OAuth2 selected. A realistic colon-bearing channel id flows through
			// buildMicrosoftGraphPath unmodified — validated but never encoded — proving OAuth2
			// URL shapes for valid ids are unchanged. SP composes the SAME raw shape for
			// this valid id (see the buildMicrosoftGraphPath SP test).
			mockExecuteFunctions.getNodeParameter.mockReturnValue(undefined);
			mockRequestOAuth2.mockResolvedValue({ data: 'test' });
			mockExecuteFunctions.getCredentials.mockResolvedValue({ graphApiBaseUrl: '' });

			const resource = buildMicrosoftGraphPath.call(mockExecuteFunctions, [
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

	describe('microsoftApiRequestAllItems', () => {
		const makeContext = (requestOAuth2: ReturnType<typeof vi.fn>) =>
			({
				getNodeParameter: vi.fn().mockReturnValue(undefined),
				getCredentials: vi.fn().mockResolvedValue({}),
				getNode: vi.fn().mockReturnValue({ name: 'Microsoft Teams' } as INode),
				helpers: { requestOAuth2 },
			}) as unknown as IExecuteFunctions;

		const optionsOfCall = (requestOAuth2: ReturnType<typeof vi.fn>, index: number) =>
			requestOAuth2.mock.calls[index][1] as { qs: Record<string, unknown>; uri?: string };

		it('forwards the query and stops before the next page once the limit is satisfied', async () => {
			const requestOAuth2 = vi.fn().mockResolvedValue({
				value: [{ id: '1' }, { id: '2' }, { id: '3' }],
				'@odata.nextLink': 'https://graph.microsoft.com/next-page',
			});
			const ctx = makeContext(requestOAuth2);

			const result = await microsoftApiRequestAllItems.call(
				ctx,
				'value',
				'GET',
				'/beta/teams/1/channels/2/messages',
				{},
				{ $top: 2 },
				2,
			);

			expect(result).toEqual([{ id: '1' }, { id: '2' }]);
			expect(requestOAuth2).toHaveBeenCalledTimes(1);
			expect(optionsOfCall(requestOAuth2, 0).qs).toEqual({ $top: 2 });
		});

		it('paginates until the limit is reached without re-sending the query', async () => {
			const page = (n: number) => Array.from({ length: n }, (_, i) => ({ id: String(i) }));
			const requestOAuth2 = vi
				.fn()
				.mockResolvedValueOnce({
					value: page(50),
					'@odata.nextLink': 'https://graph.microsoft.com/next-page',
				})
				.mockResolvedValueOnce({ value: page(50) });
			const ctx = makeContext(requestOAuth2);

			const result = await microsoftApiRequestAllItems.call(
				ctx,
				'value',
				'GET',
				'/beta/teams/1/channels/2/messages',
				{},
				{ $top: 100 },
				100,
			);

			expect(result).toHaveLength(100);
			expect(requestOAuth2).toHaveBeenCalledTimes(2);
			expect(optionsOfCall(requestOAuth2, 0).qs).toEqual({ $top: 100 });
			expect(optionsOfCall(requestOAuth2, 1).qs).toEqual({});
			expect(optionsOfCall(requestOAuth2, 1).uri).toBe('https://graph.microsoft.com/next-page');
		});

		it('walks every page when no limit is set', async () => {
			const requestOAuth2 = vi
				.fn()
				.mockResolvedValueOnce({
					value: [{ id: '1' }],
					'@odata.nextLink': 'https://graph.microsoft.com/next-page',
				})
				.mockResolvedValueOnce({ value: [{ id: '2' }] });
			const ctx = makeContext(requestOAuth2);

			const result = await microsoftApiRequestAllItems.call(
				ctx,
				'value',
				'GET',
				'/v1.0/teams/1/channels',
			);

			expect(result).toEqual([{ id: '1' }, { id: '2' }]);
			expect(requestOAuth2).toHaveBeenCalledTimes(2);
			expect(optionsOfCall(requestOAuth2, 0).qs).toEqual({});
		});

		it('refuses to follow a cross-origin @odata.nextLink', async () => {
			const requestOAuth2 = vi.fn().mockResolvedValue({
				value: [{ id: '1' }],
				'@odata.nextLink': 'https://elsewhere.example.com/next-page',
			});
			const ctx = makeContext(requestOAuth2);

			await expect(
				microsoftApiRequestAllItems.call(ctx, 'value', 'GET', '/v1.0/teams/1/channels'),
			).rejects.toThrow('Refusing to send credentials to an unexpected host');
			// the off-host link is never requested
			expect(requestOAuth2).toHaveBeenCalledTimes(1);
		});

		it('refuses to follow an unparseable @odata.nextLink', async () => {
			const requestOAuth2 = vi.fn().mockResolvedValue({
				value: [{ id: '1' }],
				'@odata.nextLink': 'not-a-url',
			});
			const ctx = makeContext(requestOAuth2);

			// A node error, not the bare TypeError `new URL` would throw.
			await expect(
				microsoftApiRequestAllItems.call(ctx, 'value', 'GET', '/v1.0/teams/1/channels'),
			).rejects.toThrow('Refusing to send credentials to an unexpected host');
			expect(requestOAuth2).toHaveBeenCalledTimes(1);
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

	describe('createMicrosoftGraphTransport', () => {
		it('honors a non-Teams defaultCredentialType for fallback resolution and requests', async () => {
			// SharePoint v2's delegated back-compat default IS the generic Graph credential.
			const sharePoint = createMicrosoftGraphTransport({
				defaultCredentialType: 'microsoftOAuth2Api',
			});
			mockExecuteFunctions.getNodeParameter.mockReturnValue(undefined);
			mockRequestOAuth2.mockResolvedValue({ data: 'test' });
			mockExecuteFunctions.getCredentials.mockResolvedValue({ graphApiBaseUrl: '' });

			expect(sharePoint.getCredentialType.call(mockExecuteFunctions)).toBe('microsoftOAuth2Api');

			await sharePoint.microsoftApiRequest.call(mockExecuteFunctions, 'GET', '/v1.0/sites');

			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('microsoftOAuth2Api');
			expect(mockRequestOAuth2).toHaveBeenCalledWith('microsoftOAuth2Api', expect.anything());

			// Instance isolation: the module-scope Teams-bound instance must be unaffected
			// by creating a second transport; config must not leak into shared module state.
			// getNodeParameter is still mocked to undefined here, so this exercises the
			// Teams instance's fallback.
			expect(getCredentialType.call(mockExecuteFunctions)).toBe('microsoftTeamsOAuth2Api');
		});

		it('rejects the Service Principal credential as the default', () => {
			expect(() =>
				createMicrosoftGraphTransport({ defaultCredentialType: SERVICE_PRINCIPAL_AUTH }),
			).toThrow('must be a delegated OAuth2 credential');
		});
	});
});
