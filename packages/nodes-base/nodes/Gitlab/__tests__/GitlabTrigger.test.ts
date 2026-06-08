import type { IDataObject, IWebhookFunctions } from 'n8n-workflow';

import { GitlabTrigger } from '../GitlabTrigger.node';

jest.mock('../GitlabTriggerHelpers', () => ({
	generateWebhookSecret: jest.fn(() => 'generated-secret'),
	verifySignature: jest.fn(),
}));

import { verifySignature } from '../GitlabTriggerHelpers';

describe('GitlabTrigger', () => {
	let trigger: GitlabTrigger;
	let mockWebhookFunctions: Partial<IWebhookFunctions>;
	let mockResponse: { status: jest.Mock; send: jest.Mock; end: jest.Mock };

	beforeEach(() => {
		trigger = new GitlabTrigger();
		mockResponse = {
			status: jest.fn().mockReturnThis(),
			send: jest.fn().mockReturnThis(),
			end: jest.fn().mockReturnThis(),
		};

		mockWebhookFunctions = {
			getBodyData: jest.fn().mockReturnValue({}),
			getHeaderData: jest.fn().mockReturnValue({}),
			getQueryData: jest.fn().mockReturnValue({}),
			getResponseObject: jest.fn().mockReturnValue(mockResponse),
			helpers: {
				returnJsonArray: jest.fn((data) => data),
			} as unknown as IWebhookFunctions['helpers'],
		};

		(verifySignature as jest.Mock).mockReturnValue(true);
	});

	describe('webhook', () => {
		it('should return 401 when verification fails', async () => {
			(verifySignature as jest.Mock).mockReturnValue(false);

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

			(mockWebhookFunctions.getBodyData as jest.Mock).mockReturnValue(bodyData);
			(mockWebhookFunctions.getHeaderData as jest.Mock).mockReturnValue(headerData);
			(mockWebhookFunctions.getQueryData as jest.Mock).mockReturnValue(queryData);

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
			(verifySignature as jest.Mock).mockReturnValue(true);

			const bodyData: IDataObject = { object_kind: 'push' };
			(mockWebhookFunctions.getBodyData as jest.Mock).mockReturnValue(bodyData);

			const result = await trigger.webhook.call(mockWebhookFunctions as IWebhookFunctions);

			expect(result.workflowData).toBeDefined();
			expect(mockResponse.status).not.toHaveBeenCalled();
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
