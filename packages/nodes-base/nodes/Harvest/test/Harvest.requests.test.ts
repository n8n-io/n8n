import type { ILoadOptionsFunctions, IRequestOptions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { Harvest } from '../Harvest.node';

describe('Harvest > request URLs', () => {
	it('should send the accounts load options request to the Harvest ID URL', async () => {
		const context = mockDeep<ILoadOptionsFunctions>();
		const parameters: Record<string, string> = {
			accountId: '1234567',
			authentication: 'accessToken',
		};
		context.getNodeParameter.mockImplementation((name: string) => parameters[name]);
		context.getCredentials.mockResolvedValue({ accessToken: 'fake-access-token' });
		context.helpers.request.mockResolvedValue({ accounts: [{ id: 1234567, name: 'Acme Corp' }] });

		const result = await new Harvest().methods.loadOptions.getAccounts.call(context);

		expect(result).toEqual([{ name: 'Acme Corp', value: 1234567 }]);
		expect(
			context.helpers.request.mock.calls.map(([options]) =>
				String((options as IRequestOptions).uri),
			),
		).toEqual(['https://id.getharvest.com/api/v2/accounts']);
	});
});
