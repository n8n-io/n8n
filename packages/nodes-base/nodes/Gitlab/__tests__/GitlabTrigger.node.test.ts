import type { IHookFunctions } from 'n8n-workflow';

import { gitlabApiRequest } from '../GenericFunctions';
import { GitlabTrigger } from '../GitlabTrigger.node';

jest.mock('../GenericFunctions', () => ({
	gitlabApiRequest: jest.fn(),
}));

const mockedGitlabApiRequest = jest.mocked(gitlabApiRequest);

describe('GitlabTrigger Node - Issue #24678 Fix', () => {
	let node: GitlabTrigger;
	let mockHookFunctions: IHookFunctions;
	let webhookStaticData: Record<string, unknown>;

	beforeEach(() => {
		node = new GitlabTrigger();
		webhookStaticData = {};

		mockHookFunctions = {
			getNodeWebhookUrl: jest.fn().mockReturnValue('https://webhook.url/test'),
			getWorkflow: jest.fn().mockReturnValue({ id: 'test-workflow-id' }),
			getNodeParameter: jest.fn().mockImplementation((param: string) => {
				if (param === 'owner') return 'test-owner';
				if (param === 'repository') return 'test-repo';
				if (param === 'events') return ['push', 'issues'];
				return undefined;
			}),
			getCredentials: jest.fn(),
			getWorkflowStaticData: jest.fn().mockReturnValue(webhookStaticData),
			getNode: jest.fn().mockReturnValue({ name: 'GitlabTrigger' }),
			getWebhookName: jest.fn().mockReturnValue('default'),
			getContext: jest.fn(),
			getActivationMode: jest.fn(),
			getMode: jest.fn(),
			getNodeExecutionData: jest.fn(),
			getRestApiUrl: jest.fn(),
			getTimezone: jest.fn(),
			helpers: {} as any,
		} as unknown as IHookFunctions;

		mockedGitlabApiRequest.mockClear();
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('checkExists - Basic Functionality', () => {
		it('should return false when webhookId is not set', async () => {
			const result = await node.webhookMethods.default.checkExists.call(mockHookFunctions);

			expect(result).toBe(false);
			expect(mockedGitlabApiRequest).not.toHaveBeenCalled();
		});

		it('should return true when webhook exists in GitLab', async () => {
			webhookStaticData.webhookId = '12345';
			mockedGitlabApiRequest.mockResolvedValue({ id: 12345, url: 'https://webhook.url/test' });

			const result = await node.webhookMethods.default.checkExists.call(mockHookFunctions);

			expect(result).toBe(true);
			expect(mockedGitlabApiRequest).toHaveBeenCalledWith(
				'GET',
				'/projects/test-owner%2Ftest-repo/hooks/12345',
				{},
			);
		});
	});

	describe('checkExists - Error Handling (THE FIX for #24678)', () => {
		it('should handle error with httpCode property (standard format)', async () => {
			webhookStaticData.webhookId = '12345';
			webhookStaticData.webhookEvents = ['push'];

			// This is the error format that works with your fix
			const error404 = new Error('Not found');
			(error404 as any).httpCode = '404';
			mockedGitlabApiRequest.mockRejectedValue(error404);

			// Should NOT crash (this was crashing before your fix)
			const result = await node.webhookMethods.default.checkExists.call(mockHookFunctions);

			expect(result).toBe(false);
			expect(webhookStaticData.webhookId).toBeUndefined();
			expect(webhookStaticData.webhookEvents).toBeUndefined();
		});

		it('should handle error with 404 in message property', async () => {
			webhookStaticData.webhookId = '12345';
			webhookStaticData.webhookEvents = ['push'];

			// Error with 404 in message (your fix uses message instead of description)
			const error404 = new Error('Resource not found: 404');
			mockedGitlabApiRequest.mockRejectedValue(error404);

			// Should NOT crash
			const result = await node.webhookMethods.default.checkExists.call(mockHookFunctions);

			expect(result).toBe(false);
			expect(webhookStaticData.webhookId).toBeUndefined();
			expect(webhookStaticData.webhookEvents).toBeUndefined();
		});

		it('CRITICAL: should NOT crash when error has no httpCode property', async () => {
			webhookStaticData.webhookId = '12345';

			// This is what was causing the crash in #24678
			// Error object with NO httpCode, NO cause, NO description
			const plainError = new Error('Some error from GitLab');
			mockedGitlabApiRequest.mockRejectedValue(plainError);

			// BEFORE FIX: Would crash with "Cannot read properties of undefined"
			// AFTER FIX: Should throw the error properly
			await expect(node.webhookMethods.default.checkExists.call(mockHookFunctions)).rejects.toThrow(
				'Some error from GitLab',
			);
		});

		it('CRITICAL: should NOT crash when error.cause.httpCode was expected (old code)', async () => {
			webhookStaticData.webhookId = '12345';

			// The OLD code was trying to access error.cause.httpCode
			// If error.cause doesn't exist, it would crash
			const errorWithoutCause = new Error('Network error');
			// Explicitly no 'cause' property
			mockedGitlabApiRequest.mockRejectedValue(errorWithoutCause);

			// BEFORE FIX: Would crash accessing error.cause.httpCode
			// AFTER FIX: Should handle gracefully
			await expect(node.webhookMethods.default.checkExists.call(mockHookFunctions)).rejects.toThrow(
				'Network error',
			);
		});

		it('CRITICAL: should NOT crash when error.description was expected (old code)', async () => {
			webhookStaticData.webhookId = '12345';

			// The OLD code was trying to access error.description
			// Standard JS errors don't have 'description', only 'message'
			const standardError = new Error('Standard error without description');
			mockedGitlabApiRequest.mockRejectedValue(standardError);

			// BEFORE FIX: Would crash or not find 404 in description
			// AFTER FIX: Checks message property with optional chaining
			await expect(node.webhookMethods.default.checkExists.call(mockHookFunctions)).rejects.toThrow(
				'Standard error without description',
			);
		});

		it('should handle error with undefined message gracefully', async () => {
			webhookStaticData.webhookId = '12345';

			// Edge case: Error with no message at all
			const errorNoMessage = new Error();
			delete (errorNoMessage as any).message; // Force undefined
			mockedGitlabApiRequest.mockRejectedValue(errorNoMessage);

			// Should NOT crash due to optional chaining (?.)
			await expect(
				node.webhookMethods.default.checkExists.call(mockHookFunctions),
			).rejects.toThrow();
		});

		it('should throw non-404 errors normally', async () => {
			webhookStaticData.webhookId = '12345';

			const error500 = new Error('Internal server error');
			(error500 as any).httpCode = '500';
			mockedGitlabApiRequest.mockRejectedValue(error500);

			// Should throw the error, not return false
			await expect(node.webhookMethods.default.checkExists.call(mockHookFunctions)).rejects.toThrow(
				'Internal server error',
			);
		});

		it('should handle null error gracefully', async () => {
			webhookStaticData.webhookId = '12345';

			// Weird edge case but possible
			mockedGitlabApiRequest.mockRejectedValue(null);

			await expect(node.webhookMethods.default.checkExists.call(mockHookFunctions)).rejects.toBe(
				null,
			);
		});
	});

	describe('create - Webhook Creation', () => {
		it('should create a webhook with correct parameters', async () => {
			mockedGitlabApiRequest.mockResolvedValue({ id: 67890 });

			const result = await node.webhookMethods.default.create.call(mockHookFunctions);

			expect(result).toBe(true);
			expect(mockedGitlabApiRequest).toHaveBeenCalledWith(
				'POST',
				'/projects/test-owner%2Ftest-repo/hooks',
				expect.objectContaining({
					url: 'https://webhook.url/test',
					push_events: true,
					issues_events: true,
					enable_ssl_verification: false,
				}),
			);
			expect(webhookStaticData.webhookId).toBe(67890);
			expect(webhookStaticData.webhookEvents).toEqual(['push', 'issues']);
		});

		it('should expand wildcard event to all GitLab events', async () => {
			(mockHookFunctions.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'owner') return 'test-owner';
				if (param === 'repository') return 'test-repo';
				if (param === 'events') return ['*'];
				return undefined;
			});

			mockedGitlabApiRequest.mockResolvedValue({ id: 67890 });

			await node.webhookMethods.default.create.call(mockHookFunctions);

			const callArgs = mockedGitlabApiRequest.mock.calls[0];
			const requestBody = callArgs[2] as Record<string, boolean | string>;

			// Should have all GitLab events enabled
			expect(requestBody.note_events).toBe(true);
			expect(requestBody.push_events).toBe(true);
			expect(requestBody.issues_events).toBe(true);
			expect(requestBody.merge_requests_events).toBe(true);
		});
	});

	describe('delete - Webhook Deletion', () => {
		it('should delete webhook when webhookId exists', async () => {
			webhookStaticData.webhookId = '12345';
			webhookStaticData.webhookEvents = ['push'];
			mockedGitlabApiRequest.mockResolvedValue({});

			const result = await node.webhookMethods.default.delete.call(mockHookFunctions);

			expect(result).toBe(true);
			expect(mockedGitlabApiRequest).toHaveBeenCalledWith(
				'DELETE',
				'/projects/test-owner%2Ftest-repo/hooks/12345',
				{},
			);
			expect(webhookStaticData.webhookId).toBeUndefined();
			expect(webhookStaticData.webhookEvents).toBeUndefined();
		});

		it('should return true when webhookId does not exist', async () => {
			const result = await node.webhookMethods.default.delete.call(mockHookFunctions);

			expect(result).toBe(true);
			expect(mockedGitlabApiRequest).not.toHaveBeenCalled();
		});

		it('should return false when delete API call fails', async () => {
			webhookStaticData.webhookId = '12345';
			mockedGitlabApiRequest.mockRejectedValue(new Error('Delete failed'));

			const result = await node.webhookMethods.default.delete.call(mockHookFunctions);

			expect(result).toBe(false);
		});
	});

	describe('INTEGRATION TEST: Multiple GitLab Triggers Scenario (Issue #24678)', () => {
		it('should handle multiple webhook checks without crashing', async () => {
			// Simulate creating a workflow with 3 GitLab triggers
			const trigger1Data: Record<string, unknown> = {};
			const trigger2Data: Record<string, unknown> = {};
			const trigger3Data: Record<string, unknown> = {};

			const createMockHookFunctions = (data: Record<string, unknown>) => ({
				...mockHookFunctions,
				getWorkflowStaticData: jest.fn().mockReturnValue(data),
			});

			const hookFunctions1 = createMockHookFunctions(trigger1Data);
			const hookFunctions2 = createMockHookFunctions(trigger2Data);
			const hookFunctions3 = createMockHookFunctions(trigger3Data);

			// Trigger 1: Successfully creates webhook
			mockedGitlabApiRequest.mockResolvedValueOnce({ id: 111 });
			const create1 = await node.webhookMethods.default.create.call(hookFunctions1);
			expect(create1).toBe(true);
			expect(trigger1Data.webhookId).toBe(111);

			// Trigger 2: Checks if exists, but gets error WITHOUT httpCode
			trigger2Data.webhookId = '222';
			const malformedError = new Error('Unexpected error from GitLab');
			// This error has NO httpCode, NO cause - just a plain Error
			mockedGitlabApiRequest.mockRejectedValueOnce(malformedError);

			// BEFORE FIX: This would crash with "Cannot read properties of undefined"
			// AFTER FIX: Should throw the error properly
			await expect(node.webhookMethods.default.checkExists.call(hookFunctions2)).rejects.toThrow(
				'Unexpected error from GitLab',
			);

			// Trigger 3: Gets 404 error
			trigger3Data.webhookId = '333';
			trigger3Data.webhookEvents = ['push'];
			const error404 = new Error('Not found');
			(error404 as any).httpCode = '404';
			mockedGitlabApiRequest.mockRejectedValueOnce(error404);

			// Should handle 404 gracefully and return false
			const check3 = await node.webhookMethods.default.checkExists.call(hookFunctions3);
			expect(check3).toBe(false);
			expect(trigger3Data.webhookId).toBeUndefined();
		});

		it('should handle rapid sequential webhook operations without state corruption', async () => {
			// Create 5 triggers rapidly
			const triggers = Array.from({ length: 5 }, () => ({}));
			const hookFunctionsArray = triggers.map((data) => ({
				...mockHookFunctions,
				getWorkflowStaticData: jest.fn().mockReturnValue(data),
			}));

			// Mock successful creation for all
			let idCounter = 1;
			mockedGitlabApiRequest.mockImplementation(() => Promise.resolve({ id: idCounter++ }));

			// Create all webhooks
			const results = await Promise.all(
				hookFunctionsArray.map((hf) => node.webhookMethods.default.create.call(hf)),
			);

			// All should succeed
			expect(results.every((r) => r === true)).toBe(true);

			// All should have unique webhook IDs
			const webhookIds = triggers.map((t) => (t as any).webhookId);
			const uniqueIds = new Set(webhookIds);
			expect(uniqueIds.size).toBe(5);
			expect(webhookIds).toEqual([1, 2, 3, 4, 5]);
		});
	});

	describe('REGRESSION TESTS: Ensure old functionality still works', () => {
		it('should handle rapid sequential webhook operations without state corruption', async () => {
			// Create 5 triggers rapidly
			const triggers = Array.from({ length: 5 }, () => ({}));
			const hookFunctionsArray = triggers.map((data) => ({
				...mockHookFunctions,
				getWorkflowStaticData: jest.fn().mockReturnValue(data),
			}));

			// Use counter for guaranteed unique IDs
			let idCounter = 1000;
			mockedGitlabApiRequest.mockImplementation(() => {
				const id = idCounter++;
				return Promise.resolve({ id });
			});

			// Create all webhooks
			const results = await Promise.all(
				hookFunctionsArray.map((hf) => node.webhookMethods.default.create.call(hf)),
			);

			// All should succeed
			expect(results.every((r) => r === true)).toBe(true);

			// All should have unique webhook IDs
			const webhookIds = triggers.map((t) => (t as any).webhookId);
			const uniqueIds = new Set(webhookIds);
			expect(uniqueIds.size).toBe(5);

			// Verify the actual IDs
			expect(webhookIds).toEqual([1000, 1001, 1002, 1003, 1004]);
		});
	});
});
