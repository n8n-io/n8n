import { type DeepMockProxy, mockDeep } from 'vitest-mock-extended';
import type { IDataObject, IExecuteFunctions, INodeParameterResourceLocator } from 'n8n-workflow';

import {
	handlePagination,
	jiraSoftwareCloudApiRequestAllItems,
	type JiraSoftwareCloudApiRequest,
} from '../GenericFunctions';

describe('Jira -> GenericFunctions', () => {
	describe('jiraSoftwareCloudApiRequestAllItems', () => {
		let mockExecuteFunctions: DeepMockProxy<IExecuteFunctions>;

		beforeEach(() => {
			mockExecuteFunctions = mockDeep<IExecuteFunctions>();
			mockExecuteFunctions.getNodeParameter.mockReturnValue('server');
			mockExecuteFunctions.getCredentials.mockResolvedValue({ domain: 'jira.domain.com' });
			mockExecuteFunctions.helpers.requestWithAuthentication.mockImplementation(
				async function (_, options) {
					if (!options.qs?.startAt) {
						return {
							issues: [{ id: 1000 }, { id: 1001 }],
							startAt: 0,
							maxResults: 2,
							total: 3,
						};
					}

					return {
						issues: [{ id: 1002 }],
						startAt: 2,
						maxResults: 2,
						total: 3,
					};
				},
			);
		});

		afterEach(() => {
			vi.clearAllMocks();
		});

		it('should get all items and not pass the body when the method is GET', async () => {
			const result = await jiraSoftwareCloudApiRequestAllItems.call(
				mockExecuteFunctions,
				'issues',
				'/api/2/search',
				'GET',
			);

			expect(result).toEqual([{ id: 1000 }, { id: 1001 }, { id: 1002 }]);
			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toBeCalledTimes(2);
			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'jiraSoftwareServerApi',
				expect.not.objectContaining({
					body: expect.anything(),
				}),
			);
		});
	});

	describe('jiraSoftwareCloudApiRequest credential routing', () => {
		let mockExecuteFunctions: DeepMockProxy<IExecuteFunctions>;
		let jiraSoftwareCloudApiRequest: JiraSoftwareCloudApiRequest;

		beforeEach(async () => {
			vi.resetModules();
			({ jiraSoftwareCloudApiRequest } = await import('../GenericFunctions'));
			mockExecuteFunctions = mockDeep<IExecuteFunctions>();
			mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValue({});
			mockExecuteFunctions.getNode.mockReturnValue({ name: 'Jira' } as ReturnType<
				IExecuteFunctions['getNode']
			>);
		});

		afterEach(() => {
			vi.clearAllMocks();
		});

		it('should use jiraSoftwareCloudApi credential for jiraVersion "cloud"', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('cloud');
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				domain: 'https://example.atlassian.net',
			});

			await jiraSoftwareCloudApiRequest.call(mockExecuteFunctions, '/api/2/myself', 'GET');

			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('jiraSoftwareCloudApi');
			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'jiraSoftwareCloudApi',
				expect.objectContaining({ uri: 'https://example.atlassian.net/rest/api/2/myself' }),
			);
		});

		it('should remove trailing slashes from the domain before making the request', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('cloud');
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				domain: 'https://example.atlassian.net///',
			});

			await jiraSoftwareCloudApiRequest.call(mockExecuteFunctions, '/api/2/myself', 'GET');

			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'jiraSoftwareCloudApi',
				expect.objectContaining({ uri: 'https://example.atlassian.net/rest/api/2/myself' }),
			);
		});

		it('should use jiraSoftwareCloudOAuth2Api credential for jiraVersion "cloudOAuth2" and look up cloudId', async () => {
			const cloudId = 'abc123-cloud-id';
			mockExecuteFunctions.getNodeParameter.mockReturnValue('cloudOAuth2');
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				domain: 'https://example.atlassian.net',
			});
			// cloudId lookup uses httpRequestWithAuthentication; the API request uses the legacy helper
			mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValueOnce([
				{ id: cloudId, url: 'https://example.atlassian.net' },
			]);
			mockExecuteFunctions.helpers.requestWithAuthentication.mockResolvedValueOnce({});

			await jiraSoftwareCloudApiRequest.call(mockExecuteFunctions, '/api/2/myself', 'GET');

			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith(
				'jiraSoftwareCloudOAuth2Api',
			);
			expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'jiraSoftwareCloudOAuth2Api',
				expect.objectContaining({
					url: 'https://api.atlassian.com/oauth/token/accessible-resources',
				}),
			);
			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'jiraSoftwareCloudOAuth2Api',
				expect.objectContaining({
					uri: `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/2/myself`,
				}),
			);
		});

		describe('jiraVersion "cloudServiceAccount"', () => {
			const cloudId = 'def456-cloud-id';
			const accessibleResources = [{ id: cloudId, url: 'https://example.atlassian.net' }];

			const mockParameters = (site: INodeParameterResourceLocator) => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((parameterName: string) =>
					parameterName === 'site' ? site : 'cloudServiceAccount',
				);
			};

			it('should call the gateway with the cloudId chosen from the Site list', async () => {
				mockParameters({ __rl: true, mode: 'list', value: cloudId });

				await jiraSoftwareCloudApiRequest.call(mockExecuteFunctions, '/api/2/myself', 'GET');

				expect(mockExecuteFunctions.getCredentials).not.toHaveBeenCalled();
				expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).not.toHaveBeenCalled();
				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
					'atlassianServiceAccountApi',
					expect.objectContaining({
						uri: `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/2/myself`,
					}),
				);
			});

			it('should resolve a Site URL against the accessible resources', async () => {
				mockParameters({ __rl: true, mode: 'url', value: 'https://EXAMPLE.atlassian.net/' });
				mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValueOnce(
					accessibleResources,
				);

				await jiraSoftwareCloudApiRequest.call(mockExecuteFunctions, '/api/2/myself', 'GET');

				expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
					'atlassianServiceAccountApi',
					expect.objectContaining({
						url: 'https://api.atlassian.com/oauth/token/accessible-resources',
					}),
				);
				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
					'atlassianServiceAccountApi',
					expect.objectContaining({
						uri: `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/2/myself`,
					}),
				);
			});

			it('should auto-resolve an empty Site when the account reaches exactly one site', async () => {
				mockParameters({ __rl: true, mode: 'list', value: '' });
				mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValueOnce(
					accessibleResources,
				);

				await jiraSoftwareCloudApiRequest.call(mockExecuteFunctions, '/api/2/myself', 'GET');

				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
					'atlassianServiceAccountApi',
					expect.objectContaining({
						uri: `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/2/myself`,
					}),
				);
			});

			it('should auto-resolve when the node carries no Site parameter at all', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((parameterName: string) =>
					parameterName === 'site' ? null : 'cloudServiceAccount',
				);
				mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValueOnce(
					accessibleResources,
				);

				await jiraSoftwareCloudApiRequest.call(mockExecuteFunctions, '/api/2/myself', 'GET');

				expect(mockExecuteFunctions.getNodeParameter).toHaveBeenCalledWith('site', 0, null);
				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
					'atlassianServiceAccountApi',
					expect.objectContaining({
						uri: `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/2/myself`,
					}),
				);
			});

			it('should ask for a Site when the account reaches several sites and none is chosen', async () => {
				mockParameters({ __rl: true, mode: 'list', value: '' });
				mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue([
					...accessibleResources,
					{ id: 'other-cloud-id', url: 'https://other.atlassian.net' },
				]);

				await expect(
					jiraSoftwareCloudApiRequest.call(mockExecuteFunctions, '/api/2/myself', 'GET'),
				).rejects.toThrow("pick a site in the 'Site' parameter");
				expect(mockExecuteFunctions.helpers.requestWithAuthentication).not.toHaveBeenCalled();
			});
		});

		describe('expired-token retry (ENT-408)', () => {
			const cloudId = 'abc123-cloud-id';
			const accessibleResources = [{ id: cloudId, url: 'https://example.atlassian.net' }];

			it('retries once after forcing a token refresh when the gateway 404s (cloudOAuth2)', async () => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue('cloudOAuth2');
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					domain: 'https://example.atlassian.net',
				});
				mockExecuteFunctions.helpers.httpRequestWithAuthentication
					.mockResolvedValueOnce(accessibleResources) // cloudId lookup
					.mockResolvedValueOnce(accessibleResources); // forced refresh
				mockExecuteFunctions.helpers.requestWithAuthentication
					.mockRejectedValueOnce({ message: 'boom', response: { status: 404 } })
					.mockResolvedValueOnce({ ok: true });

				const data = await jiraSoftwareCloudApiRequest.call(
					mockExecuteFunctions,
					'/api/2/myself',
					'GET',
				);

				expect(data).toEqual({ ok: true });
				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledTimes(2);
				expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(2);
			});

			it('retries once after forcing a token refresh when the gateway 403s (cloudServiceAccount)', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((parameterName: string) =>
					parameterName === 'site'
						? { __rl: true, mode: 'list', value: cloudId }
						: 'cloudServiceAccount',
				);
				mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValueOnce(
					accessibleResources,
				); // forced refresh (the list-mode cloudId needs no lookup call up front)
				mockExecuteFunctions.helpers.requestWithAuthentication
					.mockRejectedValueOnce({ message: 'boom', response: { status: 403 } })
					.mockResolvedValueOnce({ ok: true });

				const data = await jiraSoftwareCloudApiRequest.call(
					mockExecuteFunctions,
					'/api/2/myself',
					'GET',
				);

				expect(data).toEqual({ ok: true });
				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledTimes(2);
			});

			it('does not loop on a genuinely deleted issue: exactly one retry, then the 404 surfaces', async () => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue('cloudOAuth2');
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					domain: 'https://example.atlassian.net',
				});
				mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValue(
					accessibleResources,
				);
				mockExecuteFunctions.helpers.requestWithAuthentication.mockRejectedValue({
					message: 'boom',
					response: { status: 404 },
				});

				await expect(
					jiraSoftwareCloudApiRequest.call(mockExecuteFunctions, '/api/2/issue/999', 'GET'),
				).rejects.toBeTruthy();

				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledTimes(2);
			});

			it('does not retry a 404 on the "server" (Basic Auth) credential', async () => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue('server');
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					domain: 'https://jira.company.com',
				});
				mockExecuteFunctions.helpers.requestWithAuthentication.mockRejectedValueOnce({
					message: 'boom',
					response: { status: 404 },
				});

				await expect(
					jiraSoftwareCloudApiRequest.call(mockExecuteFunctions, '/api/2/myself', 'GET'),
				).rejects.toBeTruthy();

				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledTimes(1);
				expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).not.toHaveBeenCalled();
			});

			it('does not retry a 404/403 on a formData request (the attachment upload body is a consumed stream)', async () => {
				mockExecuteFunctions.getNodeParameter.mockReturnValue('cloudOAuth2');
				mockExecuteFunctions.getCredentials.mockResolvedValue({
					domain: 'https://example.atlassian.net',
				});
				mockExecuteFunctions.helpers.httpRequestWithAuthentication.mockResolvedValueOnce(
					accessibleResources,
				); // cloudId lookup only
				mockExecuteFunctions.helpers.requestWithAuthentication.mockRejectedValueOnce({
					message: 'boom',
					response: { status: 404 },
				});

				await expect(
					jiraSoftwareCloudApiRequest.call(
						mockExecuteFunctions,
						'/api/3/issue/ABC-1/attachments',
						'POST',
						{},
						{},
						undefined,
						{ formData: { file: { value: Buffer.from('x'), options: { filename: 'a.txt' } } } },
					),
				).rejects.toBeTruthy();

				expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledTimes(1);
				// cloudId lookup only — no second (forced-refresh) call
				expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(1);
			});
		});

		it('should throw a NodeOperationError naming the Site URL field when the cloudOAuth2 credential lacks it', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('cloudOAuth2');
			mockExecuteFunctions.getCredentials.mockResolvedValue({});

			const promise = jiraSoftwareCloudApiRequest.call(
				mockExecuteFunctions,
				'/api/2/myself',
				'GET',
			);

			await expect(promise).rejects.toThrow('Site URL');
			expect(mockExecuteFunctions.helpers.httpRequestWithAuthentication).not.toHaveBeenCalled();
			expect(mockExecuteFunctions.helpers.requestWithAuthentication).not.toHaveBeenCalled();
		});

		it('should use jiraSoftwareServerApi credential for jiraVersion "server"', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('server');
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				domain: 'https://jira.company.com',
			});

			await jiraSoftwareCloudApiRequest.call(mockExecuteFunctions, '/api/2/myself', 'GET');

			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('jiraSoftwareServerApi');
			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'jiraSoftwareServerApi',
				expect.objectContaining({ uri: 'https://jira.company.com/rest/api/2/myself' }),
			);
		});

		it('should use jiraSoftwareServerPatApi credential for jiraVersion "serverPat"', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('serverPat');
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				domain: 'https://jira.company.com',
			});

			await jiraSoftwareCloudApiRequest.call(mockExecuteFunctions, '/api/2/myself', 'GET');

			expect(mockExecuteFunctions.getCredentials).toHaveBeenCalledWith('jiraSoftwareServerPatApi');
			expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'jiraSoftwareServerPatApi',
				expect.objectContaining({ uri: 'https://jira.company.com/rest/api/2/myself' }),
			);
		});
	});

	describe('handlePagination', () => {
		it('should initialize offset pagination parameters with GET when responseData is not provided', () => {
			const body: IDataObject = {};
			const query: IDataObject = {};

			const result = handlePagination('GET', body, query, 'offset');

			expect(result).toBe(true);
			expect(query.startAt).toBe(0);
			expect(query.maxResults).toBe(100);
			expect(body).toEqual({});
		});

		it('should initialize offset pagination parameters with POST when responseData is not provided', () => {
			const body: IDataObject = {};
			const query: IDataObject = {};

			const result = handlePagination('POST', body, query, 'offset');

			expect(result).toBe(true);
			expect(body.startAt).toBe(0);
			expect(body.maxResults).toBe(100);
			expect(query).toEqual({});
		});

		it('should initialize token pagination parameters with GET when responseData is not provided', () => {
			const body: IDataObject = {};
			const query: IDataObject = {};

			const result = handlePagination('GET', body, query, 'token');

			expect(result).toBe(true);
			expect(query.maxResults).toBe(100);
			expect(body).toEqual({});
		});

		it('should initialize token pagination parameters with POST when responseData is not provided', () => {
			const body: IDataObject = {};
			const query: IDataObject = {};

			const result = handlePagination('POST', body, query, 'token');

			expect(result).toBe(true);
			expect(query).toEqual({});
			expect(body.maxResults).toBe(100);
		});

		it('should handle offset pagination with GET and more pages available', () => {
			const body: IDataObject = {};
			const query: IDataObject = {};
			const responseData = {
				startAt: 0,
				maxResults: 100,
				total: 250,
			};

			const result = handlePagination('GET', body, query, 'offset', responseData);

			expect(result).toBe(true);
			expect(query.startAt).toBe(100);
			expect(body).toEqual({});
		});

		it('should handle offset pagination with POST and more pages available', () => {
			const body: IDataObject = {};
			const query: IDataObject = {};
			const responseData = {
				startAt: 0,
				maxResults: 100,
				total: 250,
			};

			const result = handlePagination('POST', body, query, 'offset', responseData);

			expect(result).toBe(true);
			expect(body.startAt).toBe(100);
			expect(query).toEqual({});
		});

		it('should handle offset pagination with GET and no more pages available', () => {
			const body: IDataObject = {};
			const query: IDataObject = {};
			const responseData = {
				startAt: 200,
				maxResults: 100,
				total: 250,
			};

			const result = handlePagination('GET', body, query, 'offset', responseData);

			expect(result).toBe(false);
			expect(query.startAt).toBe(300);
			expect(body).toEqual({});
		});

		it('should handle offset pagination with POST and no more pages available', () => {
			const body: IDataObject = {};
			const query: IDataObject = {};
			const responseData = {
				startAt: 200,
				maxResults: 100,
				total: 250,
			};

			const result = handlePagination('POST', body, query, 'offset', responseData);

			expect(result).toBe(false);
			expect(body.startAt).toBe(300);
			expect(query).toEqual({});
		});

		it('should handle token pagination with GET and more pages available', () => {
			const body: IDataObject = {};
			const query: IDataObject = {};
			const responseData = {
				nextPageToken: 'someToken123',
			};

			const result = handlePagination('GET', body, query, 'token', responseData);

			expect(result).toBe(true);
			expect(query.nextPageToken).toBe('someToken123');
			expect(body).toEqual({});
		});

		it('should handle token pagination with POST and more pages available', () => {
			const body: IDataObject = {};
			const query: IDataObject = {};
			const responseData = {
				nextPageToken: 'someToken123',
			};

			const result = handlePagination('POST', body, query, 'token', responseData);

			expect(result).toBe(true);
			expect(body.nextPageToken).toBe('someToken123');
			expect(query).toEqual({});
		});

		it('should handle token pagination with GET and no more pages available', () => {
			const body: IDataObject = {};
			const query: IDataObject = {};
			const responseData = {
				nextPageToken: '',
			};

			const result = handlePagination('GET', body, query, 'token', responseData);

			expect(result).toBe(false);
			expect(query.nextPageToken).toBe('');
			expect(body).toEqual({});
		});

		it('should handle token pagination with POST and no more pages available', () => {
			const body: IDataObject = {};
			const query: IDataObject = {};
			const responseData = {
				nextPageToken: '',
			};

			const result = handlePagination('POST', body, query, 'token', responseData);

			expect(result).toBe(false);
			expect(body.nextPageToken).toBe('');
			expect(query).toEqual({});
		});
	});
});
