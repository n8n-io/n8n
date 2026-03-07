import { mock, mockDeep } from 'jest-mock-extended';
import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IHookFunctions,
	INode,
} from 'n8n-workflow';

import { testWebhookTriggerNode } from '@test/nodes/TriggerHelpers';

import { JiraTrigger } from '../JiraTrigger.node';

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

	describe('Webhook authentication', () => {
		let authStaticData: IDataObject;

		beforeEach(() => {
			authStaticData = {};
		});

		test('should detect existing webhook with query parameters (NODE-4578)', async () => {
			const trigger = new JiraTrigger();

			// Simulate an existing webhook with query parameters
			const existingWebhookUrl = 'https://n8n.local/webhook/id?auth_key=dGVzdF92YWx1ZQ%3D%3D';
			const baseWebhookUrl = 'https://n8n.local/webhook/id';

			const mockExistsRequest = jest
				.fn()
				.mockResolvedValueOnce({ deploymentType: 'Cloud', versionNumbers: [1000, 0, 1] })
				.mockResolvedValueOnce([
					{
						id: 2053,
						name: 'n8n-webhook:https://n8n.local/webhook/id',
						url: existingWebhookUrl,
						events: ['jira:issue_created'],
						active: true,
					},
				]);

			const hookFunctions = mockDeep<IHookFunctions>({
				getWorkflowStaticData: () => authStaticData,
				getNode: jest.fn(() => mock<INode>({ typeVersion: 1.1 })),
				getNodeWebhookUrl: jest.fn(() => baseWebhookUrl),
				getNodeParameter: jest.fn((param: string) => {
					if (param === 'events') return ['jira:issue_created'];
					if (param === 'authenticateWebhook') return true;
					if (param === 'additionalFields') return {};
					return {};
				}),
				getCredentials: async <T extends object = ICredentialDataDecryptedObject>(
					credentialType: string,
				) => {
					if (credentialType === 'httpQueryAuth') {
						return {
							name: 'auth_key',
							value: 'test_value',
						} as T;
					}
					return {
						email: 'test@n8n.io',
						password: 'secret',
						domain: 'https://jira.local',
					} as T;
				},
				helpers: {
					requestWithAuthentication: mockExistsRequest,
				},
			});

			const exists = await trigger.webhookMethods.default?.checkExists.call(hookFunctions);

			// BUG: This should return true because the webhook exists with query parameters,
			// but it returns false because the URL comparison fails
			expect(exists).toBe(true);
			expect(authStaticData.webhookId).toBe('2053');
		});

		test('should not create duplicate webhook on restart when using authentication', async () => {
			const trigger = new JiraTrigger();

			const baseWebhookUrl = 'https://n8n.local/webhook/id';
			const webhookUrlWithAuth = 'https://n8n.local/webhook/id?auth_key=dGVzdF92YWx1ZQ==';

			// First activation: create webhook
			const mockCreateRequest = jest.fn().mockResolvedValueOnce({ id: 2053 });

			const createHookFunctions = mockDeep<IHookFunctions>({
				getWorkflowStaticData: () => authStaticData,
				getNode: jest.fn(() => mock<INode>({ typeVersion: 1.1 })),
				getNodeWebhookUrl: jest.fn(() => baseWebhookUrl),
				getNodeParameter: jest.fn((param: string) => {
					if (param === 'events') return ['jira:issue_created'];
					if (param === 'authenticateWebhook') return true;
					if (param === 'additionalFields') return {};
					return {};
				}),
				getCredentials: async <T extends object = ICredentialDataDecryptedObject>(
					credentialType: string,
				) => {
					if (credentialType === 'httpQueryAuth') {
						return {
							name: 'auth_key',
							value: 'test_value',
						} as T;
					}
					return {
						email: 'test@n8n.io',
						password: 'secret',
						domain: 'https://jira.local',
					} as T;
				},
				helpers: {
					requestWithAuthentication: mockCreateRequest,
				},
			});

			authStaticData.endpoint = '/webhooks/1.0/webhook';
			await trigger.webhookMethods.default?.create.call(createHookFunctions);

			expect(authStaticData.webhookId).toBe('2053');
			expect(mockCreateRequest).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					body: expect.objectContaining({
						url: webhookUrlWithAuth,
					}),
				}),
			);

			// Second activation (restart): check if webhook exists
			const mockExistsRequest = jest
				.fn()
				.mockResolvedValueOnce({ deploymentType: 'Cloud', versionNumbers: [1000, 0, 1] })
				.mockResolvedValueOnce([
					{
						id: 2053,
						name: 'n8n-webhook:https://n8n.local/webhook/id',
						url: webhookUrlWithAuth,
						events: ['jira:issue_created'],
						active: true,
					},
				]);

			const checkHookFunctions = mockDeep<IHookFunctions>({
				getWorkflowStaticData: () => authStaticData,
				getNode: jest.fn(() => mock<INode>({ typeVersion: 1.1 })),
				getNodeWebhookUrl: jest.fn(() => baseWebhookUrl),
				getNodeParameter: jest.fn((param: string) => {
					if (param === 'events') return ['jira:issue_created'];
					if (param === 'authenticateWebhook') return true;
					if (param === 'additionalFields') return {};
					return {};
				}),
				getCredentials: async <T extends object = ICredentialDataDecryptedObject>(
					credentialType: string,
				) => {
					if (credentialType === 'httpQueryAuth') {
						return {
							name: 'auth_key',
							value: 'test_value',
						} as T;
					}
					return {
						email: 'test@n8n.io',
						password: 'secret',
						domain: 'https://jira.local',
					} as T;
				},
				helpers: {
					requestWithAuthentication: mockExistsRequest,
				},
			});

			const exists = await trigger.webhookMethods.default?.checkExists.call(checkHookFunctions);

			// BUG: Should detect existing webhook and not create a duplicate
			expect(exists).toBe(true);
			expect(authStaticData.webhookId).toBe('2053');

			// If checkExists returns false, a new webhook would be created on restart,
			// resulting in duplicate webhooks in Jira
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
