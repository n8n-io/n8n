import { apiRequest } from '../../v1/GenericFunctions';

describe('NocoDB v1 GenericFunctions', () => {
	let mockThis: any;

	beforeEach(() => {
		mockThis = {
			getNodeParameter: vi.fn().mockReturnValue('nocoDbApiToken'),
			getCredentials: vi.fn().mockResolvedValue({
				host: 'http://localhost:8080',
				apiKey: 'test-api-key',
			}),
			helpers: {
				requestWithAuthentication: vi.fn().mockResolvedValue({ success: true }),
				request: vi.fn().mockResolvedValue({ success: true }),
			},
			getNode: vi.fn(() => ({ id: 'node1' })),
		};
	});

	describe('apiRequest', () => {
		it('should send credentials to the NocoDB host', async () => {
			await apiRequest.call(mockThis, 'GET', '/api/v1/test', {});

			expect(mockThis.helpers.requestWithAuthentication).toHaveBeenCalledWith('nocoDbApiToken', {
				method: 'GET',
				qs: {},
				uri: 'http://localhost:8080/api/v1/test',
				json: true,
			});
			expect(mockThis.helpers.request).not.toHaveBeenCalled();
		});

		it('should send credentials to a URI override on the NocoDB host without following redirects', async () => {
			await apiRequest.call(mockThis, 'GET', '', {}, {}, 'http://localhost:8080/file.png');

			expect(mockThis.helpers.requestWithAuthentication).toHaveBeenCalledWith('nocoDbApiToken', {
				method: 'GET',
				qs: {},
				uri: 'http://localhost:8080/file.png',
				json: true,
				followRedirect: false,
			});
			expect(mockThis.helpers.request).not.toHaveBeenCalled();
		});

		it('should not send credentials to a URI override on another host', async () => {
			await apiRequest.call(mockThis, 'GET', '', {}, {}, 'http://other-host.example/file.png', {
				json: false,
				encoding: null,
			});

			expect(mockThis.helpers.requestWithAuthentication).not.toHaveBeenCalled();
			expect(mockThis.helpers.request).toHaveBeenCalledWith({
				method: 'GET',
				qs: {},
				uri: 'http://other-host.example/file.png',
				json: false,
				encoding: null,
			});
		});
	});
});
