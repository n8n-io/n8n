import type { ILoadOptionsFunctions, IProjectFilesService } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { fileSearch } from '../common/methods';

describe('fileSearch', () => {
	const ctx = mock<ILoadOptionsFunctions>();
	const proxy = mock<IProjectFilesService>();

	beforeEach(() => {
		vi.clearAllMocks();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		ctx.helpers = { getProjectFilesProxy: vi.fn().mockResolvedValue(proxy) } as any;
		proxy.getProjectId.mockReturnValue('project-1');
	});

	const makeFiles = (count: number) =>
		Array.from({ length: count }, (_, i) => ({
			id: `file-${i}`,
			name: `file-${i}.csv`,
			mimeType: 'text/csv',
			sizeBytes: 1,
			createdAt: new Date(),
			updatedAt: new Date(),
		}));

	it('maps files to search results with project-scoped urls', async () => {
		proxy.getManyAndCount.mockResolvedValue({ count: 1, data: makeFiles(1) });

		const result = await fileSearch.call(ctx, 'file');

		expect(proxy.getManyAndCount).toHaveBeenCalledWith({
			skip: 0,
			take: 100,
			sortBy: 'name:asc',
			filter: { name: 'file' },
		});
		expect(result.results).toEqual([
			{ name: 'file-0.csv', value: 'file-0', url: '/projects/project-1/files/file-0' },
		]);
		expect(result.paginationToken).toBeUndefined();
	});

	it('paginates with a skip token when a full page comes back', async () => {
		proxy.getManyAndCount.mockResolvedValue({ count: 250, data: makeFiles(100) });

		const first = await fileSearch.call(ctx);
		expect(first.paginationToken).toBe('100');

		await fileSearch.call(ctx, undefined, '100');
		expect(proxy.getManyAndCount).toHaveBeenLastCalledWith(
			expect.objectContaining({ skip: 100, take: 100 }),
		);
	});
});
