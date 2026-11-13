import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { sendGridApiRequest } from '../GenericFunctions';

describe('SendGrid GenericFunctions', () => {
	const requestWithAuthentication = jest.fn();
	const context = {
		helpers: { requestWithAuthentication },
	} as unknown as IExecuteFunctions;

	it('should encode path values as a single segment', async () => {
		requestWithAuthentication.mockResolvedValue({});
		const listId = 'f1e2d3c4/contacts?x=1';

		await sendGridApiRequest.call(context, requestPath`/marketing/lists/${listId}`, 'GET');

		expect(String(requestWithAuthentication.mock.calls[0][1].uri)).toBe(
			'https://api.sendgrid.com/v3/marketing/lists/f1e2d3c4%2Fcontacts%3Fx=1',
		);
	});
});
