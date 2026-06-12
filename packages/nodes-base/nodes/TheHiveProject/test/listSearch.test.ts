import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { caseSearch, observableSearch, pageSearch } from '../methods/listSearch';

const createLoadOptionsFunctions = (response: unknown[]): ILoadOptionsFunctions =>
	({
		getCredentials: jest.fn().mockResolvedValue({
			url: 'https://thehive.example.com',
			apiKey: 'test-api-key',
		}),
		getNodeParameter: jest.fn(),
		helpers: {
			requestWithAuthentication: jest.fn().mockResolvedValue(response),
		},
	}) as unknown as ILoadOptionsFunctions;

describe('TheHiveProject listSearch', () => {
	it('returns string pagination tokens from shared resource searches', async () => {
		const loadOptionsFunctions = createLoadOptionsFunctions([{ _id: '~case1', title: 'Case 1' }]);

		const result = await caseSearch.call(loadOptionsFunctions);

		expect(result.paginationToken).toBe('100');
	});

	it('returns string pagination tokens from page search', async () => {
		const loadOptionsFunctions = createLoadOptionsFunctions([{ _id: '~page1', title: 'Page 1' }]);

		const result = await pageSearch.call(loadOptionsFunctions);

		expect(result.paginationToken).toBe('100');
	});

	it('returns string pagination tokens from observable search', async () => {
		const loadOptionsFunctions = createLoadOptionsFunctions([
			{ _id: '~observable1', data: 'example.com' },
		]);

		const result = await observableSearch.call(loadOptionsFunctions);

		expect(result.paginationToken).toBe('100');
	});
});
