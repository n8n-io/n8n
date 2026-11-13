import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { salesmateApiRequest } from '../GenericFunctions';

describe('Salesmate GenericFunctions', () => {
	const request = vi.fn();
	const context = {
		getCredentials: vi
			.fn()
			.mockResolvedValue({ sessionToken: 'test-session-token', url: 'acme.salesmate.io' }),
		getNode: vi.fn(),
		helpers: { request },
	} as unknown as IExecuteFunctions;

	it('should encode path values as a single segment', async () => {
		request.mockResolvedValue({});
		const dealId = '4210/companies?x=1';

		await salesmateApiRequest.call(context, 'GET', requestPath`/v1/deals/${dealId}`);

		expect(String(request.mock.calls[0][0].uri)).toBe(
			'https://apis.salesmate.io/v1/deals/4210%2Fcompanies%3Fx=1',
		);
	});
});
