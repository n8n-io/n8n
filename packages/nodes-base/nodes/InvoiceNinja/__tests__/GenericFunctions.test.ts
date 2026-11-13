import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { invoiceNinjaApiRequest } from '../GenericFunctions';

describe('invoiceNinjaApiRequest', () => {
	const requestUri = async (url: string, version: string, clientId: string) => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({ url, apiToken: 'fake-api-token' });
		context.getNodeParameter.mockReturnValue(version);
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		await invoiceNinjaApiRequest.call(context, 'GET', requestPath`/clients/${clientId}`);

		return String(context.helpers.requestWithAuthentication.mock.calls[0][1].uri);
	};

	it('should encode a path value that contains a slash', async () => {
		expect(await requestUri('https://invoicing.example.com', 'v5', 'Volej/users')).toBe(
			'https://invoicing.example.com/api/v1/clients/Volej%2Fusers',
		);
	});

	it.each([
		['', 'v4', 'https://app.invoiceninja.com/api/v1/clients/VolejRejNm'],
		['', 'v5', 'https://invoicing.co/api/v1/clients/VolejRejNm'],
		['http://localhost:8000', 'v5', 'http://localhost:8000/api/v1/clients/VolejRejNm'],
		['https://example.com/ninja', 'v4', 'https://example.com/ninja/api/v1/clients/VolejRejNm'],
		['https://example.com/ninja/', 'v5', 'https://example.com/ninja/api/v1/clients/VolejRejNm'],
	])(
		'should build the URL from base URL "%s" and API version %s',
		async (url, version, expected) => {
			expect(await requestUri(url, version, 'VolejRejNm')).toBe(expected);
		},
	);

	it('should throw a node error for a base URL without a scheme', async () => {
		await expect(requestUri('invoicing.example.com', 'v5', 'VolejRejNm')).rejects.toThrow(
			'Invalid base URL',
		);
	});
});
