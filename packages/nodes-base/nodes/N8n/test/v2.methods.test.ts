import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { getProjectRoles } from '../v2/methods';

describe('n8n node v2 methods', () => {
	describe('getProjectRoles', () => {
		it('lists the project roles from GET /roles without the personal owner role', async () => {
			const helpers = mock<ILoadOptionsFunctions['helpers']>();
			const context = mock<ILoadOptionsFunctions>({ helpers });
			context.getCredentials.mockResolvedValue({
				apiKey: 'key123',
				baseUrl: 'https://test.app.n8n.cloud/api/v1/',
			});
			helpers.requestWithAuthentication.mockResolvedValue({
				global: [{ slug: 'global:admin', displayName: 'Admin' }],
				project: [
					{ slug: 'project:personalOwner', displayName: 'Project Owner' },
					{ slug: 'project:admin', displayName: 'Project Admin' },
					{ slug: 'project:custom', displayName: 'Custom Role' },
				],
			});

			const roles = await getProjectRoles.call(context);

			expect(helpers.requestWithAuthentication).toHaveBeenCalledWith(
				'n8nApi',
				expect.objectContaining({
					method: 'GET',
					uri: 'https://test.app.n8n.cloud/api/v1/roles',
				}),
			);
			expect(roles).toEqual([
				{ name: 'Project Admin', value: 'project:admin' },
				{ name: 'Custom Role', value: 'project:custom' },
			]);
		});

		it('returns no roles when the response has no project roles', async () => {
			const helpers = mock<ILoadOptionsFunctions['helpers']>();
			const context = mock<ILoadOptionsFunctions>({ helpers });
			context.getCredentials.mockResolvedValue({
				apiKey: 'key123',
				baseUrl: 'https://n8n.test/api/v1',
			});
			helpers.requestWithAuthentication.mockResolvedValue({ global: [] });

			expect(await getProjectRoles.call(context)).toEqual([]);
		});
	});
});
