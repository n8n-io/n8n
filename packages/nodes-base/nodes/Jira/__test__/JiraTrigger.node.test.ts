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
