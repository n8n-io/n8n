import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { splunkApiJsonRequest } from '../../v2/transport';

describe('Splunk v2 transport', () => {
	it('should encode a path value that contains a slash', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({
			baseUrl: 'https://splunk.example.com:8089',
			allowUnauthorizedCerts: false,
		});
		context.helpers.httpRequestWithAuthentication.mockResolvedValue({});

		const userId = 'nathan/admin';
		await splunkApiJsonRequest.call(
			context,
			'GET',
			requestPath`/services/authentication/users/${userId}`,
		);

		expect(String(context.helpers.httpRequestWithAuthentication.mock.calls[0][1].url)).toBe(
			'https://splunk.example.com:8089/services/authentication/users/nathan%2Fadmin',
		);
	});
});
