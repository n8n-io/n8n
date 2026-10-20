import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { listRedirectLoginTrustedSources } from '../trusted-source';

describe('listRedirectLoginTrustedSources', () => {
	it('asks for the sources on the trigger surface with the redirect-login capability', async () => {
		const listTrustedSources = vi.fn().mockResolvedValue([
			{ id: 'n8n-internal', name: 'n8n' },
			{ id: 'idp-1', name: 'Acme IdP' },
		]);
		const context = mock<ILoadOptionsFunctions>({ helpers: { listTrustedSources } });

		const options = await listRedirectLoginTrustedSources.call(context);

		expect(listTrustedSources).toHaveBeenCalledWith({
			surface: 'trigger',
			capability: 'redirect-login',
		});
		expect(options).toEqual([
			{ name: 'n8n', value: 'n8n-internal' },
			{ name: 'Acme IdP', value: 'idp-1' },
		]);
	});

	it('lists nothing when the helper is not available', async () => {
		const context = mock<ILoadOptionsFunctions>({ helpers: {} });

		await expect(listRedirectLoginTrustedSources.call(context)).resolves.toEqual([]);
	});
});
