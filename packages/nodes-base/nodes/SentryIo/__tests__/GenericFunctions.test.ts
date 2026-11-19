import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { sentryIoApiRequest } from '../GenericFunctions';

describe('SentryIo GenericFunctions', () => {
	const mockExecuteFunctions = mockDeep<IExecuteFunctions>();

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('sentryIoApiRequest', () => {
		it('should use sentryIoOAuth2Api credentials', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('oAuth2');

			await sentryIoApiRequest.call(mockExecuteFunctions, 'GET', requestPath`/test`);

			expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledWith(
				'sentryIoOAuth2Api',
				expect.any(Object),
			);
		});

		it('should use sentryIoApi credentials', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('accessToken');
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				token: 'test-token',
			});

			await sentryIoApiRequest.call(mockExecuteFunctions, 'GET', requestPath`/test`);

			expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledWith(
				expect.objectContaining({
					headers: { Authorization: 'Bearer test-token' },
				}),
			);
		});

		it('should use sentryIoServerApi credentials', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('accessTokenServer');
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				token: 'test-token',
			});

			await sentryIoApiRequest.call(mockExecuteFunctions, 'GET', requestPath`/test`);

			expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledWith(
				expect.objectContaining({
					headers: { Authorization: 'Bearer test-token' },
				}),
			);
		});

		it('should use custom URL from sentryIoServerApi credentials', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('accessTokenServer');
			mockExecuteFunctions.getCredentials.mockResolvedValue({
				token: 'test-token',
				url: 'https://test.com',
			});

			await sentryIoApiRequest.call(mockExecuteFunctions, 'GET', requestPath`/test`);

			expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledWith(
				expect.objectContaining({
					headers: { Authorization: 'Bearer test-token' },
					uri: expect.objectContaining({ value: 'https://test.com/test' }),
				}),
			);
		});

		it('should encode path values in the request URL', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('accessToken');
			mockExecuteFunctions.getCredentials.mockResolvedValue({ token: 'test-token' });

			const issueId = '1170820242/?x=1';
			await sentryIoApiRequest.call(
				mockExecuteFunctions,
				'GET',
				requestPath`/api/0/issues/${issueId}/`,
			);

			expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledWith(
				expect.objectContaining({
					uri: expect.objectContaining({
						value: 'https://sentry.io/api/0/issues/1170820242%2F%3Fx=1/',
					}),
				}),
			);
		});
	});
});
