import { companyContactOperations } from '../CompanyContactDescription';

describe('Mautic Node Structure', () => {
	it('companyContact operation default should be one of its options', () => {
		const operation = companyContactOperations[0];
		const values = (operation.options as Array<{ value: string }>).map((o) => o.value);
		expect(values).toContain(operation.default);
	});
});
