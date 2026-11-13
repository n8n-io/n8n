import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { segmentApiRequest } from '../GenericFunctions';

describe('Segment GenericFunctions', () => {
	const requestWithAuthentication = jest.fn();
	const context = {
		helpers: { requestWithAuthentication },
	} as unknown as IExecuteFunctions;

	it('should encode path values as a single segment', async () => {
		requestWithAuthentication.mockResolvedValue({});
		const event = 'track/batch?x=1';

		await segmentApiRequest.call(context, 'POST', requestPath`/${event}`);

		expect(String(requestWithAuthentication.mock.calls[0][1].uri)).toBe(
			'https://api.segment.io/v1/track%2Fbatch%3Fx=1',
		);
	});
});
