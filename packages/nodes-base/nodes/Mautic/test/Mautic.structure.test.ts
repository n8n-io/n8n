import type { INodeProperties } from 'n8n-workflow';

import { companyContactOperations } from '../CompanyContactDescription';
import { contactFields } from '../ContactDescription';
import { Mautic } from '../Mautic.node';

describe('Mautic Node Structure', () => {
	it('companyContact operation default should be one of its options', () => {
		const operation = companyContactOperations[0];
		const values = (operation.options as Array<{ value: string }>).map((o) => o.value);
		expect(values).toContain(operation.default);
	});

	describe('Primary Company parameter', () => {
		const createCompany = contactFields.find(
			(p) => p.name === 'company' && p.displayOptions?.show?.operation?.includes('create'),
		);
		const updateFields = contactFields.find((p) => p.name === 'updateFields');
		const updateCompany = updateFields?.options?.find(
			(p): p is INodeProperties => 'type' in p && p.name === 'company',
		);

		it.each([
			['create', createCompany],
			['update', updateCompany],
		])(
			'is a searchable resourceLocator on %s, stored under the unchanged name "company"',
			(_, param) => {
				expect(param).toBeDefined();
				expect(param?.type).toBe('resourceLocator');
				expect(param?.default).toEqual({ mode: 'list', value: '' });
				expect(param?.modes?.map((m) => m.name)).toEqual(['list', 'name']);
				expect(param?.modes?.[0].typeOptions).toEqual({
					searchListMethod: 'searchCompanies',
					searchable: true,
				});
			},
		);

		it('keeps the create field shown only for non-JSON contact create', () => {
			expect(createCompany?.displayOptions).toEqual({
				show: { resource: ['contact'], operation: ['create'], jsonParameters: [false] },
			});
		});

		it('is backed by a listSearch method and no longer by an all-companies loadOptions method', () => {
			const node = new Mautic();
			expect(node.methods.listSearch.searchCompanies).toBeInstanceOf(Function);
			expect(node.methods.loadOptions).not.toHaveProperty('getCompanies');
		});
	});
});
