import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { pushbulletApiRequest } from '../GenericFunctions';

describe('pushbulletApiRequest', () => {
	it('should encode path values as one segment', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.helpers.requestOAuth2.mockResolvedValue({});

		const pushId = 'ujpah72o0sjAoRtnM0jc/devices?x=1';
		await pushbulletApiRequest.call(context, 'DELETE', requestPath`/pushes/${pushId}`);

		expect(context.helpers.requestOAuth2).toHaveBeenCalledWith(
			'pushbulletOAuth2Api',
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api.pushbullet.com/v2/pushes/ujpah72o0sjAoRtnM0jc%2Fdevices%3Fx=1',
				}),
			}),
		);
	});
});
