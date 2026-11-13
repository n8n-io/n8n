import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { quickbaseApiRequest } from '../GenericFunctions';

describe('quickbaseApiRequest', () => {
	it('should encode path values as one segment', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({
			hostname: 'acme.quickbase.com',
			userToken: 'fake-user-token',
		});
		context.helpers.request.mockResolvedValue({});

		const reportId = '5/fields?x=1';
		await quickbaseApiRequest.call(context, 'GET', requestPath`/reports/${reportId}`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api.quickbase.com/v1/reports/5%2Ffields%3Fx=1',
				}),
			}),
		);
	});
});
