import get from 'lodash/get';
import type {
	IExecuteFunctions,
	IGetNodeParameterOptions,
	ILoadOptionsFunctions,
	INode,
	INodeListSearchItems,
	NodeParameterValueType,
} from 'n8n-workflow';
import { isResourceLocatorValue, requestPath } from 'n8n-workflow';
import type { Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import * as GenericFunctions from '../GenericFunctions';
import { Mautic } from '../Mautic.node';
import type * as _importType0 from '../GenericFunctions';

// Resolves a (possibly dotted) parameter from a test params object, mirroring core's
// `extractValue` for resourceLocator values so unit tests can exercise the wiring without
// the full execution engine. Extraction against the real core implementation is covered by
// the workflow tests in ./workflow.
const isParameterValue = (value: unknown): value is NodeParameterValueType | object =>
	!['function', 'symbol', 'bigint'].includes(typeof value);

const resolveParam = (
	params: Record<string, unknown>,
	param: string,
	fallback?: unknown,
	options?: IGetNodeParameterOptions,
): NodeParameterValueType | object => {
	const value: unknown = get(params, param, fallback);
	if (options?.extractValue && isResourceLocatorValue(value)) {
		return value.value;
	}
	return isParameterValue(value) ? value : undefined;
};

vi.mock('../GenericFunctions', async () => {
	const actual = await vi.importActual<typeof _importType0>('../GenericFunctions');
	return {
		...actual,
		mauticApiRequest: vi.fn(),
		mauticApiRequestAllItems: vi.fn(),
	};
});

const company = (id: number, companyname: unknown) => ({
	id,
	fields: { all: { id, companyname } },
});

// Mautic returns companies as an object keyed by id.
const companiesById = (...items: Array<ReturnType<typeof company>>) =>
	Object.fromEntries(items.map((item) => [String(item.id), item]));

describe('Mautic', () => {
	let node: Mautic;
	const mauticApiRequestSpy = vi.spyOn(GenericFunctions, 'mauticApiRequest');
	const mauticApiRequestAllItemsSpy = vi.spyOn(GenericFunctions, 'mauticApiRequestAllItems');

	beforeEach(() => {
		node = new Mautic();
		vi.clearAllMocks();
	});

	describe('searchCompanies (listSearch)', () => {
		let mockLoadOptionsFunctions: Mocked<ILoadOptionsFunctions>;

		beforeEach(() => {
			mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
		});

		it('should request a single page sorted by company name, without walking every company', async () => {
			mauticApiRequestSpy.mockResolvedValue({
				total: '2',
				companies: companiesById(company(1, 'Acme Corp'), company(2, 'Beta Ltd')),
			});

			const result = await node.methods.listSearch.searchCompanies.call(mockLoadOptionsFunctions);

			expect(mauticApiRequestAllItemsSpy).not.toHaveBeenCalled();
			expect(mauticApiRequestSpy).toHaveBeenCalledTimes(1);
			expect(mauticApiRequestSpy).toHaveBeenCalledWith(
				'GET',
				requestPath`/companies`,
				{},
				{ start: 0, limit: 50, orderBy: 'companyname', orderByDir: 'ASC' },
			);
			expect(result).toEqual({
				results: [
					{ name: 'Acme Corp', value: 'Acme Corp' },
					{ name: 'Beta Ltd', value: 'Beta Ltd' },
				],
				paginationToken: undefined,
			});
		});

		it('should narrow results with a quoted Mautic search phrase when a filter is provided', async () => {
			mauticApiRequestSpy.mockResolvedValue({
				total: '1',
				companies: companiesById(company(1, 'Acme Corp')),
			});

			await node.methods.listSearch.searchCompanies.call(mockLoadOptionsFunctions, ' acme corp ');

			const [, , , qs] = mauticApiRequestSpy.mock.calls[0];
			expect(qs).toEqual({
				start: 0,
				limit: 50,
				orderBy: 'companyname',
				orderByDir: 'ASC',
				search: '"acme corp"',
			});
		});

		it('should keep a colon inside the search phrase so Mautic does not read it as a search command', async () => {
			mauticApiRequestSpy.mockResolvedValue({ total: '0', companies: [] });

			await node.methods.listSearch.searchCompanies.call(mockLoadOptionsFunctions, 'Acme: North');

			const [, , , qs] = mauticApiRequestSpy.mock.calls[0];
			expect(qs).toEqual(expect.objectContaining({ search: '"Acme: North"' }));
		});

		it('should strip double quotes from the filter so the search phrase cannot be broken', async () => {
			mauticApiRequestSpy.mockResolvedValue({ total: '0', companies: [] });

			await node.methods.listSearch.searchCompanies.call(
				mockLoadOptionsFunctions,
				'The "Best" Company',
			);

			const [, , , qs] = mauticApiRequestSpy.mock.calls[0];
			expect(qs).toEqual(expect.objectContaining({ search: '"The Best Company"' }));
		});

		it('should not send a search term for a blank filter', async () => {
			mauticApiRequestSpy.mockResolvedValue({ total: '0', companies: [] });

			await node.methods.listSearch.searchCompanies.call(mockLoadOptionsFunctions, '  ""  ');

			const [, , , qs] = mauticApiRequestSpy.mock.calls[0];
			expect(qs).not.toHaveProperty('search');
		});

		it('should surface the start offset of the next page as the paginationToken', async () => {
			mauticApiRequestSpy.mockResolvedValue({
				total: '120',
				companies: companiesById(
					...Array.from({ length: 50 }, (_, i) => company(i + 1, `Company ${i}`)),
				),
			});

			const result = await node.methods.listSearch.searchCompanies.call(mockLoadOptionsFunctions);

			expect(result.paginationToken).toBe('50');
		});

		it('should follow the paginationToken across pages and stop on the last page', async () => {
			mauticApiRequestSpy.mockResolvedValueOnce({
				total: '51',
				companies: companiesById(
					...Array.from({ length: 50 }, (_, i) =>
						company(i + 1, `Acme ${String(i).padStart(2, '0')}`),
					),
				),
			});
			mauticApiRequestSpy.mockResolvedValueOnce({
				total: '51',
				companies: companiesById(company(51, 'Acme 50')),
			});

			const page1 = await node.methods.listSearch.searchCompanies.call(
				mockLoadOptionsFunctions,
				'acme',
			);
			expect(page1.paginationToken).toBe('50');

			const page2 = await node.methods.listSearch.searchCompanies.call(
				mockLoadOptionsFunctions,
				'acme',
				page1.paginationToken,
			);

			// The second call keeps the filter and asks for the next offset only.
			const [method, endpoint, body, qs] = mauticApiRequestSpy.mock.calls[1];
			expect(method).toBe('GET');
			expect(endpoint).toEqual(requestPath`/companies`);
			expect(body).toEqual({});
			expect(qs).toEqual({
				start: 50,
				limit: 50,
				orderBy: 'companyname',
				orderByDir: 'ASC',
				search: '"acme"',
			});
			expect(page2.results).toEqual([{ name: 'Acme 50', value: 'Acme 50' }]);
			expect(page2.paginationToken).toBeUndefined();
		});

		it('should page through 2,000 companies one page per call and terminate exactly once exhausted', async () => {
			const TOTAL = 2000;
			const PAGE = 50;
			const all = Array.from({ length: TOTAL }, (_, i) =>
				company(i + 1, `Company ${String(i).padStart(5, '0')}`),
			);

			// Simulate Mautic's start/limit paging, including the string `total`.
			mauticApiRequestSpy.mockImplementation(async (_method, _endpoint, _body, qs) => {
				const start = Number(qs?.start);
				const limit = Number(qs?.limit);
				return {
					total: String(TOTAL),
					companies: companiesById(...all.slice(start, start + limit)),
				};
			});

			const collected: INodeListSearchItems[] = [];
			let token: string | undefined;
			let pages = 0;
			do {
				const res = await node.methods.listSearch.searchCompanies.call(
					mockLoadOptionsFunctions,
					undefined,
					token,
				);
				collected.push(...res.results);
				token = res.paginationToken;
				pages += 1;
				// Guard: a token that never clears would loop forever.
				expect(pages).toBeLessThanOrEqual(Math.ceil(TOTAL / PAGE));
			} while (token);

			// Walked every company in 40 pages of 50, no duplicates, no gaps.
			expect(pages).toBe(Math.ceil(TOTAL / PAGE));
			expect(mauticApiRequestSpy).toHaveBeenCalledTimes(pages);
			expect(collected).toHaveLength(TOTAL);
			expect(new Set(collected.map((c) => c.value)).size).toBe(TOTAL);
			expect(collected[0]).toEqual({ name: 'Company 00000', value: 'Company 00000' });
			expect(collected[TOTAL - 1]).toEqual({ name: 'Company 01999', value: 'Company 01999' });
			expect(mauticApiRequestAllItemsSpy).not.toHaveBeenCalled();
		});

		it('should restore name order within a page, which JSON id keys re-order', async () => {
			// Mautic sorted these by name; as an id-keyed object they come back in id order.
			mauticApiRequestSpy.mockResolvedValue({
				total: '3',
				companies: companiesById(company(3, 'Alpha'), company(10, 'Charlie'), company(25, 'Bravo')),
			});

			const result = await node.methods.listSearch.searchCompanies.call(mockLoadOptionsFunctions);

			expect(result.results.map((r) => r.name)).toEqual(['Alpha', 'Bravo', 'Charlie']);
		});

		it('should skip nameless companies but still advance the token past them (numeric total)', async () => {
			mauticApiRequestSpy.mockResolvedValue({
				total: 10,
				companies: companiesById(company(3, 'Acme Corp'), company(4, ''), company(5, null)),
			});

			const result = await node.methods.listSearch.searchCompanies.call(
				mockLoadOptionsFunctions,
				undefined,
				'2',
			);

			expect(result.results).toEqual([{ name: 'Acme Corp', value: 'Acme Corp' }]);
			expect(result.paginationToken).toBe('5');
		});

		it('should stop paging when Mautic returns an empty page although total is higher', async () => {
			mauticApiRequestSpy.mockResolvedValue({ total: '500', companies: [] });

			const result = await node.methods.listSearch.searchCompanies.call(
				mockLoadOptionsFunctions,
				undefined,
				'100',
			);

			expect(result).toEqual({ results: [], paginationToken: undefined });
		});

		it('should return an empty result set when Mautic has no matching companies', async () => {
			// Mautic returns an empty array rather than an empty object when nothing matches.
			mauticApiRequestSpy.mockResolvedValue({ total: '0', companies: [] });

			const result = await node.methods.listSearch.searchCompanies.call(
				mockLoadOptionsFunctions,
				'no such company',
			);

			expect(result).toEqual({ results: [], paginationToken: undefined });
		});

		it('should tolerate a response without companies or total', async () => {
			mauticApiRequestSpy.mockResolvedValue({});

			const result = await node.methods.listSearch.searchCompanies.call(mockLoadOptionsFunctions);

			expect(result).toEqual({ results: [], paginationToken: undefined });
		});

		it.each(['not-a-number', '-50'])(
			'should start from the first page for the token %s',
			async (token) => {
				mauticApiRequestSpy.mockResolvedValue({ total: '0', companies: [] });

				await node.methods.listSearch.searchCompanies.call(
					mockLoadOptionsFunctions,
					undefined,
					token,
				);

				const [, , , qs] = mauticApiRequestSpy.mock.calls[0];
				expect(qs).toEqual(expect.objectContaining({ start: 0 }));
			},
		);
	});

	describe('Contact company parameter', () => {
		let mockExecuteFunctions: Mocked<IExecuteFunctions>;
		const mockNode: INode = {
			id: 'test-node-id',
			name: 'Mautic Test',
			type: 'n8n-nodes-base.mautic',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};

		const withParams = (params: Record<string, unknown>) => {
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(param: string, _i?: number, fallback?: unknown, options?: IGetNodeParameterOptions) =>
					resolveParam(params, param, fallback, options),
			);
		};

		const createParams = (company?: unknown): Record<string, unknown> => ({
			authentication: 'credentials',
			resource: 'contact',
			operation: 'create',
			jsonParameters: false,
			email: 'nathan@example.com',
			firstName: 'Nathan',
			lastName: '',
			...(company === undefined ? {} : { company }),
			position: '',
			title: '',
			additionalFields: {},
			options: {},
		});

		const updateParams = (updateFields: Record<string, unknown>): Record<string, unknown> => ({
			authentication: 'credentials',
			resource: 'contact',
			operation: 'update',
			contactId: '34',
			updateFields,
			options: {},
		});

		const sentBody = () => mauticApiRequestSpy.mock.calls[0][2];

		beforeEach(() => {
			mockExecuteFunctions = mockDeep<IExecuteFunctions>();
			mockExecuteFunctions.getNode.mockReturnValue(mockNode);
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
			mockExecuteFunctions.continueOnFail.mockReturnValue(false);
			vi.mocked(mockExecuteFunctions.helpers.constructExecutionMetaData).mockImplementation(
				(inputData, options) =>
					inputData.map((item) => ({ ...item, pairedItem: options.itemData })),
			);
			vi.mocked(mockExecuteFunctions.helpers.returnJsonArray).mockImplementation((jsonData) =>
				(Array.isArray(jsonData) ? jsonData : [jsonData]).map((json) => ({ json })),
			);
			mauticApiRequestSpy.mockResolvedValue({
				contact: { id: 34, fields: { all: { id: 34 } } },
			});
		});

		// The Primary Company field migrated from a `loadOptions`-typed select to a
		// `resourceLocator`. New workflows save `{ __rl, mode, value }` objects; existing
		// workflows keep raw strings or expressions. Execute must send the company name
		// from either shape.
		it('should map the company resourceLocator (list mode) onto company on create', async () => {
			withParams(createParams({ __rl: true, mode: 'list', value: 'Acme: North Branch' }));

			await node.execute.call(mockExecuteFunctions);

			expect(mauticApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				requestPath`/contacts/new`,
				expect.objectContaining({ email: 'nathan@example.com', company: 'Acme: North Branch' }),
			);
		});

		it('should map the company resourceLocator (name mode) onto company on create', async () => {
			withParams(createParams({ __rl: true, mode: 'name', value: 'Typed Company' }));

			await node.execute.call(mockExecuteFunctions);

			expect(sentBody()).toEqual(expect.objectContaining({ company: 'Typed Company' }));
		});

		it('should still accept company as a legacy raw string on create', async () => {
			withParams(createParams('Legacy Company'));

			await node.execute.call(mockExecuteFunctions);

			expect(sentBody()).toEqual(expect.objectContaining({ company: 'Legacy Company' }));
		});

		it('should pass a legacy numeric expression result through unchanged on create', async () => {
			withParams(createParams(12345));

			await node.execute.call(mockExecuteFunctions);

			expect(sentBody()).toEqual(expect.objectContaining({ company: 12345 }));
		});

		it('should send an empty company on create when the value is empty, as before', async () => {
			withParams(createParams({ __rl: true, mode: 'list', value: '' }));

			await node.execute.call(mockExecuteFunctions);

			expect(sentBody()).toEqual(expect.objectContaining({ company: '' }));
		});

		it('should send an empty company for a value that is neither text nor a number', async () => {
			withParams(createParams(true));

			await node.execute.call(mockExecuteFunctions);

			expect(sentBody()).toEqual(expect.objectContaining({ company: '' }));
		});

		it('should send an empty company on create when the parameter was never set, as before', async () => {
			withParams(createParams());

			await node.execute.call(mockExecuteFunctions);

			expect(sentBody()).toEqual(expect.objectContaining({ company: '' }));
		});

		it('should accept company as a resourceLocator object on update', async () => {
			withParams(updateParams({ company: { __rl: true, mode: 'list', value: 'Acme Corp' } }));

			await node.execute.call(mockExecuteFunctions);

			expect(mauticApiRequestSpy).toHaveBeenCalledWith(
				'PATCH',
				requestPath`/contacts/${'34'}/edit`,
				{ company: 'Acme Corp' },
			);
		});

		it('should still accept company as a legacy raw string on update', async () => {
			withParams(updateParams({ company: 'Legacy Company' }));

			await node.execute.call(mockExecuteFunctions);

			expect(sentBody()).toEqual({ company: 'Legacy Company' });
		});

		it('should pass a legacy numeric value through unchanged on update', async () => {
			withParams(updateParams({ company: 12345 }));

			await node.execute.call(mockExecuteFunctions);

			expect(sentBody()).toEqual({ company: 12345 });
		});

		it('should omit company on update when the resourceLocator value is empty', async () => {
			withParams(
				updateParams({ company: { __rl: true, mode: 'list', value: '' }, firstName: 'Nathan' }),
			);

			await node.execute.call(mockExecuteFunctions);

			expect(sentBody()).toEqual({ firstname: 'Nathan' });
		});

		it('should omit company on update when the field was not added', async () => {
			withParams(updateParams({ firstName: 'Nathan' }));

			await node.execute.call(mockExecuteFunctions);

			expect(sentBody()).toEqual({ firstname: 'Nathan' });
		});
	});
});
