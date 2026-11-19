import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { apiRequest } from '../v1/transport';

describe('Mattermost apiRequest', () => {
	const context = mockDeep<IExecuteFunctions>();

	beforeEach(() => {
		vi.clearAllMocks();
		context.getCredentials.mockResolvedValue({
			baseUrl: 'https://mattermost.example.com/',
			allowUnauthorizedCerts: false,
		});
	});

	it('encodes the identifiers used as path segments', async () => {
		await apiRequest.call(context, 'GET', requestPath`channels/${'a/b'}/members`);

		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'mattermostApi',
			expect.objectContaining({
				url: expect.objectContaining({
					value: 'https://mattermost.example.com/api/v4/channels/a%2Fb/members',
				}),
			}),
		);
	});

	it('rejects an identifier that would change the path', () => {
		expect(() => requestPath`channels/${'..'}/members`).toThrow();
	});

	it('rejects a base URL that is not an http(s) URL', async () => {
		context.getCredentials.mockResolvedValue({ baseUrl: 'javascript:alert(1)' });

		await expect(apiRequest.call(context, 'GET', requestPath`users`)).rejects.toThrow();
	});
});
