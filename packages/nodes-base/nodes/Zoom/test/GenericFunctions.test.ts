import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { zoomApiRequest } from '../GenericFunctions';

describe('zoomApiRequest', () => {
	it('should encode path values in the request URL', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('accessToken');
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		const meetingId = '85746065432/recordings?x=1';
		await zoomApiRequest.call(context, 'GET', requestPath`/meetings/${meetingId}`);

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'zoomApi',
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api.zoom.us/v2/meetings/85746065432%2Frecordings%3Fx=1',
				}),
			}),
		);
	});
});
