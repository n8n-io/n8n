import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { Stackby } from '../Stackby.node';

describe('Stackby - request URL encoding', () => {
	it('should encode a table name with a slash as one path segment', async () => {
		const params: IDataObject = {
			operation: 'read',
			stackId: 'stQ7JA1JBbbbcCVc',
			table: 'Leads/2024',
			id: 'rw1655131325dd7d4cd7',
		};
		const context = mockDeep<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNodeParameter.mockImplementation((name: string) => params[name]);
		context.getCredentials.mockResolvedValue({ apiKey: 'test-api-key' });
		context.helpers.request.mockResolvedValue([]);

		await new Stackby().execute.call(context);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: requestUrl`https://stackby.com/api/betav1/rowlist/stQ7JA1JBbbbcCVc/Leads%2F2024`,
			}),
		);
	});
});
