import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions, INode, IRequestOptions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { LINKEDIN_API_VERSION, linkedInApiRequest } from '../GenericFunctions';

describe('LinkedIn GenericFunctions', () => {
	const mockExecuteFunctions = mockDeep<IExecuteFunctions>();

	const mockNode: INode = {
		id: 'test-node-id',
		name: 'LinkedIn',
		type: 'n8n-nodes-base.linkedIn',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};

	beforeEach(() => {
		vi.resetAllMocks();
		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.getNodeParameter.mockReturnValue('standard');
		mockExecuteFunctions.helpers.requestOAuth2.mockResolvedValue({
			statusCode: 200,
			headers: {},
			body: { id: 'ok' },
		});
	});

	const requestOptions = (): IRequestOptions =>
		mockExecuteFunctions.helpers.requestOAuth2.mock.calls[0][1] as IRequestOptions;

	describe('linkedInApiRequest', () => {
		it('should send the current LinkedIn-Version header', async () => {
			await linkedInApiRequest.call(mockExecuteFunctions, 'POST', '/posts', { commentary: 'hi' });

			expect(LINKEDIN_API_VERSION).toBe('202609');
			expect(requestOptions().headers).toEqual(
				expect.objectContaining({
					Accept: 'application/json',
					'X-Restli-Protocol-Version': '2.0.0',
					'LinkedIn-Version': '202609',
				}),
			);
		});

		it('should use standard OAuth2 credentials', async () => {
			await linkedInApiRequest.call(mockExecuteFunctions, 'GET', '/posts', {});

			expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledWith(
				'linkedInOAuth2Api',
				expect.any(Object),
				{ tokenType: 'Bearer' },
			);
		});

		it('should use community management OAuth2 credentials', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('communityManagement');

			await linkedInApiRequest.call(mockExecuteFunctions, 'GET', '/posts', {});

			expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledWith(
				'linkedInCommunityManagementOAuth2Api',
				expect.any(Object),
				{ tokenType: 'Bearer' },
			);
		});

		it('should call the versioned REST posts endpoint', async () => {
			await linkedInApiRequest.call(mockExecuteFunctions, 'POST', '/posts', { commentary: 'hi' });

			expect(requestOptions().url).toBe('https://api.linkedin.com/rest/posts');
		});

		it('should keep v2 profile endpoints on the unversioned path', async () => {
			await linkedInApiRequest.call(mockExecuteFunctions, 'GET', '/v2/me', {});

			expect(requestOptions().url).toBe('https://api.linkedin.com/v2/me');
		});

		it('should return the Rest.li entity URN from a 201 response', async () => {
			mockExecuteFunctions.helpers.requestOAuth2.mockResolvedValue({
				statusCode: 201,
				headers: { 'x-restli-id': 'urn:li:share:123' },
				body: {},
			});

			const result = await linkedInApiRequest.call(mockExecuteFunctions, 'POST', '/posts', {
				commentary: 'hi',
			});

			expect(result).toEqual({ urn: 'urn:li:share:123' });
		});

		it('should omit an empty request body', async () => {
			await linkedInApiRequest.call(mockExecuteFunctions, 'GET', '/v2/me', {});

			expect(requestOptions()).not.toHaveProperty('body');
		});

		it('should wrap request failures in NodeApiError', async () => {
			mockExecuteFunctions.helpers.requestOAuth2.mockRejectedValue(new Error('API Error'));

			await expect(
				linkedInApiRequest.call(mockExecuteFunctions, 'GET', '/posts', {}),
			).rejects.toThrow(NodeApiError);
		});
	});
});
