import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

import * as GenericFunctions from '../../../shared/GenericFunctions';
import { getInitiatives } from '../../../shared/methods/listSearch';
import * as initiativeArchive from '../../../v2/actions/initiative/archive.operation';
import * as initiativeCreate from '../../../v2/actions/initiative/create.operation';
import * as initiativeGet from '../../../v2/actions/initiative/get.operation';
import * as initiativeGetAll from '../../../v2/actions/initiative/getAll.operation';

describe('Linear v2 → Initiative', () => {
	let mockThis: IExecuteFunctions;
	let apiRequestSpy: ReturnType<typeof vi.spyOn>;

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

	describe('initiative.create', () => {
		it('sends initiativeCreate mutation with name and additional fields', async () => {
			apiRequestSpy = vi.spyOn(GenericFunctions, 'linearApiRequest').mockResolvedValue({
				data: { initiativeCreate: { initiative: { id: 'init-1', name: 'Q3 Goals' } } },
			});

			vi.mocked(mockThis.getNodeParameter).mockImplementation((param: string) => {
				if (param === 'name') return 'Q3 Goals';
				if (param === 'additionalFields') return { description: 'Roadmap for Q3' };
				return undefined;
			});

			await initiativeCreate.execute.call(mockThis, [{ json: {} }]);

			expect(apiRequestSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					query: expect.stringContaining('initiativeCreate'),
					variables: expect.objectContaining({
						name: 'Q3 Goals',
						description: 'Roadmap for Q3',
					}),
				}),
			);
		});
	});

	describe('initiative.get', () => {
		it('resolves the resource-locator ID and sends the initiative query', async () => {
			apiRequestSpy = vi.spyOn(GenericFunctions, 'linearApiRequest').mockResolvedValue({
				data: { initiative: { id: 'init-1', name: 'Q3 Goals' } },
			});

			vi.mocked(mockThis.getNodeParameter).mockImplementation((param: string) => {
				if (param === 'initiativeId') return 'init-1';
				return undefined;
			});

			await initiativeGet.execute.call(mockThis, [{ json: {} }]);

			expect(apiRequestSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					query: expect.stringContaining('initiative(id: $initiativeId)'),
					variables: { initiativeId: 'init-1' },
				}),
			);
		});
	});

	describe('initiative.getAll', () => {
		it('calls the initiatives query with the limit', async () => {
			const allItemsSpy = vi
				.spyOn(GenericFunctions, 'linearApiRequestAllItems')
				.mockResolvedValue([{ id: 'init-1', name: 'Q3 Goals' }]);

			vi.mocked(mockThis.getNodeParameter).mockImplementation((param: string) => {
				if (param === 'returnAll') return false;
				if (param === 'limit') return 50;
				return undefined;
			});

			await initiativeGetAll.execute.call(mockThis, [{ json: {} }]);

			expect(allItemsSpy).toHaveBeenCalledWith(
				'data.initiatives',
				expect.objectContaining({ query: expect.stringContaining('initiatives') }),
				50,
			);
		});
	});

	describe('initiative.archive', () => {
		it('sends the initiativeArchive mutation with the resolved ID', async () => {
			apiRequestSpy = vi.spyOn(GenericFunctions, 'linearApiRequest').mockResolvedValue({
				data: { initiativeArchive: { success: true } },
			});

			vi.mocked(mockThis.getNodeParameter).mockImplementation((param: string) => {
				if (param === 'initiativeId') return 'init-1';
				return undefined;
			});

			await initiativeArchive.execute.call(mockThis, [{ json: {} }]);

			expect(apiRequestSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					query: expect.stringContaining('initiativeArchive'),
					variables: { initiativeId: 'init-1' },
				}),
			);
		});
	});

	describe('listSearch.getInitiatives', () => {
		it('maps nodes to results and forwards a search filter', async () => {
			const loadOptionsThis = {} as unknown as ILoadOptionsFunctions;
			const searchSpy = vi.spyOn(GenericFunctions, 'linearApiRequest').mockResolvedValue({
				data: {
					initiatives: {
						nodes: [
							{ id: 'init-1', name: 'Q3 Goals' },
							{ id: 'init-2', name: 'Q4 Goals' },
						],
						pageInfo: { hasNextPage: true, endCursor: 'cursor-abc' },
					},
				},
			});

			const result = await getInitiatives.call(loadOptionsThis, 'Q');

			expect(searchSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					variables: expect.objectContaining({
						filter: { name: { containsIgnoreCase: 'Q' } },
					}),
				}),
			);
			expect(result.results).toEqual([
				{ name: 'Q3 Goals', value: 'init-1' },
				{ name: 'Q4 Goals', value: 'init-2' },
			]);
			expect(result.paginationToken).toBe('cursor-abc');
		});
	});
});
