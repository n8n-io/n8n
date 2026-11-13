import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { serviceNowApiRequest } from '../GenericFunctions';

describe('serviceNowApiRequest', () => {
	it('should encode path values in the request URL', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('basicAuth');
		context.getCredentials.mockResolvedValue({ subdomain: 'dev12345' });
		context.helpers.requestWithAuthentication.mockResolvedValue({ result: {} });

		const id = '9d38/sys_user?x=1';
		await serviceNowApiRequest.call(context, 'GET', requestPath`/now/table/incident/${id}`);

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'serviceNowBasicApi',
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://dev12345.service-now.com/api/now/table/incident/9d38%2Fsys_user%3Fx=1',
				}),
			}),
		);
	});
});
