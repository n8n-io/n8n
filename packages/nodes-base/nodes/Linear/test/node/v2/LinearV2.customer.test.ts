import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

import * as GenericFunctions from '../../../shared/GenericFunctions';
import { getCustomers } from '../../../shared/methods/listSearch';
import * as customerCreate from '../../../v2/actions/customer/create.operation';
import * as customerGetAll from '../../../v2/actions/customer/getAll.operation';
import * as needCreate from '../../../v2/actions/customerNeed/create.operation';

describe('Linear v2 → Customer & Customer Need', () => {
	let mockThis: IExecuteFunctions;

	beforeEach(() => {
		mockThis = {
			getInputData: vi.fn().mockReturnValue([{ json: {} }]),
			getNodeParameter: vi.fn(),
			continueOnFail: vi.fn().mockReturnValue(false),
			helpers: {
				returnJsonArray: vi.fn().mockImplementation((d) => [{ json: d }]),
				constructExecutionMetaData: vi.fn().mockImplementation((d) => d),
			},
		} as unknown as IExecuteFunctions;
	});

	afterEach(() => vi.restoreAllMocks());

	describe('customer.create', () => {
		it('sends customerCreate and splits domains into an array', async () => {
			const spy = vi.spyOn(GenericFunctions, 'linearApiRequest').mockResolvedValue({
				data: { customerCreate: { customer: { id: 'cus-1', name: 'Acme' } } },
			});

			vi.mocked(mockThis.getNodeParameter).mockImplementation((param: string) => {
				if (param === 'name') return 'Acme';
				if (param === 'additionalFields') return { domains: 'acme.com, acme.io' };
				return undefined;
			});

			await customerCreate.execute.call(mockThis, [{ json: {} }]);

			expect(spy).toHaveBeenCalledWith(
				expect.objectContaining({
					query: expect.stringContaining('customerCreate'),
					variables: expect.objectContaining({
						name: 'Acme',
						domains: ['acme.com', 'acme.io'],
					}),
				}),
			);
		});
	});

	describe('customer.getAll', () => {
		it('queries the customers connection', async () => {
			const spy = vi
				.spyOn(GenericFunctions, 'linearApiRequestAllItems')
				.mockResolvedValue([{ id: 'cus-1' }]);

			vi.mocked(mockThis.getNodeParameter).mockImplementation((param: string) => {
				if (param === 'returnAll') return false;
				if (param === 'limit') return 50;
				return undefined;
			});

			await customerGetAll.execute.call(mockThis, [{ json: {} }]);

			expect(spy).toHaveBeenCalledWith(
				'data.customers',
				expect.objectContaining({ query: expect.stringContaining('customers') }),
				50,
			);
		});
	});

	describe('customerNeed.create', () => {
		it('sends customerNeedCreate with the resolved customerId', async () => {
			const spy = vi.spyOn(GenericFunctions, 'linearApiRequest').mockResolvedValue({
				data: { customerNeedCreate: { need: { id: 'need-1' } } },
			});

			vi.mocked(mockThis.getNodeParameter).mockImplementation((param: string) => {
				if (param === 'customerId') return 'cus-1';
				if (param === 'additionalFields') return { body: 'Needs SSO', issueId: 'iss-1' };
				return undefined;
			});

			await needCreate.execute.call(mockThis, [{ json: {} }]);

			expect(spy).toHaveBeenCalledWith(
				expect.objectContaining({
					query: expect.stringContaining('customerNeedCreate'),
					variables: expect.objectContaining({
						customerId: 'cus-1',
						body: 'Needs SSO',
						issueId: 'iss-1',
					}),
				}),
			);
		});
	});

	describe('listSearch.getCustomers', () => {
		it('maps customers to results', async () => {
			const loadOptionsThis = {} as unknown as ILoadOptionsFunctions;
			vi.spyOn(GenericFunctions, 'linearApiRequest').mockResolvedValue({
				data: {
					customers: {
						nodes: [{ id: 'cus-1', name: 'Acme' }],
						pageInfo: { hasNextPage: false, endCursor: null },
					},
				},
			});

			const result = await getCustomers.call(loadOptionsThis, 'Ac');

			expect(result.results).toEqual([{ name: 'Acme', value: 'cus-1' }]);
		});
	});
});
