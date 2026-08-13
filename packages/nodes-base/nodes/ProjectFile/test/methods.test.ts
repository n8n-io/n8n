import type {
	ILoadOptionsFunctions,
	IProjectFileService,
	ProjectFileNodeOutput,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { fileSearch } from '../common/methods';
import { node, STORED_FILE } from './helpers';

function loadOptionsContext(files: ProjectFileNodeOutput[], available = true) {
	const context = mock<ILoadOptionsFunctions>();
	const proxy = mock<IProjectFileService>({
		listFiles: vi.fn().mockResolvedValue({ count: files.length, data: files }),
	});

	context.getNode.mockReturnValue(node);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	context.helpers = {
		getProjectFileProxy: available ? vi.fn().mockResolvedValue(proxy) : undefined,
	} as any;

	return { context, proxy };
}

describe('fileSearch', () => {
	it('lists the project files as pickable results', async () => {
		const { context, proxy } = loadOptionsContext([STORED_FILE]);

		const result = await fileSearch.call(context);

		expect(proxy.listFiles).toHaveBeenCalledWith({ search: undefined, take: 100, skip: 0 });
		expect(result.results).toEqual([{ name: 'report.csv', value: 'file-id' }]);
		expect(result.paginationToken).toBeUndefined();
	});

	it('passes the filter through', async () => {
		const { context, proxy } = loadOptionsContext([STORED_FILE]);

		await fileSearch.call(context, 'rates');

		expect(proxy.listFiles).toHaveBeenCalledWith({ search: 'rates', take: 100, skip: 0 });
	});

	it('paginates while pages come back full', async () => {
		const fullPage = Array.from({ length: 100 }, (_, i) => ({ ...STORED_FILE, id: `f${i}` }));
		const { context, proxy } = loadOptionsContext(fullPage);

		const result = await fileSearch.call(context, undefined, '100');

		expect(proxy.listFiles).toHaveBeenCalledWith({ search: undefined, take: 100, skip: 100 });
		expect(result.paginationToken).toBe('200');
	});

	it('explains itself when the project-files module is disabled', async () => {
		const { context } = loadOptionsContext([], false);

		await expect(fileSearch.call(context)).rejects.toThrow(
			'Project files are not available on this instance',
		);
	});
});
