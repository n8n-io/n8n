import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { intercomApiRequest } from '../GenericFunctions';

describe('intercomApiRequest', () => {
	it('should encode a path value that contains a slash', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.helpers.httpRequestWithAuthentication.mockResolvedValue({});

		await intercomApiRequest.call(context, requestPath`/contacts/${'5f1a/users?x=1'}`, 'GET');

		expect(String(context.helpers.httpRequestWithAuthentication.mock.calls[0][1].url)).toBe(
			'https://api.intercom.io/contacts/5f1a%2Fusers%3Fx=1',
		);
	});
});
