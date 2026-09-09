import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { microsoftApiRequest } from '../GenericFunctions';

describe('microsoftApiRequest', () => {
	it('should call requestOAuth2 without oAuth2Options so the stored access token is used', async () => {
		const requestOAuth2 = vi.fn().mockResolvedValue({});
		const context = mock<IExecuteFunctions>({
			helpers: mock<IExecuteFunctions['helpers']>({ requestOAuth2 }),
		});
		context.getCredentials.mockResolvedValue({ subdomain: 'org', region: 'crm.dynamics.com' });

		await microsoftApiRequest.call(context, 'GET', '/accounts');

		expect(requestOAuth2).toHaveBeenCalledWith('microsoftDynamicsOAuth2Api', expect.any(Object));
		expect(requestOAuth2.mock.calls[0]).toHaveLength(2);
	});
});
