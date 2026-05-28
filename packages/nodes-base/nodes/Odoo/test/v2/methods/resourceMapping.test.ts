import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { ILoadOptionsFunctions } from 'n8n-workflow';

import {
	getActivityFields,
	getContactFields,
	getOdooFields,
	getOpportunityFields,
} from '../../../v2/methods/resourceMapping';
import * as transport from '../../../v2/transport';

jest.mock('../../../v2/transport', () => ({ odooApiRequest: jest.fn() }));

const SCHEMA = {
	name: { string: 'Name', type: 'char', required: true, readonly: false },
	email: { string: 'Email', type: 'char', required: false, readonly: false },
	active: { string: 'Active', type: 'boolean', required: false, readonly: false },
	age: { string: 'Age', type: 'integer', required: false, readonly: false },
	birthday: { string: 'Birthday', type: 'date', required: false, readonly: false },
	meeting_at: { string: 'Meeting At', type: 'datetime', required: false, readonly: false },
	priority: {
		string: 'Priority',
		type: 'selection',
		required: false,
		readonly: false,
		selection: [
			['0', 'Normal'],
			['1', 'High'],
		],
	},
	computed: { string: 'Computed Field', type: 'char', required: false, readonly: true },
	tags: { string: 'Tags', type: 'many2many', required: false, readonly: false },
	children: { string: 'Children', type: 'one2many', required: false, readonly: false },
};

describe('Odoo v2 — resourceMapping methods', () => {
	let ctx: MockProxy<ILoadOptionsFunctions>;

	beforeEach(() => {
		ctx = mock<ILoadOptionsFunctions>();
		(transport.odooApiRequest as jest.Mock).mockResolvedValue(SCHEMA);
	});

	afterEach(() => jest.clearAllMocks());

	describe('getOdooFields', () => {
		it('returns empty fields when customResource is not set', async () => {
			ctx.getNodeParameter.mockReturnValue('');
			const result = await getOdooFields.call(ctx);
			expect(result).toEqual({ fields: [] });
			expect(transport.odooApiRequest).not.toHaveBeenCalled();
		});

		it('fetches fields for the selected model', async () => {
			ctx.getNodeParameter.mockImplementation((key: string) => {
				if (key === 'customResource') return 'survey.survey';
				if (key === 'operation') return 'create';
				return undefined;
			});

			await getOdooFields.call(ctx);

			expect(transport.odooApiRequest).toHaveBeenCalledWith('survey.survey', 'fields_get', {
				attributes: ['string', 'type', 'required', 'readonly', 'selection'],
			});
		});
	});

	describe('getContactFields', () => {
		it('fetches fields for res.partner', async () => {
			ctx.getNodeParameter.mockReturnValue('create');
			await getContactFields.call(ctx);
			expect(transport.odooApiRequest).toHaveBeenCalledWith(
				'res.partner',
				'fields_get',
				expect.any(Object),
			);
		});

		it('marks name as required on create', async () => {
			ctx.getNodeParameter.mockReturnValue('create');
			const result = await getContactFields.call(ctx);
			const nameField = result.fields.find((f) => f.id === 'name');
			expect(nameField?.required).toBe(true);
		});

		it('does not mark name as required on update', async () => {
			ctx.getNodeParameter.mockReturnValue('update');
			const result = await getContactFields.call(ctx);
			const nameField = result.fields.find((f) => f.id === 'name');
			expect(nameField?.required).toBe(false);
		});
	});

	describe('getOpportunityFields', () => {
		it('fetches fields for crm.lead', async () => {
			ctx.getNodeParameter.mockReturnValue('create');
			await getOpportunityFields.call(ctx);
			expect(transport.odooApiRequest).toHaveBeenCalledWith(
				'crm.lead',
				'fields_get',
				expect.any(Object),
			);
		});

		it('marks name as required on create', async () => {
			ctx.getNodeParameter.mockReturnValue('create');
			const result = await getOpportunityFields.call(ctx);
			const nameField = result.fields.find((f) => f.id === 'name');
			expect(nameField?.required).toBe(true);
		});
	});

	describe('getActivityFields', () => {
		it('fetches fields for mail.activity', async () => {
			ctx.getNodeParameter.mockReturnValue('create');
			await getActivityFields.call(ctx);
			expect(transport.odooApiRequest).toHaveBeenCalledWith(
				'mail.activity',
				'fields_get',
				expect.any(Object),
			);
		});

		it('marks no fields as required', async () => {
			ctx.getNodeParameter.mockReturnValue('create');
			const result = await getActivityFields.call(ctx);
			expect(result.fields.every((f) => !f.required)).toBe(true);
		});
	});

	describe('field mapping', () => {
		beforeEach(() => {
			ctx.getNodeParameter.mockReturnValue('create');
		});

		it('hides readonly fields (display: false)', async () => {
			const result = await getContactFields.call(ctx);
			const computedField = result.fields.find((f) => f.id === 'computed');
			expect(computedField?.display).toBe(false);
		});

		it('hides many2many fields (display: false)', async () => {
			const result = await getContactFields.call(ctx);
			const tagsField = result.fields.find((f) => f.id === 'tags');
			expect(tagsField?.display).toBe(false);
		});

		it('hides one2many fields (display: false)', async () => {
			const result = await getContactFields.call(ctx);
			const childrenField = result.fields.find((f) => f.id === 'children');
			expect(childrenField?.display).toBe(false);
		});

		it('shows writable fields (display: true)', async () => {
			const result = await getContactFields.call(ctx);
			const emailField = result.fields.find((f) => f.id === 'email');
			expect(emailField?.display).toBe(true);
		});

		it('populates options for selection fields', async () => {
			const result = await getContactFields.call(ctx);
			const priorityField = result.fields.find((f) => f.id === 'priority');
			expect(priorityField?.options).toEqual([
				{ name: 'Normal', value: '0' },
				{ name: 'High', value: '1' },
			]);
		});

		it('sorts fields alphabetically by displayName', async () => {
			const result = await getContactFields.call(ctx);
			const names = result.fields.map((f) => f.displayName);
			expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
		});

		it('maps char/text/html to string type', async () => {
			const result = await getContactFields.call(ctx);
			expect(result.fields.find((f) => f.id === 'name')?.type).toBe('string');
		});

		it('maps integer to number type', async () => {
			const result = await getContactFields.call(ctx);
			expect(result.fields.find((f) => f.id === 'age')?.type).toBe('number');
		});

		it('maps boolean type', async () => {
			const result = await getContactFields.call(ctx);
			expect(result.fields.find((f) => f.id === 'active')?.type).toBe('boolean');
		});

		it('maps date to dateTime type', async () => {
			const result = await getContactFields.call(ctx);
			expect(result.fields.find((f) => f.id === 'birthday')?.type).toBe('dateTime');
		});

		it('maps selection to options type', async () => {
			const result = await getContactFields.call(ctx);
			expect(result.fields.find((f) => f.id === 'priority')?.type).toBe('options');
		});
	});
});
