import type { ICredentialsDecrypted, ICredentialTestFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { Grist } from '../Grist.node';

describe('Grist credentialTest', () => {
	const run = async (
		orgs: unknown,
		data: ICredentialsDecrypted['data'] = { apiKey: 'k', url: 'https://api.getgrist.com' },
	) => {
		const request = vi.fn().mockResolvedValue(orgs);
		const testFns = mock<ICredentialTestFunctions>();
		testFns.helpers = { ...testFns.helpers, request };
		const credential = mock<ICredentialsDecrypted>({ data });

		const result = await new Grist().methods.credentialTest.gristApiTest.call(testFns, credential);
		return { result, request };
	};

	it('passes when at least one org is accessible', async () => {
		const { result, request } = await run([{ id: 1, name: 'Personal' }]);

		expect(result.status).toBe('OK');
		expect(request.mock.calls[0][0].uri).toBe('https://api.getgrist.com/api/orgs');
	});

	it('fails when no orgs are accessible', async () => {
		const { result } = await run([]);

		expect(result.status).toBe('Error');
	});

	it('uses the OAuth access token when present', async () => {
		const { request } = await run([{ id: 1 }], {
			url: 'https://api.getgrist.com',
			oauthTokenData: { access_token: 'tok' },
		});

		expect(request.mock.calls[0][0].headers.Authorization).toBe('Bearer tok');
	});
});
