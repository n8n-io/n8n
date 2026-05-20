import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { ILoadOptionsFunctions } from 'n8n-workflow';

import {
	searchActivities,
	searchActivityTypes,
	searchContacts,
	searchCustomRecords,
	searchModelRecords,
	searchModels,
	searchOpportunities,
	searchUsers,
} from '../../../v2/methods/listSearch';
import * as transport from '../../../v2/transport';

jest.mock('../../../v2/transport', () => ({ odooApiRequest: jest.fn() }));

describe('Odoo v2 — listSearch methods', () => {
	let ctx: MockProxy<ILoadOptionsFunctions>;

	beforeEach(() => {
		ctx = mock<ILoadOptionsFunctions>();
	});

	afterEach(() => jest.clearAllMocks());

	describe('searchModels', () => {
		it('searches ir.model without filter', async () => {
			(transport.odooApiRequest as jest.Mock).mockResolvedValue([
				{ name: 'Contact', model: 'res.partner' },
				{ name: 'Account', model: 'account.move' },
			]);

			const result = await searchModels.call(ctx);

			expect(transport.odooApiRequest).toHaveBeenCalledWith('ir.model', 'search_read', {
				domain: [],
				fields: ['name', 'model'],
				limit: 60,
				offset: 0,
			});
			expect(result.results[0].name).toBe('Account');
			expect(result.results[1].name).toBe('Contact');
		});

		it('passes filter as ilike domain', async () => {
			(transport.odooApiRequest as jest.Mock).mockResolvedValue([]);
			await searchModels.call(ctx, 'contact');
			expect(transport.odooApiRequest).toHaveBeenCalledWith(
				'ir.model',
				'search_read',
				expect.objectContaining({ domain: [['name', 'ilike', 'contact']] }),
			);
		});

		it('maps results to name/value/description', async () => {
			(transport.odooApiRequest as jest.Mock).mockResolvedValue([
				{ name: 'Contact', model: 'res.partner' },
			]);
			const result = await searchModels.call(ctx);
			expect(result.results[0]).toEqual({
				name: 'Contact',
				value: 'res.partner',
				description: 'res.partner',
			});
		});
	});

	describe('searchCustomRecords', () => {
		it('returns empty results when customResource is not set', async () => {
			ctx.getNodeParameter.mockReturnValue('');
			const result = await searchCustomRecords.call(ctx);
			expect(result).toEqual({ results: [] });
			expect(transport.odooApiRequest).not.toHaveBeenCalled();
		});

		it('searches the selected custom model', async () => {
			ctx.getNodeParameter.mockReturnValue('survey.survey');
			(transport.odooApiRequest as jest.Mock).mockResolvedValue([
				{ id: 1, display_name: 'Customer Survey' },
				{ id: 2, display_name: 'Product Survey' },
			]);

			const result = await searchCustomRecords.call(ctx, 'Survey');

			expect(transport.odooApiRequest).toHaveBeenCalledWith('survey.survey', 'search_read', {
				domain: [['display_name', 'ilike', 'Survey']],
				fields: ['id', 'display_name'],
				limit: 60,
				offset: 0,
			});
			expect(result.results).toEqual([
				{ name: 'Customer Survey', value: 1 },
				{ name: 'Product Survey', value: 2 },
			]);
		});
	});

	describe('searchModelRecords', () => {
		it('returns empty results when res_model is not set', async () => {
			ctx.getNodeParameter.mockReturnValue('');
			const result = await searchModelRecords.call(ctx);
			expect(result).toEqual({ results: [] });
		});

		it('searches the res_model with filter', async () => {
			ctx.getNodeParameter.mockReturnValue('res.partner');
			(transport.odooApiRequest as jest.Mock).mockResolvedValue([{ id: 5, display_name: 'Alice' }]);

			const result = await searchModelRecords.call(ctx, 'Alice');

			expect(transport.odooApiRequest).toHaveBeenCalledWith('res.partner', 'search_read', {
				domain: [['display_name', 'ilike', 'Alice']],
				fields: ['id', 'display_name'],
				limit: 60,
				offset: 0,
			});
			expect(result.results).toEqual([{ name: 'Alice', value: 5 }]);
		});
	});

	describe('searchContacts', () => {
		it('returns contacts without filter', async () => {
			(transport.odooApiRequest as jest.Mock).mockResolvedValue([
				{ id: 1, name: 'Alice' },
				{ id: 2, name: 'Bob' },
			]);

			const result = await searchContacts.call(ctx);

			expect(transport.odooApiRequest).toHaveBeenCalledWith('res.partner', 'search_read', {
				domain: [],
				fields: ['id', 'name'],
				limit: 60,
				offset: 0,
			});
			expect(result.results).toEqual([
				{ name: 'Alice', value: 1 },
				{ name: 'Bob', value: 2 },
			]);
		});

		it('passes filter as ilike domain', async () => {
			(transport.odooApiRequest as jest.Mock).mockResolvedValue([]);
			await searchContacts.call(ctx, 'Alice');
			expect(transport.odooApiRequest).toHaveBeenCalledWith(
				'res.partner',
				'search_read',
				expect.objectContaining({ domain: [['name', 'ilike', 'Alice']] }),
			);
		});
	});

	describe('searchOpportunities', () => {
		it('returns opportunities in API order', async () => {
			(transport.odooApiRequest as jest.Mock).mockResolvedValue([
				{ id: 2, name: 'Big Deal' },
				{ id: 1, name: 'Another Deal' },
			]);

			const result = await searchOpportunities.call(ctx);

			expect(transport.odooApiRequest).toHaveBeenCalledWith('crm.lead', 'search_read', {
				domain: [],
				fields: ['id', 'name'],
				limit: 60,
				offset: 0,
			});
			expect(result.results).toEqual([
				{ name: 'Big Deal', value: 2 },
				{ name: 'Another Deal', value: 1 },
			]);
		});

		it('passes filter as ilike domain', async () => {
			(transport.odooApiRequest as jest.Mock).mockResolvedValue([]);
			await searchOpportunities.call(ctx, 'Deal');
			expect(transport.odooApiRequest).toHaveBeenCalledWith(
				'crm.lead',
				'search_read',
				expect.objectContaining({ domain: [['name', 'ilike', 'Deal']] }),
			);
		});
	});

	describe('searchActivities', () => {
		it('uses summary as name when present', async () => {
			(transport.odooApiRequest as jest.Mock).mockResolvedValue([
				{ id: 1, summary: 'Call customer', res_name: 'Alice' },
			]);

			const result = await searchActivities.call(ctx);

			expect(result.results[0]).toEqual({ name: 'Call customer', value: 1, description: 'Alice' });
		});

		it('falls back to Activity #id when summary is empty', async () => {
			(transport.odooApiRequest as jest.Mock).mockResolvedValue([
				{ id: 7, summary: '', res_name: 'Bob' },
			]);

			const result = await searchActivities.call(ctx);

			expect(result.results[0].name).toBe('Activity #7');
		});

		it('passes filter as ilike domain on summary', async () => {
			(transport.odooApiRequest as jest.Mock).mockResolvedValue([]);
			await searchActivities.call(ctx, 'call');
			expect(transport.odooApiRequest).toHaveBeenCalledWith(
				'mail.activity',
				'search_read',
				expect.objectContaining({ domain: [['summary', 'ilike', 'call']] }),
			);
		});
	});

	describe('searchActivityTypes', () => {
		it('returns types sorted alphabetically', async () => {
			(transport.odooApiRequest as jest.Mock).mockResolvedValue([
				{ id: 2, name: 'Upload Document' },
				{ id: 1, name: 'Email' },
				{ id: 3, name: 'Call' },
			]);

			const result = await searchActivityTypes.call(ctx);

			expect(result.results.map((r) => r.name)).toEqual(['Call', 'Email', 'Upload Document']);
		});

		it('passes filter as ilike domain', async () => {
			(transport.odooApiRequest as jest.Mock).mockResolvedValue([]);
			await searchActivityTypes.call(ctx, 'email');
			expect(transport.odooApiRequest).toHaveBeenCalledWith(
				'mail.activity.type',
				'search_read',
				expect.objectContaining({ domain: [['name', 'ilike', 'email']] }),
			);
		});
	});

	describe('searchUsers', () => {
		it('always includes active=true in domain', async () => {
			(transport.odooApiRequest as jest.Mock).mockResolvedValue([]);
			await searchUsers.call(ctx);
			const callArgs = (transport.odooApiRequest as jest.Mock).mock.calls[0][2];
			expect(callArgs.domain).toContainEqual(['active', '=', true]);
		});

		it('appends filter to domain', async () => {
			(transport.odooApiRequest as jest.Mock).mockResolvedValue([]);
			await searchUsers.call(ctx, 'admin');
			const callArgs = (transport.odooApiRequest as jest.Mock).mock.calls[0][2];
			expect(callArgs.domain).toContainEqual(['name', 'ilike', 'admin']);
		});

		it('returns users sorted alphabetically', async () => {
			(transport.odooApiRequest as jest.Mock).mockResolvedValue([
				{ id: 2, name: 'Zara' },
				{ id: 1, name: 'Alice' },
			]);

			const result = await searchUsers.call(ctx);

			expect(result.results.map((r) => r.name)).toEqual(['Alice', 'Zara']);
		});
	});
});
