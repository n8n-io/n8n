import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { theHiveApiRequest } from '../transport/requestApi';

describe('theHiveApiRequest', () => {
	it('should encode path values and join them with the credentials URL', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({
			url: 'https://thehive.example.com/',
			allowUnauthorizedCerts: false,
		});
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		const alertId = '~41160/case?x=1';
		await theHiveApiRequest.call(context, 'DELETE', requestPath`/v1/alert/${alertId}`);

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'theHiveProjectApi',
			expect.objectContaining({
				url: expect.objectContaining({
					value: 'https://thehive.example.com/api/v1/alert/~41160%2Fcase%3Fx=1',
				}),
			}),
		);
	});
});
