import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { gitlabApiRequest } from '../GenericFunctions';

describe('gitlabApiRequest', () => {
	it('should encode a path value with a slash as one segment', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('accessToken');
		context.getCredentials.mockResolvedValue({ server: 'https://gitlab.example.com/' });
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		const id = '42/delete?x=1';
		await gitlabApiRequest.call(
			context,
			'GET',
			requestPath`/projects/${'acme/billing-service'}/issues/${id}`,
			{},
		);

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'gitlabApi',
			expect.objectContaining({
				uri: expect.objectContaining({
					value:
						'https://gitlab.example.com/api/v4/projects/acme%2Fbilling-service/issues/42%2Fdelete%3Fx=1',
				}),
			}),
		);
	});
});
