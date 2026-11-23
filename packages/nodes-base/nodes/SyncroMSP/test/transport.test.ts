import { mockDeep } from 'vitest-mock-extended';
import type { ICredentialTestFunctions, IHttpRequestOptions } from 'n8n-workflow';

import { validateCredentials } from '../v1/transport';

describe('SyncroMSP > validateCredentials', () => {
	it('should request the user endpoint on the subdomain', async () => {
		const context = mockDeep<ICredentialTestFunctions>();
		context.helpers.request.mockResolvedValue({ user_id: 1 });

		await validateCredentials.call(context, { subdomain: 'acme', apiKey: 'fake-api-key' });

		const [options] = context.helpers.request.mock.calls[0];
		const { url, qs } = options as IHttpRequestOptions;
		expect(String(url)).toBe('https://acme.syncromsp.com/api/v1//me');
		expect(qs).toEqual({ api_key: 'fake-api-key' });
	});
});
