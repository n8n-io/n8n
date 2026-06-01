import { mock, mockDeep } from 'jest-mock-extended';
import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IHookFunctions,
	INode,
	IWebhookFunctions,
} from 'n8n-workflow';

import { testWebhookTriggerNode } from '@test/nodes/TriggerHelpers';

import { JiraTrigger } from '../JiraTrigger.node';
import {
	allEvents,
	OAUTH2_WEBHOOK_REFRESH_INTERVAL_MS,
	OAUTH2_WEBHOOK_EXPIRY_BUFFER_MS,
	OAUTH2_SUPPORTED_WEBHOOK_EVENTS,
} from '../GenericFunctions';

describe('JiraTrigger', () => {
	describe('Webhook lifecycle', () => {
		let staticData: IDataObject;

		beforeEach(() => {
			staticData = {};
		});

		function mockHookFunctions(
			mockRequest: IHookFunctions['helpers']['requestWithAuthentication'],
		) {
			const baseUrl = 'https://jira.local';
			const credential = {
				email: 'test@n8n.io',
				password: 'secret',
				domain: baseUrl,
			};

			return mockDeep<IHookFunctions>({
				getWorkflowStaticData: () => staticData,
				getNode: jest.fn(() => mock<INode>({ typeVersion: 1 })),
				getNodeWebhookUrl: jest.fn(() => 'https://n8n.local/webhook/id'),
				getNodeParameter: jest.fn((param: string) => {
					if (param === 'events') return ['jira:issue_created'];
					return {};
				}),
				getCredentials: async <T extends object = ICredentialDataDecryptedObject>() =>
					credential as T,
				helpers: {
					requestWithAuthentication: mockRequest,
				},
			});
		}

		test('should register a webhook subscription on Jira 10', async () => {
			const trigger = new JiraTrigger();

			const mockExistsRequest = jest
				.fn()
				.mockResolvedValueOnce({ versionNumbers: [10, 0, 1] })
				.mockResolvedValueOnce([]);

			const exists = await trigger.webhookMethods.default?.checkExists.call(
				mockHookFunctions(mockExistsRequest),
			);

			expect(mockExistsRequest).toHaveBeenCalledTimes(2);
			expect(mockExistsRequest).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ uri: 'https://jira.local/rest/api/2/serverInfo' }),
			);
			expect(mockExistsRequest).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ uri: 'https://jira.local/rest/jira-webhook/1.0/webhooks' }),
			);
			expect(staticData.endpoint).toBe('/jira-webhook/1.0/webhooks');
			expect(exists).toBe(false);

			const mockCreateRequest = jest.fn().mockResolvedValueOnce({ id: 1 });

			const created = await trigger.webhookMethods.default?.create.call(
				mockHookFunctions(mockCreateRequest),
			);

			expect(mockCreateRequest).toHaveBeenCalledTimes(1);
			expect(mockCreateRequest).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					method: 'POST',
					uri: 'https://jira.local/rest/jira-webhook/1.0/webhooks',
					body: expect.objectContaining({
						events: ['jira:issue_created'],
						excludeBody: false,
						filters: {},
						name: 'n8n-webhook:https://n8n.local/webhook/id',
						url: 'https://n8n.local/webhook/id',
					}),
				}),
			);
			expect(created).toBe(true);

			const mockDeleteRequest = jest.fn().mockResolvedValueOnce({});
			const deleted = await trigger.webhookMethods.default?.delete.call(
				mockHookFunctions(mockDeleteRequest),
			);

			expect(deleted).toBe(true);
			expect(mockDeleteRequest).toHaveBeenCalledTimes(1);
			expect(mockDeleteRequest).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					method: 'DELETE',
					uri: 'https://jira.local/rest/jira-webhook/1.0/webhooks/1',
				}),
			);
		});

		test('should register a webhook subscription on Jira 9', async () => {
			const trigger = new JiraTrigger();

			const mockExistsRequest = jest
				.fn()
				.mockResolvedValueOnce({ versionNumbers: [9, 0, 1] })
				.mockResolvedValueOnce([]);

			const exists = await trigger.webhookMethods.default?.checkExists.call(
				mockHookFunctions(mockExistsRequest),
			);

			expect(mockExistsRequest).toHaveBeenCalledTimes(2);
			expect(mockExistsRequest).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ uri: 'https://jira.local/rest/api/2/serverInfo' }),
			);
			expect(mockExistsRequest).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ uri: 'https://jira.local/rest/webhooks/1.0/webhook' }),
			);
			expect(staticData.endpoint).toBe('/webhooks/1.0/webhook');
			expect(exists).toBe(false);

			const mockCreateRequest = jest.fn().mockResolvedValueOnce({ id: 1 });

			const created = await trigger.webhookMethods.default?.create.call(
				mockHookFunctions(mockCreateRequest),
			);

			expect(mockCreateRequest).toHaveBeenCalledTimes(1);
			expect(mockCreateRequest).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					method: 'POST',
					uri: 'https://jira.local/rest/webhooks/1.0/webhook',
					body: expect.objectContaining({
						events: ['jira:issue_created'],
						excludeBody: false,
						filters: {},
						name: 'n8n-webhook:https://n8n.local/webhook/id',
						url: 'https://n8n.local/webhook/id',
					}),
				}),
			);
			expect(created).toBe(true);

			const mockDeleteRequest = jest.fn().mockResolvedValueOnce({});
			const deleted = await trigger.webhookMethods.default?.delete.call(
				mockHookFunctions(mockDeleteRequest),
			);

			expect(deleted).toBe(true);
			expect(mockDeleteRequest).toHaveBeenCalledTimes(1);
			expect(mockDeleteRequest).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					method: 'DELETE',
					uri: 'https://jira.local/rest/webhooks/1.0/webhook/1',
				}),
			);
		});

		test('should register a webhook subscription on Jira Cloud (OAuth2)', async () => {
			const trigger = new JiraTrigger();
			const cloudId = 'test-cloud-id';
			const domain = 'https://test-oauth2.atlassian.net';
			const accessibleResources = [{ id: cloudId, url: domain }];

			function mockOAuth2HookFunctions(
				mockRequest: IHookFunctions['helpers']['requestWithAuthentication'],
			) {
				return mockDeep<IHookFunctions>({
					getWorkflowStaticData: () => staticData,
					getNode: jest.fn(() => mock<INode>({ typeVersion: 1 })),
					getNodeWebhookUrl: jest.fn(() => 'https://n8n.local/webhook/id'),
					getNodeParameter: jest.fn((param: string) => {
						if (param === 'events') return ['comment_created'];
						if (param === 'jiraVersion') return 'cloudOAuth2';
						if (param === 'additionalFields') return { filter: 'project = TEST' };
						return {};
					}),
					getCredentials: async <T extends object = ICredentialDataDecryptedObject>() =>
						({ domain }) as T,
					helpers: { requestWithAuthentication: mockRequest },
				});
			}

			const baseApiUrl = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/webhook`;

			// checkExists — GET /api/3/webhook
			const mockExistsRequest = jest
				.fn()
				.mockResolvedValueOnce(accessibleResources) // getCloudId call
				.mockResolvedValueOnce({ isLast: true, maxResults: 50, startAt: 0, total: 0, values: [] });

			const exists = await trigger.webhookMethods.default?.checkExists.call(
				mockOAuth2HookFunctions(mockExistsRequest),
			);

			expect(mockExistsRequest).toHaveBeenCalledTimes(2);
			expect(mockExistsRequest).toHaveBeenCalledWith(
				'jiraSoftwareCloudOAuth2Api',
				expect.objectContaining({
					uri: 'https://api.atlassian.com/oauth/token/accessible-resources',
				}),
			);
			expect(mockExistsRequest).toHaveBeenCalledWith(
				'jiraSoftwareCloudOAuth2Api',
				expect.objectContaining({ uri: baseApiUrl, method: 'GET' }),
			);
			expect(staticData.endpoint).toBe('/api/3/webhook');
			expect(exists).toBe(false);

			// create — POST /api/3/webhook with Dynamic Webhooks body
			// cloudId is now cached so no accessible-resources call
			const mockCreateRequest = jest.fn().mockResolvedValueOnce({
				webhookRegistrationResult: [{ createdWebhookId: 1000 }],
			});

			const created = await trigger.webhookMethods.default?.create.call(
				mockOAuth2HookFunctions(mockCreateRequest),
			);

			expect(mockCreateRequest).toHaveBeenCalledTimes(1);
			expect(mockCreateRequest).toHaveBeenCalledWith(
				'jiraSoftwareCloudOAuth2Api',
				expect.objectContaining({
					method: 'POST',
					uri: baseApiUrl,
					body: {
						url: 'https://n8n.local/webhook/id',
						webhooks: [{ events: ['comment_created'], jqlFilter: 'project = TEST' }],
					},
				}),
			);
			expect(created).toBe(true);
			expect(staticData.webhookId).toBe('1000');

			// delete — DELETE /api/3/webhook with body {webhookIds: [id]}
			const mockDeleteRequest = jest.fn().mockResolvedValueOnce({});

			const deleted = await trigger.webhookMethods.default?.delete.call(
				mockOAuth2HookFunctions(mockDeleteRequest),
			);

			expect(deleted).toBe(true);
			expect(mockDeleteRequest).toHaveBeenCalledTimes(1);
			expect(mockDeleteRequest).toHaveBeenCalledWith(
				'jiraSoftwareCloudOAuth2Api',
				expect.objectContaining({
					method: 'DELETE',
					uri: baseApiUrl,
					body: { webhookIds: [1000] },
				}),
			);
		});

		test('should refresh OAuth2 webhook in checkExists when near expiry', async () => {
			const trigger = new JiraTrigger();
			const cloudId = 'test-cloud-id'; // already cached from previous OAuth2 test
			const domain = 'https://test-oauth2.atlassian.net';
			const baseApiUrl = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/webhook`;

			const expiresAt = new Date(Date.now() + OAUTH2_WEBHOOK_EXPIRY_BUFFER_MS / 2).toISOString();

			const mockRequest = jest
				.fn()
				// GET /api/3/webhook — returns a matching webhook near expiry
				.mockResolvedValueOnce({
					isLast: true,
					maxResults: 50,
					startAt: 0,
					total: 1,
					values: [
						{
							id: 2000,
							url: 'https://n8n.local/webhook/id',
							events: ['comment_created'],
							expirationDate: expiresAt,
						},
					],
				})
				// PUT /api/3/webhook/refresh
				.mockResolvedValueOnce({});

			const hookFns = mockDeep<IHookFunctions>({
				getWorkflowStaticData: () => staticData,
				getNode: jest.fn(() => mock<INode>({ typeVersion: 1 })),
				getNodeWebhookUrl: jest.fn(() => 'https://n8n.local/webhook/id'),
				getNodeParameter: jest.fn((param: string) => {
					if (param === 'events') return ['comment_created'];
					if (param === 'jiraVersion') return 'cloudOAuth2';
					return {};
				}),
				getCredentials: async <T extends object = ICredentialDataDecryptedObject>() =>
					({ domain }) as T,
				helpers: { requestWithAuthentication: mockRequest },
			});

			const exists = await trigger.webhookMethods.default?.checkExists.call(hookFns);

			expect(exists).toBe(true);
			expect(staticData.webhookId).toBe('2000');
			expect(staticData.lastRefreshed).toBeGreaterThan(0);
			expect(mockRequest).toHaveBeenCalledWith(
				'jiraSoftwareCloudOAuth2Api',
				expect.objectContaining({
					method: 'PUT',
					uri: `${baseApiUrl}/refresh`,
					body: { webhookIds: [2000] },
				}),
			);
		});

		test('should not refresh OAuth2 webhook in checkExists when not near expiry', async () => {
			const trigger = new JiraTrigger();
			const domain = 'https://test-oauth2.atlassian.net';

			const expiresAt = new Date(Date.now() + OAUTH2_WEBHOOK_EXPIRY_BUFFER_MS * 3).toISOString();

			const mockRequest = jest.fn().mockResolvedValueOnce({
				isLast: true,
				maxResults: 50,
				startAt: 0,
				total: 1,
				values: [
					{
						id: 2001,
						url: 'https://n8n.local/webhook/id',
						events: ['comment_created'],
						expirationDate: expiresAt,
					},
				],
			});

			const hookFns = mockDeep<IHookFunctions>({
				getWorkflowStaticData: () => staticData,
				getNode: jest.fn(() => mock<INode>({ typeVersion: 1 })),
				getNodeWebhookUrl: jest.fn(() => 'https://n8n.local/webhook/id'),
				getNodeParameter: jest.fn((param: string) => {
					if (param === 'events') return ['comment_created'];
					if (param === 'jiraVersion') return 'cloudOAuth2';
					return {};
				}),
				getCredentials: async <T extends object = ICredentialDataDecryptedObject>() =>
					({ domain }) as T,
				helpers: { requestWithAuthentication: mockRequest },
			});

			const exists = await trigger.webhookMethods.default?.checkExists.call(hookFns);

			expect(exists).toBe(true);
			expect(mockRequest).toHaveBeenCalledTimes(1); // only GET, no refresh PUT
		});

		test('should refresh OAuth2 webhook in handler when interval has elapsed', async () => {
			const trigger = new JiraTrigger();
			const cloudId = 'test-cloud-id';
			const domain = 'https://test-oauth2.atlassian.net';
			const baseApiUrl = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/webhook`;

			const staleData: IDataObject = {
				webhookId: '3000',
				endpoint: '/api/3/webhook',
				lastRefreshed: Date.now() - OAUTH2_WEBHOOK_REFRESH_INTERVAL_MS - 1,
			};

			const webhookFns = mockDeep<IWebhookFunctions>();
			webhookFns.getWorkflowStaticData.mockReturnValue(staleData);
			webhookFns.getNode.mockReturnValue(mock<INode>({ typeVersion: 1 }));
			webhookFns.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'jiraVersion') return 'cloudOAuth2';
				if (param === 'incomingAuthentication') return 'none';
				return {};
			});
			webhookFns.getBodyData.mockReturnValue({});
			webhookFns.getQueryData.mockReturnValue({});
			webhookFns.getCredentials.mockResolvedValue({ domain } as ICredentialDataDecryptedObject);
			// PUT /api/3/webhook/refresh
			webhookFns.helpers.requestWithAuthentication.mockResolvedValueOnce({});
			webhookFns.helpers.returnJsonArray.mockImplementation((data: IDataObject | IDataObject[]) => [
				{ json: data as IDataObject },
			]);

			await trigger.webhook.call(webhookFns);

			expect(webhookFns.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'jiraSoftwareCloudOAuth2Api',
				expect.objectContaining({
					method: 'PUT',
					uri: `${baseApiUrl}/refresh`,
					body: { webhookIds: [3000] },
				}),
			);
			expect(staleData.lastRefreshed).toBeGreaterThan(
				Date.now() - OAUTH2_WEBHOOK_REFRESH_INTERVAL_MS,
			);
		});

		test('should skip refresh in handler when interval has not elapsed', async () => {
			const trigger = new JiraTrigger();

			const freshData: IDataObject = {
				webhookId: '4000',
				endpoint: '/api/3/webhook',
				lastRefreshed: Date.now(),
			};

			const webhookFns = mockDeep<IWebhookFunctions>();
			webhookFns.getWorkflowStaticData.mockReturnValue(freshData);
			webhookFns.getNode.mockReturnValue(mock<INode>({ typeVersion: 1 }));
			webhookFns.getNodeParameter.mockImplementation((param: string) => {
				if (param === 'jiraVersion') return 'cloudOAuth2';
				if (param === 'incomingAuthentication') return 'none';
				return {};
			});
			webhookFns.getBodyData.mockReturnValue({});
			webhookFns.getQueryData.mockReturnValue({});
			webhookFns.helpers.returnJsonArray.mockImplementation((data: IDataObject | IDataObject[]) => [
				{ json: data as IDataObject },
			]);

			await trigger.webhook.call(webhookFns);

			expect(webhookFns.helpers.requestWithAuthentication).not.toHaveBeenCalled();
		});

		test('should filter unsupported events when registering OAuth2 webhook', async () => {
			const trigger = new JiraTrigger();
			const domain = 'https://test-oauth2.atlassian.net'; // cloudId already cached
			const cloudId = 'test-cloud-id';
			const baseApiUrl = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/webhook`;

			// Mix of supported and unsupported events
			const selectedEvents = [
				'jira:issue_created',
				'board_created',
				'user_deleted',
				'comment_updated',
			];
			const expectedFiltered = ['jira:issue_created', 'comment_updated'];

			staticData.endpoint = '/api/3/webhook';

			const mockRequest = jest.fn().mockResolvedValueOnce({
				webhookRegistrationResult: [{ createdWebhookId: 5000 }],
			});

			const hookFns = mockDeep<IHookFunctions>({
				getWorkflowStaticData: () => staticData,
				getNode: jest.fn(() => mock<INode>({ typeVersion: 1 })),
				getNodeWebhookUrl: jest.fn(() => 'https://n8n.local/webhook/id'),
				getNodeParameter: jest.fn((param: string) => {
					if (param === 'events') return selectedEvents;
					if (param === 'jiraVersion') return 'cloudOAuth2';
					if (param === 'additionalFields') return { filter: 'project = TEST' };
					if (param === 'incomingAuthentication') return 'none';
					return {};
				}),
				getCredentials: async <T extends object = ICredentialDataDecryptedObject>() =>
					({ domain }) as T,
				helpers: { requestWithAuthentication: mockRequest },
			});

			await trigger.webhookMethods.default?.create.call(hookFns);

			expect(mockRequest).toHaveBeenCalledWith(
				'jiraSoftwareCloudOAuth2Api',
				expect.objectContaining({
					method: 'POST',
					uri: baseApiUrl,
					body: expect.objectContaining({
						webhooks: [{ events: expectedFiltered, jqlFilter: 'project = TEST' }],
					}),
				}),
			);
		});

		test('should filter allEvents to supported subset when * is selected for OAuth2', async () => {
			const trigger = new JiraTrigger();
			const domain = 'https://test-oauth2.atlassian.net';

			staticData.endpoint = '/api/3/webhook';

			const mockRequest = jest.fn().mockResolvedValueOnce({
				webhookRegistrationResult: [{ createdWebhookId: 5001 }],
			});

			const hookFns = mockDeep<IHookFunctions>({
				getWorkflowStaticData: () => staticData,
				getNode: jest.fn(() => mock<INode>({ typeVersion: 1 })),
				getNodeWebhookUrl: jest.fn(() => 'https://n8n.local/webhook/id'),
				getNodeParameter: jest.fn((param: string) => {
					if (param === 'events') return ['*'];
					if (param === 'jiraVersion') return 'cloudOAuth2';
					if (param === 'additionalFields') return { filter: 'project = TEST' };
					if (param === 'incomingAuthentication') return 'none';
					return {};
				}),
				getCredentials: async <T extends object = ICredentialDataDecryptedObject>() =>
					({ domain }) as T,
				helpers: { requestWithAuthentication: mockRequest },
			});

			await trigger.webhookMethods.default?.create.call(hookFns);

			const sentEvents: string[] = mockRequest.mock.calls[0][1].body.webhooks[0].events;
			expect(sentEvents.every((e) => OAUTH2_SUPPORTED_WEBHOOK_EVENTS.has(e))).toBe(true);
			expect(sentEvents).toHaveLength(OAUTH2_SUPPORTED_WEBHOOK_EVENTS.size);
		});

		test('should auto-build jqlFilter from accessible projects when no filter is set', async () => {
			const trigger = new JiraTrigger();
			const domain = 'https://test-oauth2.atlassian.net';

			staticData.endpoint = '/api/3/webhook';

			const mockRequest = jest
				.fn()
				// GET /api/2/project/search — paginated response
				.mockResolvedValueOnce({
					values: [
						{ id: '1', key: 'PROJ1', name: 'Project 1' },
						{ id: '2', key: 'PROJ2', name: 'Project 2' },
					],
					startAt: 0,
					maxResults: 100,
					total: 2,
				})
				.mockResolvedValueOnce({ webhookRegistrationResult: [{ createdWebhookId: 5002 }] });

			const hookFns = mockDeep<IHookFunctions>({
				getWorkflowStaticData: () => staticData,
				getNode: jest.fn(() => mock<INode>({ typeVersion: 1 })),
				getNodeWebhookUrl: jest.fn(() => 'https://n8n.local/webhook/id'),
				getNodeParameter: jest.fn((param: string) => {
					if (param === 'events') return ['jira:issue_created'];
					if (param === 'jiraVersion') return 'cloudOAuth2';
					if (param === 'additionalFields') return {};
					if (param === 'incomingAuthentication') return 'none';
					return {};
				}),
				getCredentials: async <T extends object = ICredentialDataDecryptedObject>() =>
					({ domain }) as T,
				helpers: { requestWithAuthentication: mockRequest },
			});

			await trigger.webhookMethods.default?.create.call(hookFns);

			const sent = mockRequest.mock.calls[1][1].body.webhooks[0];
			expect(sent.jqlFilter).toBe('project in (PROJ1, PROJ2)');
		});

		test('should throw when OAuth2 user has no accessible projects', async () => {
			const trigger = new JiraTrigger();
			const domain = 'https://test-oauth2.atlassian.net';

			staticData.endpoint = '/api/3/webhook';

			const hookFns = mockDeep<IHookFunctions>({
				getWorkflowStaticData: () => staticData,
				getNode: jest.fn(() => mock<INode>({ typeVersion: 1 })),
				getNodeWebhookUrl: jest.fn(() => 'https://n8n.local/webhook/id'),
				getNodeParameter: jest.fn((param: string) => {
					if (param === 'events') return ['jira:issue_created'];
					if (param === 'jiraVersion') return 'cloudOAuth2';
					if (param === 'additionalFields') return {};
					if (param === 'incomingAuthentication') return 'none';
					return {};
				}),
				getCredentials: async <T extends object = ICredentialDataDecryptedObject>() =>
					({ domain }) as T,
				helpers: { requestWithAuthentication: jest.fn().mockResolvedValueOnce([]) },
			});

			await expect(trigger.webhookMethods.default?.create.call(hookFns)).rejects.toThrow(
				'No accessible Jira projects found',
			);
		});

		test('should use custom jqlFilter when filter is set for OAuth2', async () => {
			const trigger = new JiraTrigger();
			const domain = 'https://test-oauth2.atlassian.net';

			staticData.endpoint = '/api/3/webhook';

			const mockRequest = jest.fn().mockResolvedValueOnce({
				webhookRegistrationResult: [{ createdWebhookId: 5003 }],
			});

			const hookFns = mockDeep<IHookFunctions>({
				getWorkflowStaticData: () => staticData,
				getNode: jest.fn(() => mock<INode>({ typeVersion: 1 })),
				getNodeWebhookUrl: jest.fn(() => 'https://n8n.local/webhook/id'),
				getNodeParameter: jest.fn((param: string) => {
					if (param === 'events') return ['jira:issue_created'];
					if (param === 'jiraVersion') return 'cloudOAuth2';
					if (param === 'additionalFields') return { filter: 'project = MYPROJ' };
					if (param === 'incomingAuthentication') return 'none';
					return {};
				}),
				getCredentials: async <T extends object = ICredentialDataDecryptedObject>() =>
					({ domain }) as T,
				helpers: { requestWithAuthentication: mockRequest },
			});

			await trigger.webhookMethods.default?.create.call(hookFns);

			const sent = mockRequest.mock.calls[0][1].body.webhooks[0];
			expect(sent.jqlFilter).toBe('project = MYPROJ');
		});

		test('should throw when all selected events are unsupported for OAuth2', async () => {
			const trigger = new JiraTrigger();
			const domain = 'https://test-oauth2.atlassian.net';

			staticData.endpoint = '/api/3/webhook';

			const hookFns = mockDeep<IHookFunctions>({
				getWorkflowStaticData: () => staticData,
				getNode: jest.fn(() => mock<INode>({ typeVersion: 1 })),
				getNodeWebhookUrl: jest.fn(() => 'https://n8n.local/webhook/id'),
				getNodeParameter: jest.fn((param: string) => {
					if (param === 'events') return ['board_created', 'user_deleted'];
					if (param === 'jiraVersion') return 'cloudOAuth2';
					if (param === 'additionalFields') return {};
					if (param === 'incomingAuthentication') return 'none';
					return {};
				}),
				getCredentials: async <T extends object = ICredentialDataDecryptedObject>() =>
					({ domain }) as T,
				helpers: { requestWithAuthentication: jest.fn() },
			});

			await expect(trigger.webhookMethods.default?.create.call(hookFns)).rejects.toThrow(
				'None of the selected events are supported',
			);
		});

		test('should find existing webhook when * is selected on classic path', async () => {
			const trigger = new JiraTrigger();

			// Webhook was previously created with * (expanded to all events)
			const existingWebhook = {
				id: 99,
				url: 'https://n8n.local/webhook/id',
				events: allEvents,
				active: true,
			};

			const mockExistsRequest = jest
				.fn()
				.mockResolvedValueOnce({ versionNumbers: [10, 0, 1] }) // serverInfo
				.mockResolvedValueOnce([existingWebhook]); // GET webhooks

			const hookFns = mockDeep<IHookFunctions>({
				getWorkflowStaticData: () => staticData,
				getNode: jest.fn(() => mock<INode>({ typeVersion: 1 })),
				getNodeWebhookUrl: jest.fn(() => 'https://n8n.local/webhook/id'),
				getNodeParameter: jest.fn((param: string) => {
					if (param === 'events') return ['*'];
					return {};
				}),
				getCredentials: async <T extends object = ICredentialDataDecryptedObject>() =>
					({ domain: 'https://jira.local', email: 'test@n8n.io', password: 'secret' }) as T,
				helpers: { requestWithAuthentication: mockExistsRequest },
			});

			const exists = await trigger.webhookMethods.default?.checkExists.call(hookFns);

			expect(exists).toBe(true);
			expect(staticData.webhookId).toBe('99');
		});

		test('should register a webhook subscription on Jira Cloud', async () => {
			const trigger = new JiraTrigger();

			const mockExistsRequest = jest
				.fn()
				.mockResolvedValueOnce({ deploymentType: 'Cloud', versionNumbers: [1000, 0, 1] })
				.mockResolvedValueOnce([]);

			const exists = await trigger.webhookMethods.default?.checkExists.call(
				mockHookFunctions(mockExistsRequest),
			);

			expect(mockExistsRequest).toHaveBeenCalledTimes(2);
			expect(mockExistsRequest).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ uri: 'https://jira.local/rest/api/2/serverInfo' }),
			);
			expect(mockExistsRequest).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ uri: 'https://jira.local/rest/webhooks/1.0/webhook' }),
			);
			expect(staticData.endpoint).toBe('/webhooks/1.0/webhook');
			expect(exists).toBe(false);

			const mockCreateRequest = jest.fn().mockResolvedValueOnce({ id: 1 });

			const created = await trigger.webhookMethods.default?.create.call(
				mockHookFunctions(mockCreateRequest),
			);

			expect(mockCreateRequest).toHaveBeenCalledTimes(1);
			expect(mockCreateRequest).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					method: 'POST',
					uri: 'https://jira.local/rest/webhooks/1.0/webhook',
					body: expect.objectContaining({
						events: ['jira:issue_created'],
						excludeBody: false,
						filters: {},
						name: 'n8n-webhook:https://n8n.local/webhook/id',
						url: 'https://n8n.local/webhook/id',
					}),
				}),
			);
			expect(created).toBe(true);

			const mockDeleteRequest = jest.fn().mockResolvedValueOnce({});
			const deleted = await trigger.webhookMethods.default?.delete.call(
				mockHookFunctions(mockDeleteRequest),
			);

			expect(deleted).toBe(true);
			expect(mockDeleteRequest).toHaveBeenCalledTimes(1);
			expect(mockDeleteRequest).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					method: 'DELETE',
					uri: 'https://jira.local/rest/webhooks/1.0/webhook/1',
				}),
			);
		});
	});

	describe('Webhook', () => {
		test('should receive a webhook event', async () => {
			const event = {
				timestamp: 1743524005044,
				webhookEvent: 'jira:issue_created',
				issue_event_type_name: 'issue_created',
				user: {
					self: 'http://localhost:8080/rest/api/2/user?key=JIRAUSER10000',
					name: 'elias',
					key: 'JIRAUSER10000',
					emailAddress: 'elias@meire.dev',
					displayName: 'Test',
				},
				issue: {
					id: '10018',
					self: 'http://localhost:8080/rest/api/2/issue/10018',
					key: 'TEST-19',
				},
			};
			const { responseData } = await testWebhookTriggerNode(JiraTrigger, {
				bodyData: event,
			});

			expect(responseData).toEqual({ workflowData: [[{ json: event }]] });
		});
	});
});
