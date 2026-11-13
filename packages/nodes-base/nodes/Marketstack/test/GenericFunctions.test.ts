import { mock, mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions, INode, IRequestOptions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { marketstackApiRequest } from '../GenericFunctions';

describe('Marketstack -> marketstackApiRequest', () => {
	it('should encode a path value that contains a slash', async () => {
		const executeFunctions = mockDeep<IExecuteFunctions>();
		executeFunctions.getNode.mockReturnValue(mock<INode>());
		executeFunctions.getCredentials.mockResolvedValue({ apiKey: 'test-api-key', useHttps: true });
		executeFunctions.helpers.request.mockResolvedValue({});

		await marketstackApiRequest.call(
			executeFunctions,
			'GET',
			requestPath`/exchanges/${'XNAS/tickers'}`,
		);

		const options = executeFunctions.helpers.request.mock.calls[0][0] as IRequestOptions;
		expect(String(options.uri)).toBe('https://api.marketstack.com/v1/exchanges/XNAS%2Ftickers');
	});
});
