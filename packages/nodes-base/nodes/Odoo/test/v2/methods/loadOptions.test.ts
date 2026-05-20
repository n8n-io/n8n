import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { ILoadOptionsFunctions } from 'n8n-workflow';

import {
	getActivityFields,
	getActivityTypes,
	getContactFields,
	getCountries,
	getModels,
	getOpportunityFields,
	getStates,
	getUsers,
} from '../../../v2/methods/loadOptions';
import * as transport from '../../../v2/transport';

jest.mock('../../../v2/transport', () => ({ odooApiRequest: jest.fn() }));

describe('Odoo v2 — loadOptions methods', () => {
	let ctx: MockProxy<ILoadOptionsFunctions>;

	beforeEach(() => {
		ctx = mock<ILoadOptionsFunctions>();
	});

	afterEach(() => jest.clearAllMocks());

	describe('getModels', () => {
		it('fetches all ir.model records and sorts by name', async () => {
			(transport.odooApiRequest as jest.Mock).mockResolvedValue([
				{ name: 'Survey', model: 'survey.survey' },
				{ name: 'Contact', model: 'res.partner' },
			]);

			const result = await getModels.call(ctx);

			expect(transport.odooApiRequest).toHaveBeenCalledWith('ir.model', 'search_read', {
				domain: [],
				fields: ['name', 'model'],
				limit: 0,
				offset: 0,
			});
			expect(result[0].name).toBe('Contact');
			expect(result[1].name).toBe('Survey');
			expect(result[0]).toMatchObject({
				name: 'Contact',
				value: 'res.partner',
				description: 'Model: res.partner',
			});
		});

		it('returns empty array when no models found', async () => {
			(transport.odooApiRequest as jest.Mock).mockResolvedValue([]);
			expect(await getModels.call(ctx)).toEqual([]);
		});
	});

	describe('getStates', () => {
		it('returns states sorted by name', async () => {
			(transport.odooApiRequest as jest.Mock).mockResolvedValue([
				{ id: 2, name: 'Texas' },
				{ id: 1, name: 'California' },
			]);

			const result = await getStates.call(ctx);

			expect(result[0]).toEqual({ name: 'California', value: 1 });
			expect(result[1]).toEqual({ name: 'Texas', value: 2 });
		});
	});

	describe('getCountries', () => {
		it('returns countries sorted by name', async () => {
			(transport.odooApiRequest as jest.Mock).mockResolvedValue([
				{ id: 2, name: 'Ukraine' },
				{ id: 1, name: 'Germany' },
			]);

			const result = await getCountries.call(ctx);

			expect(result[0]).toEqual({ name: 'Germany', value: 1 });
			expect(result[1]).toEqual({ name: 'Ukraine', value: 2 });
		});
	});

	describe('getActivityTypes', () => {
		it('returns activity types sorted by name', async () => {
			(transport.odooApiRequest as jest.Mock).mockResolvedValue([
				{ id: 3, name: 'Upload' },
				{ id: 1, name: 'Call' },
				{ id: 2, name: 'Email' },
			]);

			const result = await getActivityTypes.call(ctx);

			expect(result.map((r) => r.name)).toEqual(['Call', 'Email', 'Upload']);
			expect(transport.odooApiRequest).toHaveBeenCalledWith('mail.activity.type', 'search_read', {
				domain: [],
				fields: ['id', 'name'],
				limit: 0,
				offset: 0,
			});
		});
	});

	describe('getUsers', () => {
		it('filters by active=true and sorts by name', async () => {
			(transport.odooApiRequest as jest.Mock).mockResolvedValue([
				{ id: 2, name: 'Zara' },
				{ id: 1, name: 'Alice' },
			]);

			const result = await getUsers.call(ctx);

			expect(transport.odooApiRequest).toHaveBeenCalledWith('res.users', 'search_read', {
				domain: [['active', '=', true]],
				fields: ['id', 'name'],
				limit: 0,
				offset: 0,
			});
			expect(result.map((r) => r.name)).toEqual(['Alice', 'Zara']);
		});
	});

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
