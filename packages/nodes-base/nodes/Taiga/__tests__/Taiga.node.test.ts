import type { IHookFunctions, IHttpRequestMethods, IRequestOptions } from 'n8n-workflow';
import * as utils from '../GenericFunctions';
import { Taiga } from '../Taiga.node';

// Mock the module
jest.mock('../GenericFunctions', () => {
	const actual = jest.requireActual('../GenericFunctions');
	return {
		...actual,
		getAuthorization: jest.fn().mockResolvedValue('fake-auth-token'),
	};
});

describe('Test Taiga Node', () => {
	describe('taigaApiRequest', () => {
		let node: Taiga;
		let mockNodeFunctions: IHookFunctions;

		beforeEach(() => {
			node = new Taiga();

			mockNodeFunctions = {
				getCredentials: jest.fn(),
				getNode: jest.fn().mockReturnValue({ name: 'Taiga' }),
				helpers: {
					request: jest.fn().mockResolvedValue({}),
				},
			} as unknown as IHookFunctions;

			// Reset all mocks
			jest.clearAllMocks();
		});

		test('should construct correct URL when credentials have no url field', async () => {
			// Arrange
			const credentials = {
				username: 'testuser',
				password: 'testpass',
				// No url field
			};

			// Override getCredentials mock for this test
			(mockNodeFunctions.getCredentials as jest.Mock).mockResolvedValue(credentials);

			const resource = '/projects';
			const method = 'GET' as IHttpRequestMethods;

			// Act
			await utils.taigaApiRequest.call(mockNodeFunctions, method, resource);

			// Assert
			// getAuthorization makes one call, taigaApiRequest makes another
			const requestMock = mockNodeFunctions.helpers.request as jest.Mock;
			expect(requestMock).toHaveBeenCalledTimes(2);
			// Get the second call (the one from taigaApiRequest)
			const calledOptions: IRequestOptions = requestMock.mock.calls[1][0];

			// The URI should start with the default Taiga API URL, not 'undefined'
			expect(calledOptions.uri).toBeDefined();
			expect(typeof calledOptions.uri).toBe('string');
			expect(calledOptions.uri).toMatch(/^https:\/\/api\.taiga\.io\/api\/v1/);
			expect(calledOptions.uri).not.toMatch(/^undefined/);
			expect(calledOptions.uri).toBe('https://api.taiga.io/api/v1/projects');
		});

		test('should construct correct URL when credentials have url field', async () => {
			// Arrange
			const credentials = {
				username: 'testuser',
				password: 'testpass',
				url: 'https://custom.taiga.instance.com',
			};

			// Override getCredentials mock for this test
			(mockNodeFunctions.getCredentials as jest.Mock).mockResolvedValue(credentials);

			const resource = '/projects';
			const method = 'GET' as IHttpRequestMethods;

			// Act
			await utils.taigaApiRequest.call(mockNodeFunctions, method, resource);

			// Assert
			const requestMock = mockNodeFunctions.helpers.request as jest.Mock;
			expect(requestMock).toHaveBeenCalledTimes(2);
			const calledOptions: IRequestOptions = requestMock.mock.calls[1][0];

			// The URI should use the custom URL
			expect(calledOptions.uri).toBe('https://custom.taiga.instance.com/api/v1/projects');
		});

		test('should use provided uri parameter when specified, when credentials.url is defined', async () => {
			// Arrange
			const credentials = {
				username: 'testuser',
				password: 'testpass',
				url: 'https://custom.taiga.instance.com',
			};

			// Override getCredentials mock for this test
			(mockNodeFunctions.getCredentials as jest.Mock).mockResolvedValue(credentials);

			const resource = '/projects';
			const method = 'GET' as IHttpRequestMethods;
			const customUri = 'https://completely-different.url/api/custom-endpoint';

			// Act
			await utils.taigaApiRequest.call(mockNodeFunctions, method, resource, {}, {}, customUri);

			// Assert
			const requestMock = mockNodeFunctions.helpers.request as jest.Mock;
			expect(requestMock).toHaveBeenCalledTimes(2);
			const calledOptions: IRequestOptions = requestMock.mock.calls[1][0];

			// The URI should use the custom URI parameter, not construct from credentials
			expect(calledOptions.uri).toBe(customUri);
		});

		test('should use provided uri parameter when specified, when credentials.url is undefined', async () => {
			// Arrange
			const credentials = {
				username: 'testuser',
				password: 'testpass',
			};

			// Override getCredentials mock for this test
			(mockNodeFunctions.getCredentials as jest.Mock).mockResolvedValue(credentials);

			const resource = '/projects';
			const method = 'GET' as IHttpRequestMethods;
			const customUri = 'https://completely-different.url/api/custom-endpoint';

			// Act
			await utils.taigaApiRequest.call(mockNodeFunctions, method, resource, {}, {}, customUri);

			// Assert
			const requestMock = mockNodeFunctions.helpers.request as jest.Mock;
			expect(requestMock).toHaveBeenCalledTimes(2);
			const calledOptions: IRequestOptions = requestMock.mock.calls[1][0];

			// The URI should use the custom URI parameter, not construct from credentials
			expect(calledOptions.uri).toBe(customUri);
		});
	});
});
