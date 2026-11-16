import { mockDeep } from 'vitest-mock-extended';
import type { ICredentialTestFunctions } from 'n8n-workflow';

import { OdooV1 } from '../../v1/OdooV1.node';

describe('OdooV1 credential test', () => {
	it('should return an error status for a site URL without a scheme', async () => {
		const node = new OdooV1({
			displayName: 'Odoo',
			name: 'odoo',
			group: ['transform'],
			description: 'Consume Odoo API',
		});
		const context = mockDeep<ICredentialTestFunctions>();

		const result = await node.methods.credentialTest.odooApiTest.call(context, {
			id: '1',
			name: 'Odoo account',
			type: 'odooApi',
			data: { url: 'acme.odoo.com', db: 'acme', username: 'nathan', password: 'fake-password' },
		});

		expect(result).toEqual({
			status: 'Error',
			message: 'Settings are not valid: UserError: Invalid base URL',
		});
		expect(context.helpers.request).not.toHaveBeenCalled();
	});
});
