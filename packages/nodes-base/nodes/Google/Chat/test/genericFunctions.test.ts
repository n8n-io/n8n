import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import { type IExecuteFunctions } from 'n8n-workflow';

import * as googleHelpers from '../../GenericFunctions';
import { googleApiRequest } from '../GenericFunctions';

jest.mock('../../GenericFunctions', () => ({
	...jest.requireActual('../../GenericFunctions'),
	getGoogleAccessToken: jest.fn().mockResolvedValue({ access_token: 'mock-access-token' }),
}));

describe('Test GoogleChat, googleApiRequest', () => {
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		mockExecuteFunctions = mock<IExecuteFunctions>();

		mockExecuteFunctions.helpers = {
			requestWithAuthentication: jest.fn().mockResolvedValue({}),
			request: jest.fn().mockResolvedValue({}),
		} as any;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should call requestWithAuthentication when authentication set to OAuth2', async () => {
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('oAuth2'); // authentication

		const result = await googleApiRequest.call(mockExecuteFunctions, 'POST', '/test-resource', {
			text: 'test',
		});

		expect(result).toEqual({ success: true });

		expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledTimes(1);
		expect(mockExecuteFunctions.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'googleChatOAuth2Api',
			{
				body: { text: 'test' },
				headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
				json: true,
				method: 'POST',
				qs: {},
				qsStringifyOptions: { arrayFormat: 'repeat' },
				uri: 'https://chat.googleapis.com/test-resource',
			},
		);
	});

	it('should call request when authentication set to serviceAccount', async () => {
		const mockCredentials = {
			email: 'test@example.com',
			privateKey: 'private-key',
		};

		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('serviceAccount');
		mockExecuteFunctions.getCredentials.mockResolvedValueOnce(mockCredentials);

		const result = await googleApiRequest.call(mockExecuteFunctions, 'GET', '/test-resource');

		expect(googleHelpers.getGoogleAccessToken).toHaveBeenCalledWith(mockCredentials, 'chat');
		expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: 'Bearer mock-access-token',
				}),
			}),
		);
		expect(result).toEqual({ success: true });
	});

	it('should call request when noCredentials equals true', async () => {
		const result = await googleApiRequest.call(
			mockExecuteFunctions,
			'GET',
			'/test-resource',
			{},
			{},
			undefined,
			true,
		);

		expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledTimes(1);
		expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledWith({
			headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
			json: true,
			method: 'GET',
			qs: {},
			qsStringifyOptions: { arrayFormat: 'repeat' },
			uri: 'https://chat.googleapis.com/test-resource',
		});
		expect(result).toEqual({ success: true });
	});
});
