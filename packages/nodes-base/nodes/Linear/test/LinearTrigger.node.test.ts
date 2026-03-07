import type { IHookFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { linearApiRequest } from '../GenericFunctions';

describe('Linear -> LinearTrigger.node', () => {
	const mockHttpRequestWithAuthentication = jest.fn();

	describe('webhook creation error handling', () => {
		let mockHookFunctions: IHookFunctions;

		beforeEach(() => {
			mockHookFunctions = {
				getNodeParameter: jest.fn().mockReturnValue('apiToken'),
				helpers: {
					httpRequestWithAuthentication: mockHttpRequestWithAuthentication,
				},
				getNode: jest.fn().mockReturnValue({ name: 'Linear Trigger', type: 'n8n-nodes-base.linearTrigger' }),
			} as unknown as IHookFunctions;
			jest.clearAllMocks();
		});

		it('should throw error that clearly mentions Linear when webhook creation fails due to admin permission', async () => {
			// Simulate Linear API error response for insufficient permissions
			const linearErrorResponse = {
				errors: [
					{
						message: 'Invalid role: admin required',
						extensions: {
							userPresentableMessage: 'You need to have the "Admin" scope to create webhooks.',
						},
					},
				],
			};

			mockHttpRequestWithAuthentication.mockResolvedValue(linearErrorResponse);

			const webhookCreateBody = {
				query: `
					mutation webhookCreate($url: String!, $teamId: String!, $resources: [String!]!) {
						webhookCreate(
							input: {
								url: $url
								teamId: $teamId
								resourceTypes: $resources
							}
						) {
							success
							webhook {
								id
								enabled
							}
						}
					}`,
				variables: {
					url: 'http://example.com/webhook',
					teamId: 'team-123',
					resources: ['Issue', 'Comment'],
				},
			};

			try {
				await linearApiRequest.call(mockHookFunctions, webhookCreateBody);
				fail('Expected error to be thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(NodeApiError);
				// The error message should clearly mention Linear to avoid confusion with n8n permissions
				expect(error.message).toMatch(/linear/i);
				// Should include information about admin requirement
				expect(error.message.toLowerCase()).toContain('admin');
			}
		});

		it('should preserve userPresentableMessage in error description', async () => {
			const linearErrorResponse = {
				errors: [
					{
						message: 'Invalid role: admin required',
						extensions: {
							userPresentableMessage: 'You need to have the "Admin" scope to create webhooks.',
						},
					},
				],
			};

			mockHttpRequestWithAuthentication.mockResolvedValue(linearErrorResponse);

			try {
				await linearApiRequest.call(mockHookFunctions, {});
				fail('Expected error to be thrown');
			} catch (error) {
				expect(error).toBeInstanceOf(NodeApiError);
				expect(error.description).toContain('Admin');
				expect(error.description).toContain('webhooks');
			}
		});
	});
});
