import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { searchProjects } from '../GenericFunctions';

const requestOAuth2 = jest.fn();

describe('Google Cloud Storage GenericFunctions', () => {
	let mockContext: MockProxy<ILoadOptionsFunctions>;

	beforeEach(() => {
		mockContext = mock<ILoadOptionsFunctions>();
		mockContext.helpers = { requestOAuth2 } as unknown as typeof mockContext.helpers;
		jest.clearAllMocks();
	});

	describe('searchProjects', () => {
		it('returns formatted project results', async () => {
			requestOAuth2.mockResolvedValueOnce({
				projects: [
					{ name: 'My Project', projectId: 'my-project' },
					{ name: 'Other Project', projectId: 'other-project' },
				],
			});

			const result = await searchProjects.call(mockContext);

			expect(result.results).toEqual([
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					name: 'My Project (my-project)',
					value: 'my-project',
					url: 'https://console.cloud.google.com/storage/browser?project=my-project',
				},
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					name: 'Other Project (other-project)',
					value: 'other-project',
					url: 'https://console.cloud.google.com/storage/browser?project=other-project',
				},
			]);
		});

		it('always filters to active lifecycle state', async () => {
			requestOAuth2.mockResolvedValueOnce({ projects: [] });

			await searchProjects.call(mockContext);

			expect(requestOAuth2).toHaveBeenCalledWith(
				'googleCloudStorageOAuth2Api',
				expect.objectContaining({
					qs: expect.objectContaining({ filter: 'lifecycleState:ACTIVE' }),
				}),
			);
		});

		it('passes filter string as server-side query parameter', async () => {
			requestOAuth2.mockResolvedValueOnce({ projects: [] });

			await searchProjects.call(mockContext, 'myproj');

			expect(requestOAuth2).toHaveBeenCalledWith(
				'googleCloudStorageOAuth2Api',
				expect.objectContaining({
					qs: expect.objectContaining({
						filter: '(name:myproj* OR id:myproj*) AND lifecycleState:ACTIVE',
					}),
				}),
			);
		});

		it('passes pagination token when provided', async () => {
			requestOAuth2.mockResolvedValueOnce({ projects: [] });

			await searchProjects.call(mockContext, undefined, 'page-token-123');

			expect(requestOAuth2).toHaveBeenCalledWith(
				'googleCloudStorageOAuth2Api',
				expect.objectContaining({
					qs: expect.objectContaining({ pageToken: 'page-token-123' }),
				}),
			);
		});

		it('returns pagination token from response', async () => {
			requestOAuth2.mockResolvedValueOnce({
				projects: [],
				nextPageToken: 'next-page',
			});

			const result = await searchProjects.call(mockContext);

			expect(result.paginationToken).toBe('next-page');
		});

		it('handles response with no projects', async () => {
			requestOAuth2.mockResolvedValueOnce({});

			const result = await searchProjects.call(mockContext);

			expect(result.results).toHaveLength(0);
			expect(result.paginationToken).toBeUndefined();
		});
	});
});
