import { ProjectFile } from '../ProjectFile.node';
import { setup } from './helpers';

describe('Project file node · delete', () => {
	it('deletes the selected file and reports what went', async () => {
		const { context, proxy } = setup({ operation: 'delete' });

		const result = await new ProjectFile().execute.call(context);

		expect(proxy.deleteFile).toHaveBeenCalledWith({ by: 'id', id: 'file-id' });
		expect(result).toEqual([
			[{ json: { id: 'file-id', name: 'report.csv', deleted: true }, pairedItem: { item: 0 } }],
		]);
	});

	it('deletes by name', async () => {
		const { context, proxy } = setup({
			operation: 'delete',
			parameters: { 'file.mode': 'name', 'file.value': 'rates-latest.csv' },
		});

		await new ProjectFile().execute.call(context);

		expect(proxy.deleteFile).toHaveBeenCalledWith({ by: 'name', name: 'rates-latest.csv' });
	});

	it('returns no binary data', async () => {
		const { context } = setup({ operation: 'delete' });

		const result = await new ProjectFile().execute.call(context);

		expect(result[0][0].binary).toBeUndefined();
	});

	it('deletes one file per input item', async () => {
		const { context, proxy } = setup({
			operation: 'delete',
			items: [{ json: {} }, { json: {} }],
		});

		await new ProjectFile().execute.call(context);

		expect(proxy.deleteFile).toHaveBeenCalledTimes(2);
	});

	it('fails when the file does not exist', async () => {
		const { context } = setup({
			operation: 'delete',
			proxyOverrides: {
				deleteFile: vi.fn().mockRejectedValue(new Error("No file with name 'gone.csv' exists")),
			},
		});

		await expect(new ProjectFile().execute.call(context)).rejects.toThrow(
			"No file with name 'gone.csv' exists",
		);
	});
});
