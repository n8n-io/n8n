import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { sentryIoApiRequest } from '../GenericFunctions';

describe('SentryIo GenericFunctions', () => {
	const mockExecuteFunctions = mockDeep<IExecuteFunctions>();

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe('sentryIoApiRequest', () => {
		it('should use sentryIoOAuth2Api credentials', async () => {
			mockExecuteFunctions.getNodeParameter.mockReturnValue('oAuth2');

			await sentryIoApiRequest.call(mockExecuteFunctions, 'GET', '/test');

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

			await sentryIoApiRequest.call(mockExecuteFunctions, 'GET', '/test');

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

			await sentryIoApiRequest.call(mockExecuteFunctions, 'GET', '/test');

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

			await sentryIoApiRequest.call(mockExecuteFunctions, 'GET', '/test');

			expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledWith(
				expect.objectContaining({
					headers: { Authorization: 'Bearer test-token' },
					uri: 'https://test.com/test',
				}),
			);
		});
	});
});
