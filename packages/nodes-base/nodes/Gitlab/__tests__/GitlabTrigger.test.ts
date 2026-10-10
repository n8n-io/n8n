import type { IDataObject, IWebhookFunctions } from 'n8n-workflow';

import { GitlabTrigger } from '../GitlabTrigger.node';

vi.mock('../GitlabTriggerHelpers', () => ({
	generateWebhookSecret: vi.fn(() => 'generated-secret'),
	verifySignature: vi.fn(),
}));

import { verifySignature } from '../GitlabTriggerHelpers';
import type { Mock } from 'vitest';

describe('GitlabTrigger', () => {
	let trigger: GitlabTrigger;
	let mockWebhookFunctions: Partial<IWebhookFunctions>;
	let mockResponse: { status: Mock; send: Mock; end: Mock };

	beforeEach(() => {
		trigger = new GitlabTrigger();
		mockResponse = {
			status: vi.fn().mockReturnThis(),
			send: vi.fn().mockReturnThis(),
			end: vi.fn().mockReturnThis(),
		};

		mockWebhookFunctions = {
			getBodyData: vi.fn().mockReturnValue({}),
			getHeaderData: vi.fn().mockReturnValue({}),
			getQueryData: vi.fn().mockReturnValue({}),
			getResponseObject: vi.fn().mockReturnValue(mockResponse),
			helpers: {
				returnJsonArray: vi.fn((data) => data),
			} as unknown as IWebhookFunctions['helpers'],
		};

		(verifySignature as Mock).mockReturnValue(true);
	});

	describe('webhook', () => {
		it('should return 401 when verification fails', async () => {
			(verifySignature as Mock).mockReturnValue(false);

			const result = await trigger.webhook.call(mockWebhookFunctions as IWebhookFunctions);

			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.send).toHaveBeenCalledWith('Unauthorized');
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('should trigger workflow when verification succeeds', async () => {
			const bodyData: IDataObject = {
				object_kind: 'push',
				project: { id: 1 },
			};
			const headerData = { 'x-gitlab-event': 'Push Hook' };
			const queryData = {};

			(mockWebhookFunctions.getBodyData as Mock).mockReturnValue(bodyData);
			(mockWebhookFunctions.getHeaderData as Mock).mockReturnValue(headerData);
			(mockWebhookFunctions.getQueryData as Mock).mockReturnValue(queryData);

			const result = await trigger.webhook.call(mockWebhookFunctions as IWebhookFunctions);

			expect(result.workflowData).toBeDefined();
			expect(mockWebhookFunctions.helpers!.returnJsonArray).toHaveBeenCalledWith([
				{
					body: bodyData,
					headers: headerData,
					query: queryData,
				},
			]);
		});

		it('should trigger workflow when no secret is stored (backward compatibility)', async () => {
			// verifySignature returns true via skipIfNoExpectedSignature when secret is missing
			(verifySignature as Mock).mockReturnValue(true);

			const bodyData: IDataObject = { object_kind: 'push' };
			(mockWebhookFunctions.getBodyData as Mock).mockReturnValue(bodyData);

			const result = await trigger.webhook.call(mockWebhookFunctions as IWebhookFunctions);

			expect(result.workflowData).toBeDefined();
			expect(mockResponse.status).not.toHaveBeenCalled();
		});
	});

	describe('webhookMethods.default.checkExists', () => {
		it('should return false if no webhookId is stored', async () => {
			const staticData: IDataObject = {};
			const mockHookFunctions = {
				getWorkflowStaticData: vi.fn().mockReturnValue(staticData),
			};

			const checkExists = trigger.webhookMethods.default.checkExists;
			const exists = await checkExists.call(mockHookFunctions as any);

			expect(exists).toBe(false);
		});

		it('should handle 404 with error.httpCode without throwing TypeError on missing description', async () => {
			const staticData: IDataObject = {
				webhookId: '12345',
				webhookEvents: ['push_events'],
				webhookSecret: 'secret123',
			};

			const mockHookFunctions = {
				getWorkflowStaticData: vi.fn().mockReturnValue(staticData),
				getNodeParameter: vi.fn((paramName: string) => {
					if (paramName === 'owner') return 'my-org';
					if (paramName === 'repository') return 'my-repo';
					return '';
				}),
				helpers: {
					httpRequest: vi.fn().mockRejectedValue({
						httpCode: '404',
						// description is deliberately undefined
					}),
				},
			};

			const checkExists = trigger.webhookMethods.default.checkExists;
			const exists = await checkExists.call(mockHookFunctions as any);

			expect(exists).toBe(false);
			expect(staticData.webhookId).toBeUndefined();
			expect(staticData.webhookEvents).toBeUndefined();
			expect(staticData.webhookSecret).toBeUndefined();
		});

		it('should propagate non-404 errors unchanged even if description is undefined', async () => {
			const staticData: IDataObject = {
				webhookId: '12345',
			};

			const serverError = {
				httpCode: '500',
				message: 'Internal Server Error',
			};

			const mockHookFunctions = {
				getWorkflowStaticData: vi.fn().mockReturnValue(staticData),
				getNodeParameter: vi.fn().mockReturnValue('repo'),
				helpers: {
					httpRequest: vi.fn().mockRejectedValue(serverError),
				},
			};

			const checkExists = trigger.webhookMethods.default.checkExists;
			await expect(checkExists.call(mockHookFunctions as any)).rejects.toEqual(serverError);
		});
	});

	describe('description', () => {
		it('should have correct node metadata', () => {
			expect(trigger.description.displayName).toBe('GitLab Trigger');
			expect(trigger.description.name).toBe('gitlabTrigger');
			expect(trigger.description.group).toContain('trigger');
		});
	});
});

