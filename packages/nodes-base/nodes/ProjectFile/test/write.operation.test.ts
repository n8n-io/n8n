import type { IBinaryData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ProjectFile } from '../ProjectFile.node';
import { setup, STORED_FILE } from './helpers';

describe('Project file node · write', () => {
	it('streams a persisted binary instead of buffering it', async () => {
		const { context, helpers, proxy } = setup({
			operation: 'write',
			binaryData: { id: 'filesystem-v2:abc' },
		});

		await new ProjectFile().execute.call(context);

		expect(helpers.getBinaryStream).toHaveBeenCalledWith('filesystem-v2:abc');
		expect(helpers.getBinaryDataBuffer).not.toHaveBeenCalled();
		expect(proxy.addFile).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'report.csv',
				mimeType: 'text/csv',
				sizeBytes: 12,
				source: expect.objectContaining({ type: 'stream' }),
			}),
			{ overwrite: true },
		);
	});

	it('buffers a binary that is still held in memory', async () => {
		const { context, helpers, proxy } = setup({
			operation: 'write',
			binaryData: { id: undefined },
		});

		await new ProjectFile().execute.call(context);

		expect(helpers.getBinaryStream).not.toHaveBeenCalled();
		expect(helpers.getBinaryDataBuffer).toHaveBeenCalledWith(0, 'data');
		expect(proxy.addFile).toHaveBeenCalledWith(
			expect.objectContaining({ source: { type: 'buffer', buffer: expect.any(Buffer) } }),
			{ overwrite: true },
		);
	});

	it('forwards the file name and overwrite parameters', async () => {
		const { context, proxy } = setup({
			operation: 'write',
			parameters: { fileName: 'rates-latest.csv', overwrite: false },
		});

		await new ProjectFile().execute.call(context);

		expect(proxy.addFile).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'rates-latest.csv' }),
			{ overwrite: false },
		);
	});

	it('returns the stored metadata and passes the input binary through', async () => {
		const binary = { data: mock<IBinaryData>() };
		const { context } = setup({
			operation: 'write',
			items: [{ json: { unrelated: true }, binary }],
		});

		const result = await new ProjectFile().execute.call(context);

		expect(result).toEqual([
			[{ json: { ...STORED_FILE, overwritten: false }, binary, pairedItem: { item: 0 } }],
		]);
	});

	it('processes every input item', async () => {
		const { context, proxy } = setup({
			operation: 'write',
			items: [{ json: {} }, { json: {} }, { json: {} }],
		});

		const result = await new ProjectFile().execute.call(context);

		expect(proxy.addFile).toHaveBeenCalledTimes(3);
		expect(result[0]).toHaveLength(3);
		expect(result[0].map((item) => item.pairedItem)).toEqual([
			{ item: 0 },
			{ item: 1 },
			{ item: 2 },
		]);
	});

	it('throws when the project-files module is disabled', async () => {
		const { context } = setup({ operation: 'write', proxyAvailable: false });

		await expect(new ProjectFile().execute.call(context)).rejects.toThrow(
			'Project files are not available on this instance',
		);
	});

	it('rethrows a store failure', async () => {
		const { context } = setup({
			operation: 'write',
			proxyOverrides: {
				addFile: vi.fn().mockRejectedValue(new Error("A file named 'report.csv' already exists")),
			},
		});

		await expect(new ProjectFile().execute.call(context)).rejects.toThrow(
			"A file named 'report.csv' already exists",
		);
	});

	it('collects the error on the item when continueOnFail is on', async () => {
		const { context } = setup({
			operation: 'write',
			continueOnFail: true,
			proxyOverrides: {
				addFile: vi.fn().mockRejectedValue(new Error('Storage limit reached')),
			},
		});

		const result = await new ProjectFile().execute.call(context);

		expect(result).toEqual([
			[{ json: { error: 'Storage limit reached' }, pairedItem: { item: 0 } }],
		]);
	});
});
