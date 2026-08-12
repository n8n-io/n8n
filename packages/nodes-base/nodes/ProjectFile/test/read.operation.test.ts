import { Readable } from 'node:stream';

import { ProjectFile } from '../ProjectFile.node';
import { setup, STORED_FILE } from './helpers';

describe('Project file node · read', () => {
	it('copies the file into execution storage as binary data', async () => {
		const { context, helpers, preparedBinary } = setup({ operation: 'read' });

		const result = await new ProjectFile().execute.call(context);

		// The stored bytes are streamed into a fresh, execution-scoped binary.
		expect(helpers.prepareBinaryData).toHaveBeenCalledWith(
			expect.any(Readable),
			'report.csv',
			'text/csv',
		);
		expect(result).toEqual([
			[{ json: { ...STORED_FILE }, binary: { data: preparedBinary }, pairedItem: { item: 0 } }],
		]);
	});

	it('never exposes the stored file reference in its output', async () => {
		// The project file's own reference must not reach execution data:
		// `GET /rest/binary-data?id=` performs no ownership check, so it would be a
		// cross-project read for anyone who can view the execution.
		const { context, proxy } = setup({
			operation: 'read',
			proxyOverrides: {
				getFile: vi.fn().mockResolvedValue({
					file: STORED_FILE,
					stream: Readable.from('a,b\n1,2\n'),
				}),
			},
		});

		const result = await new ProjectFile().execute.call(context);

		expect(JSON.stringify(result[0][0].json)).not.toContain('filesystem-v2');
		expect(result[0][0].json).not.toHaveProperty('binaryDataId');
		expect(proxy.getFile).toHaveBeenCalled();
	});

	it('puts the file in the configured output field', async () => {
		const { context, preparedBinary } = setup({
			operation: 'read',
			parameters: { outputFieldName: 'attachment' },
		});

		const result = await new ProjectFile().execute.call(context);

		expect(result[0][0].binary).toEqual({ attachment: preparedBinary });
	});

	it('addresses the file by id when the selector is a list or id', async () => {
		const { context, proxy } = setup({
			operation: 'read',
			parameters: { 'file.mode': 'list', 'file.value': 'file-id' },
		});

		await new ProjectFile().execute.call(context);

		expect(proxy.getFile).toHaveBeenCalledWith({ by: 'id', id: 'file-id' });
	});

	it('addresses the file by name when the selector is a name', async () => {
		const { context, proxy } = setup({
			operation: 'read',
			parameters: { 'file.mode': 'name', 'file.value': 'rates-latest.csv' },
		});

		await new ProjectFile().execute.call(context);

		expect(proxy.getFile).toHaveBeenCalledWith({ by: 'name', name: 'rates-latest.csv' });
	});

	it('collects the error on the item when continueOnFail is on', async () => {
		const { context } = setup({
			operation: 'read',
			continueOnFail: true,
			proxyOverrides: {
				getFile: vi.fn().mockRejectedValue(new Error("No file with name 'nope.csv' exists")),
			},
		});

		const result = await new ProjectFile().execute.call(context);

		expect(result[0][0].json).toEqual({ error: "No file with name 'nope.csv' exists" });
	});
});
