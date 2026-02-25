import { LinearTrigger } from '../LinearTrigger.node';
import * as GenericFunctions from '../GenericFunctions';
import { NodeApiError } from 'n8n-workflow';

describe('LinearTrigger Node', () => {
	describe('create webhook method', () => {
		let mockThis: any;
		let webhookData: Record<string, any>;

		beforeEach(() => {
			webhookData = {};
			mockThis = {
				getNodeWebhookUrl: () => 'https://example.com/webhook',
				getNodeParameter: jest.fn().mockImplementation((name: string) => {
					if (name === 'teamId') return 'team-123';
					if (name === 'resources') return ['issue'];
					if (name === 'authentication') return 'apiToken';
				}),
				getWorkflowStaticData: () => webhookData,
				getNode: () => ({ name: 'Linear Trigger' }),
				helpers: {
					httpRequestWithAuthentication: jest.fn(),
				},
			};
		});

		it('should throw error with "Linear" mentioned when webhook creation fails due to insufficient permissions', async () => {
			// Mock the API request to fail with insufficient permissions error
			// This simulates a personal access token without admin scope
			const errorResponse = {
				errors: [
					{
						message: 'Insufficient permissions',
						extensions: {
							userPresentableMessage: 'You do not have permission to create webhooks. Admin access is required.',
						},
					},
				],
			};

			jest.spyOn(GenericFunctions, 'linearApiRequest').mockRejectedValueOnce(
				new NodeApiError(
					{ name: 'Linear Trigger', type: 'n8n-nodes-base.linearTrigger', typeVersion: 1 },
					{},
					{
						message: 'Insufficient permissions',
						description: 'You do not have permission to create webhooks. Admin access is required.',
					},
				),
			);

			const trigger = new LinearTrigger();

			try {
				await trigger.webhookMethods.default.create.call(mockThis);
				fail('Expected error to be thrown');
			} catch (error) {
				// The error message should mention "Linear" to make it clear the issue is with Linear API
				// This is the bug - currently the error is cryptic and doesn't mention Linear
				expect(error.message).toMatch(/Linear/i);
				expect(error.description || error.message).toContain('permission');
			}
		});

		it('should throw error with "Linear" mentioned when webhook creation fails with generic API error', async () => {
			// Mock a generic Linear API error
			jest.spyOn(GenericFunctions, 'linearApiRequest').mockRejectedValueOnce(
				new NodeApiError(
					{ name: 'Linear Trigger', type: 'n8n-nodes-base.linearTrigger', typeVersion: 1 },
					{},
					{
						message: 'API request failed',
						description: 'The request to Linear API failed.',
					},
				),
			);

			const trigger = new LinearTrigger();

			try {
				await trigger.webhookMethods.default.create.call(mockThis);
				fail('Expected error to be thrown');
			} catch (error) {
				// The error should clearly indicate it's from Linear
				expect(error.message).toMatch(/Linear/i);
			}
		});
	});

	describe('checkExists webhook method', () => {
		let webhookData: Record<string, any>;
		let mockThis: any;

		beforeEach(() => {
			webhookData = {
				webhookId: '123456',
			};

			mockThis = {
				getWorkflowStaticData: () => webhookData,
				getNodeWebhookUrl: () => 'https://example.com/webhook',
				getNodeParameter: jest.fn().mockImplementation((name: string) => {
					if (name === 'teamId') return 'team-123';
					if (name === 'authentication') return 'apiToken';
				}),
				getNode: () => ({ name: 'Linear Trigger' }),
				helpers: {
					httpRequestWithAuthentication: jest.fn(),
				},
			};
		});

		it('should throw error with "Linear" mentioned when checking webhook fails due to insufficient permissions', async () => {
			jest.spyOn(GenericFunctions, 'linearApiRequest').mockRejectedValueOnce(
				new NodeApiError(
					{ name: 'Linear Trigger', type: 'n8n-nodes-base.linearTrigger', typeVersion: 1 },
					{},
					{
						message: 'Insufficient permissions to list webhooks',
						description: 'You need admin permissions to view webhooks.',
					},
				),
			);

			const trigger = new LinearTrigger();

			try {
				await trigger.webhookMethods.default.checkExists.call(mockThis);
				fail('Expected error to be thrown');
			} catch (error) {
				// Error should clearly mention Linear
				expect(error.message).toMatch(/Linear/i);
			}
		});
	});
});
