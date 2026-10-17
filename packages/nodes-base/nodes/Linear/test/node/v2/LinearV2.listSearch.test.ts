import type { ILoadOptionsFunctions } from 'n8n-workflow';

import * as GenericFunctions from '../../../shared/GenericFunctions';
import { getIssues, getStates } from '../../../shared/methods/listSearch';

describe('Linear v2 → listSearch.getIssues', () => {
	const mockThis = {} as unknown as ILoadOptionsFunctions;
	const apiResponse = {
		data: {
			issues: {
				nodes: [{ id: 'uuid-1', identifier: 'CE-123', title: 'Fix the Thing' }],
				pageInfo: { hasNextPage: false, endCursor: null },
			},
		},
	};

	afterEach(() => vi.restoreAllMocks());

	it('filters by number and team key when the filter is an issue identifier', async () => {
		const spy = vi
			.spyOn(GenericFunctions, 'linearApiRequest')
			.mockResolvedValue(apiResponse as never);

		const result = await getIssues.call(mockThis, 'ce-123');

		expect(spy).toHaveBeenCalledWith(
			expect.objectContaining({
				variables: expect.objectContaining({
					filter: {
						and: [{ number: { eq: 123 } }, { team: { key: { eqIgnoreCase: 'ce' } } }],
					},
				}),
			}),
		);
		expect(result.results).toEqual([{ name: 'CE-123 — Fix the Thing', value: 'uuid-1' }]);
	});

	it('filters by title otherwise', async () => {
		const spy = vi
			.spyOn(GenericFunctions, 'linearApiRequest')
			.mockResolvedValue(apiResponse as never);

		await getIssues.call(mockThis, 'fix');

		expect(spy).toHaveBeenCalledWith(
			expect.objectContaining({
				variables: expect.objectContaining({
					filter: { title: { containsIgnoreCase: 'fix' } },
				}),
			}),
		);
	});
});

describe('Linear v2 → listSearch.getStates', () => {
	afterEach(() => vi.restoreAllMocks());

	it('prefixes each state with its team key', async () => {
		vi.spyOn(GenericFunctions, 'linearApiRequest').mockResolvedValue({
			data: {
				workflowStates: {
					nodes: [
						{ id: 's1', name: 'Todo', team: { key: 'ENG' } },
						{ id: 's2', name: 'Todo', team: { key: 'OPS' } },
						{ id: 's3', name: 'Done', team: { key: 'ENG' } },
					],
					pageInfo: { hasNextPage: false, endCursor: null },
				},
			},
		} as never);

		const result = await getStates.call({} as ILoadOptionsFunctions, 'todo');

		expect(result.results).toEqual([
			{ name: 'ENG — Todo', value: 's1' },
			{ name: 'OPS — Todo', value: 's2' },
		]);
	});
});
