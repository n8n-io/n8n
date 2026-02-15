import { mock, mockDeep } from 'jest-mock-extended';
import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IHookFunctions,
	INode,
} from 'n8n-workflow';

import { testWebhookTriggerNode } from '@test/nodes/TriggerHelpers';

import { JiraTrigger } from '../JiraTrigger.node';
import { resetGlobalDeduplicator } from '../JiraWebhookValidator';

describe('JiraTrigger', () => {
	afterEach(() => {
		// Reset deduplicator between tests
		resetGlobalDeduplicator();
	});

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
				node: {
					parameters: {
						events: ['jira:issue_created'],
					},
				},
			});

			expect(responseData).toEqual({ workflowData: [[{ json: event }]] });
		});

		test('should reject issue_created event when configured for issue_updated', async () => {
			const event = {
				timestamp: 1743524005044,
				webhookEvent: 'jira:issue_created',
				issue_event_type_name: 'issue_created',
				issue: {
					id: '10018',
					key: 'TEST-19',
				},
			};

			const { responseData } = await testWebhookTriggerNode(JiraTrigger, {
				bodyData: event,
				node: {
					parameters: {
						events: ['jira:issue_updated'],
					},
				},
			});

			// Should not trigger workflow
			expect(responseData).toEqual({ noWebhookResponse: true });
		});

		test('should reject issue_updated event when configured for issue_created', async () => {
			const event = {
				timestamp: 1743524005044,
				webhookEvent: 'jira:issue_updated',
				issue_event_type_name: 'issue_updated',
				issue: {
					id: '10018',
					key: 'TEST-19',
				},
			};

			const { responseData } = await testWebhookTriggerNode(JiraTrigger, {
				bodyData: event,
				node: {
					parameters: {
						events: ['jira:issue_created'],
					},
				},
			});

			// Should not trigger workflow
			expect(responseData).toEqual({ noWebhookResponse: true });
		});

		test('should prevent duplicate executions for the same event', async () => {
			const event = {
				timestamp: 1743524005044,
				webhookEvent: 'jira:issue_created',
				issue_event_type_name: 'issue_created',
				issue: {
					id: '10018',
					key: 'TEST-19',
				},
			};

			// First execution should succeed
			const { responseData: firstResponse } = await testWebhookTriggerNode(JiraTrigger, {
				bodyData: event,
				node: {
					parameters: {
						events: ['jira:issue_created'],
					},
				},
			});

			expect(firstResponse).toEqual({ workflowData: [[{ json: event }]] });

			// Second execution with same event should be rejected as duplicate
			const { responseData: secondResponse } = await testWebhookTriggerNode(JiraTrigger, {
				bodyData: event,
				node: {
					parameters: {
						events: ['jira:issue_created'],
					},
				},
			});

			expect(secondResponse).toEqual({ noWebhookResponse: true });
		});

		test('should allow different events even with same issue ID', async () => {
			const createdEvent = {
				timestamp: 1743524005044,
				webhookEvent: 'jira:issue_created',
				issue_event_type_name: 'issue_created',
				issue: {
					id: '10018',
					key: 'TEST-19',
				},
			};

			const updatedEvent = {
				timestamp: 1743524005045,
				webhookEvent: 'jira:issue_updated',
				issue_event_type_name: 'issue_updated',
				issue: {
					id: '10018',
					key: 'TEST-19',
				},
			};

			// First event (created)
			const { responseData: firstResponse } = await testWebhookTriggerNode(JiraTrigger, {
				bodyData: createdEvent,
				node: {
					parameters: {
						events: ['jira:issue_created', 'jira:issue_updated'],
					},
				},
			});

			expect(firstResponse).toEqual({ workflowData: [[{ json: createdEvent }]] });

			// Second event (updated) - should be allowed because it's a different event type
			const { responseData: secondResponse } = await testWebhookTriggerNode(JiraTrigger, {
				bodyData: updatedEvent,
				node: {
					parameters: {
						events: ['jira:issue_created', 'jira:issue_updated'],
					},
				},
			});

			expect(secondResponse).toEqual({ workflowData: [[{ json: updatedEvent }]] });
		});

		test('should reject events with missing webhookEvent field', async () => {
			const invalidEvent = {
				timestamp: 1743524005044,
				issue: {
					id: '10018',
					key: 'TEST-19',
				},
			};

			const { responseData } = await testWebhookTriggerNode(JiraTrigger, {
				bodyData: invalidEvent,
				node: {
					parameters: {
						events: ['jira:issue_created'],
					},
				},
			});

			expect(responseData).toEqual({ noWebhookResponse: true });
		});

		test('should accept wildcard event configuration', async () => {
			const event = {
				timestamp: 1743524005044,
				webhookEvent: 'jira:issue_created',
				issue_event_type_name: 'issue_created',
				issue: {
					id: '10018',
					key: 'TEST-19',
				},
			};

			const { responseData } = await testWebhookTriggerNode(JiraTrigger, {
				bodyData: event,
				node: {
					parameters: {
						events: ['*'],
					},
				},
			});

			expect(responseData).toEqual({ workflowData: [[{ json: event }]] });
		});

		test('should reject event when JQL filter does not match', async () => {
			const event = {
				timestamp: 1743524005044,
				webhookEvent: 'jira:issue_updated',
				issue_event_type_name: 'issue_updated',
				issue: {
					id: '10018',
					key: 'TEST-19',
					fields: {
						project: {
							key: 'TEST',
							id: '10000',
						},
					},
				},
			};

			// Mock the JQL validation to return no matches
			const { responseData } = await testWebhookTriggerNode(JiraTrigger, {
				bodyData: event,
				node: {
					parameters: {
						events: ['jira:issue_updated'],
						additionalFields: {
							filter: 'project = DIFFERENT',
						},
					},
				},
				helpers: {
					requestWithAuthentication: jest.fn().mockResolvedValue({
						total: 0, // No matches
						issues: [],
					}),
				},
			});

			expect(responseData).toEqual({ noWebhookResponse: true });
		});

		test('should accept event when JQL filter matches', async () => {
			const event = {
				timestamp: 1743524005044,
				webhookEvent: 'jira:issue_updated',
				issue_event_type_name: 'issue_updated',
				issue: {
					id: '10018',
					key: 'TEST-19',
					fields: {
						project: {
							key: 'TEST',
							id: '10000',
						},
					},
				},
			};

			// Mock the JQL validation to return a match
			const { responseData } = await testWebhookTriggerNode(JiraTrigger, {
				bodyData: event,
				node: {
					parameters: {
						events: ['jira:issue_updated'],
						additionalFields: {
							filter: 'project = TEST',
						},
					},
				},
				helpers: {
					requestWithAuthentication: jest.fn().mockResolvedValue({
						total: 1, // Match found
						issues: [{ key: 'TEST-19' }],
					}),
				},
			});

			expect(responseData).toEqual({ workflowData: [[{ json: event }]] });
		});

		test('should not apply JQL filter to non-issue events', async () => {
			const event = {
				timestamp: 1743524005044,
				webhookEvent: 'project_created',
				project: {
					id: '10000',
					key: 'TEST',
				},
			};

			// Even with a JQL filter configured, project events should pass through
			const { responseData } = await testWebhookTriggerNode(JiraTrigger, {
				bodyData: event,
				node: {
					parameters: {
						events: ['project_created'],
						additionalFields: {
							filter: 'project = DIFFERENT',
						},
					},
				},
			});

			expect(responseData).toEqual({ workflowData: [[{ json: event }]] });
		});
	});
});
