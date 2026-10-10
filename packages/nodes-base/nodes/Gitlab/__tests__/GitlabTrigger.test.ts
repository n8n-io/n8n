import type { IDataObject, IWebhookFunctions } from 'n8n-workflow';

import { GitlabTrigger } from '../GitlabTrigger.node';

vi.mock('../GitlabTriggerHelpers', () => ({
	generateWebhookSecret: vi.fn(() => 'generated-secret'),
	verifySignature: vi.fn(),
}));

vi.mock('../GenericFunctions', () => ({
	gitlabApiRequest: vi.fn(),
}));

import { gitlabApiRequest } from '../GenericFunctions';
import { verifySignature } from '../GitlabTriggerHelpers';
import { NodeApiError } from 'n8n-workflow';
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
		let mockHookFunctions: Partial<IWebhookFunctions>;

		const staticData = (webhookId: unknown) => ({
			getWorkflowStaticData: vi.fn().mockReturnValue({ webhookId }),
			getNodeParameter: vi.fn((name: string) => (name === 'owner' ? 'some-owner' : 'some-repo')),
		});

		beforeEach(() => {
			(gitlabApiRequest as Mock).mockReset();
		});

		it('should return false when no webhook id is stored', async () => {
			mockHookFunctions = staticData(undefined) as unknown as Partial<IWebhookFunctions>;

			const result = await trigger.webhookMethods!.default.checkExists.call(
				mockHookFunctions as never,
			);

			expect(result).toBe(false);
			expect(gitlabApiRequest).not.toHaveBeenCalled();
		});

		it('should return true when the API confirms the webhook', async () => {
			mockHookFunctions = staticData(42) as unknown as Partial<IWebhookFunctions>;
			(gitlabApiRequest as Mock).mockResolvedValue({ id: 42 });

			const result = await trigger.webhookMethods!.default.checkExists.call(
				mockHookFunctions as never,
			);

			expect(result).toBe(true);
			expect(gitlabApiRequest).toHaveBeenCalledWith(
				'GET',
				'/projects/some-owner%2Fsome-repo/hooks/42',
				{},
			);
		});

		it('should return false and clear static data when the webhook is gone (404 via httpCode)', async () => {
			mockHookFunctions = staticData(42) as unknown as Partial<IWebhookFunctions>;
			const error = new NodeApiError({} as never, {}, { httpCode: '404' });
			(gitlabApiRequest as Mock).mockRejectedValue(error);

			const result = await trigger.webhookMethods!.default.checkExists.call(
				mockHookFunctions as never,
			);

			expect(result).toBe(false);
			const data = mockHookFunctions.getWorkflowStaticData!('node') as IDataObject;
			expect(data.webhookId).toBeUndefined();
			expect(data.webhookEvents).toBeUndefined();
			expect(data.webhookSecret).toBeUndefined();
		});

		it('should not crash when a 404-shaped error has no description', async () => {
			// Regression: the old code read error.cause.httpCode and called
			// error.description.includes('404') unconditionally, which threw
			// TypeError on errors without a description.
			mockHookFunctions = staticData(42) as unknown as Partial<IWebhookFunctions>;
			const error = new NodeApiError({} as never, {}, { httpCode: '404', description: '' });
			(gitlabApiRequest as Mock).mockRejectedValue(error);

			const result = await trigger.webhookMethods!.default.checkExists.call(
				mockHookFunctions as never,
			);

			expect(result).toBe(false);
		});

		it('should rethrow non-404 errors', async () => {
			mockHookFunctions = staticData(42) as unknown as Partial<IWebhookFunctions>;
			const error = new NodeApiError({} as never, {}, { httpCode: '500' });
			(gitlabApiRequest as Mock).mockRejectedValue(error);

			await expect(
				trigger.webhookMethods!.default.checkExists.call(mockHookFunctions as never),
			).rejects.toThrow(error);
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
