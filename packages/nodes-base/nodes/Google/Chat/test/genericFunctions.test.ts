import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import { type IExecuteFunctions, type INode, requestPath } from 'n8n-workflow';

import * as googleHelpers from '../../GenericFunctions';
import { googleApiRequest, resourceNamePath, toResourcePath } from '../GenericFunctions';

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

		const result = await googleApiRequest.call(
			mockExecuteFunctions,
			'POST',
			requestPath`/test-resource`,
			{
				text: 'test',
			},
		);

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
				uri: expect.objectContaining({ value: 'https://chat.googleapis.com/test-resource' }),
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

		const result = await googleApiRequest.call(
			mockExecuteFunctions,
			'GET',
			requestPath`/test-resource`,
		);

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

	it('should call request with the given uri when noCredentials equals true', async () => {
		const result = await googleApiRequest.call(
			mockExecuteFunctions,
			'GET',
			requestPath``,
			{},
			{},
			'https://chat.googleapis.com/v1/spaces/AAAA/messages?key=k&token=t',
			true,
		);

		expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledTimes(1);
		expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledWith({
			headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
			json: true,
			method: 'GET',
			qs: {},
			qsStringifyOptions: { arrayFormat: 'repeat' },
			uri: 'https://chat.googleapis.com/v1/spaces/AAAA/messages?key=k&token=t',
		});
		expect(result).toEqual({ success: true });
	});
});

describe('Test GoogleChat, resource name paths', () => {
	const mockExecuteFunctions = mock<IExecuteFunctions>();
	mockExecuteFunctions.getNode.mockReturnValue(mock<INode>());

	it('should build the path from a resource name with the expected form', () => {
		expect(
			resourceNamePath
				.call(mockExecuteFunctions, 'spaces/AAAA/messages/BBBB.CCCC', 'spaces/*/messages/*', 0)
				.toString(),
		).toBe('/spaces/AAAA/messages/BBBB.CCCC');
	});

	it('should encode characters that are not valid in a path segment', () => {
		expect(
			resourceNamePath.call(mockExecuteFunctions, 'spaces/AA?x=1#y', 'spaces/*', 0).toString(),
		).toBe('/spaces/AA%3Fx=1%23y');
	});

	it.each(['AAAA', 'spaces/', 'spaces/AAAA/messages/BBBB', 'rooms/AAAA', 'spaces/AAAA/../x'])(
		'should reject the space name "%s"',
		(name) => {
			expect(() => resourceNamePath.call(mockExecuteFunctions, name, 'spaces/*', 0)).toThrow(
				`The resource name "${name}" must have the form "spaces/*"`,
			);
		},
	);

	it('should keep each part of a media resource name as a path segment', () => {
		expect(toResourcePath('Clx/abc?d'.split('/')).toString()).toBe('/Clx/abc%3Fd');
	});
});
