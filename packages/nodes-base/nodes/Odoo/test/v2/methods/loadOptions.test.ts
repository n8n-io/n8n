import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { ILoadOptionsFunctions } from 'n8n-workflow';

import {
	getActivityFields,
	getContactFields,
	getOpportunityFields,
} from '../../../v2/methods/loadOptions';
import * as transport from '../../../v2/transport';

jest.mock('../../../v2/transport', () => ({ odooApiRequest: jest.fn() }));

describe('Odoo v2 — loadOptions methods', () => {
	let ctx: MockProxy<ILoadOptionsFunctions>;

	beforeEach(() => {
		ctx = mock<ILoadOptionsFunctions>();
	});

	afterEach(() => jest.clearAllMocks());

	describe('getContactFields', () => {
		it('fetches fields from res.partner', async () => {
			(transport.odooApiRequest as jest.Mock).mockResolvedValue({
				name: { string: 'Name', type: 'char', required: true },
				email: { string: 'Email', type: 'char', required: false },
			});

			const result = await getContactFields.call(ctx);

			expect(transport.odooApiRequest).toHaveBeenCalledWith('res.partner', 'fields_get', {
				attributes: ['string', 'type', 'required'],
			});
			expect(result.some((r) => r.value === 'name')).toBe(true);
			expect(result.some((r) => r.value === 'email')).toBe(true);
		});

		it('includes field type and required in description', async () => {
			(transport.odooApiRequest as jest.Mock).mockResolvedValue({
				name: { string: 'Name', type: 'char', required: true },
			});
			const result = await getContactFields.call(ctx);
			expect(result[0].description).toBe('name: name, type: char, required: true');
		});

		it('sorts fields alphabetically', async () => {
			(transport.odooApiRequest as jest.Mock).mockResolvedValue({
				zip: { string: 'Zip', type: 'char', required: false },
				city: { string: 'City', type: 'char', required: false },
				name: { string: 'Name', type: 'char', required: true },
			});
			const result = await getContactFields.call(ctx);
			const names = result.map((r) => r.name);
			expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
		});
	});

	describe('getOpportunityFields', () => {
		it('fetches fields from crm.lead', async () => {
			(transport.odooApiRequest as jest.Mock).mockResolvedValue({});
			await getOpportunityFields.call(ctx);
			expect(transport.odooApiRequest).toHaveBeenCalledWith(
				'crm.lead',
				'fields_get',
				expect.any(Object),
			);
		});
	});

	describe('getActivityFields', () => {
		it('fetches fields from mail.activity', async () => {
			(transport.odooApiRequest as jest.Mock).mockResolvedValue({});
			await getActivityFields.call(ctx);
			expect(transport.odooApiRequest).toHaveBeenCalledWith(
				'mail.activity',
				'fields_get',
				expect.any(Object),
			);
		});
	});
});
