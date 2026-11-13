import { mockDeep } from 'jest-mock-extended';
import type { IPollFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { togglApiRequest } from '../GenericFunctions';

describe('togglApiRequest', () => {
	it('should encode path values as one segment', async () => {
		const context = mockDeep<IPollFunctions>();
		context.helpers.requestWithAuthentication.mockResolvedValue([]);

		const id = '3507285114/stop?x=1';
		await togglApiRequest.call(context, 'GET', requestPath`/time_entries/${id}`);

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'togglApi',
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api.track.toggl.com/api/v9/me/time_entries/3507285114%2Fstop%3Fx=1',
				}),
			}),
		);
	});
});
