import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { uptimeRobotApiRequest } from '../GenericFunctions';

describe('uptimeRobotApiRequest', () => {
	it('should encode a path value that contains a slash', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ apiKey: 'fake-api-key' });
		context.helpers.request.mockResolvedValue({ stat: 'ok' });

		const id = '1234/delete?x=1';
		await uptimeRobotApiRequest.call(context, 'POST', requestPath`/getMonitors/${id}`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api.uptimerobot.com/v2/getMonitors/1234%2Fdelete%3Fx=1',
				}),
			}),
		);
	});
});
