import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath, requestUrl } from 'n8n-workflow';

import { keapApiRequest } from '../GenericFunctions';

describe('keapApiRequest', () => {
	it('should encode path values', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.helpers.requestOAuth2.mockResolvedValue({});

		const noteId = '5678/delete?x=1';
		await keapApiRequest.call(context, 'GET', requestPath`/notes/${noteId}`);

		expect(context.helpers.requestOAuth2).toHaveBeenCalledWith(
			'keapOAuth2Api',
			expect.objectContaining({
				uri: requestUrl`https://api.infusionsoft.com/crm/rest/v1/notes/5678%2Fdelete%3Fx=1`,
			}),
		);
	});
});
