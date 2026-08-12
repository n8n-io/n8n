import type {
	IBinaryData,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	IProjectFileWriteService,
	ProjectFileNodeOutput,
} from 'n8n-workflow';
import { Readable } from 'node:stream';
import { mock } from 'vitest-mock-extended';

import { ProjectFile } from '../ProjectFile.node';

const node: INode = {
	id: 'test-node',
	name: 'Add file to project',
	type: 'n8n-nodes-base.projectFile',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const storedFile: ProjectFileNodeOutput = {
	id: 'file-id',
	name: 'report.csv',
	mimeType: 'text/csv',
	fileSizeBytes: 12,
	projectId: 'project-id',
	createdAt: '2026-08-12T00:00:00.000Z',
	updatedAt: '2026-08-12T00:00:00.000Z',
	overwritten: false,
};

type SetupOptions = {
	items?: INodeExecutionData[];
	binaryData?: Partial<IBinaryData>;
	parameters?: Record<string, unknown>;
	proxyAvailable?: boolean;
	continueOnFail?: boolean;
	addFile?: IProjectFileWriteService['addFile'];
};

function setup({
	items = [{ json: {}, binary: { data: mock<IBinaryData>() } }],
	binaryData = {},
	parameters = {},
	proxyAvailable = true,
	continueOnFail = false,
	addFile = vi.fn().mockResolvedValue(storedFile),
}: SetupOptions = {}) {
	const context = mock<IExecuteFunctions>();
	const proxy = mock<IProjectFileWriteService>({ addFile });

	const resolvedParameters: Record<string, unknown> = {
		binaryPropertyName: 'data',
		fileName: 'report.csv',
		overwrite: true,
		...parameters,
	};

	context.getNode.mockReturnValue(node);
	context.getInputData.mockReturnValue(items);
	context.continueOnFail.mockReturnValue(continueOnFail);
	context.getNodeParameter.mockImplementation(
		(name: string) => resolvedParameters[name] as ReturnType<IExecuteFunctions['getNodeParameter']>,
	);

	const helpers = {
		assertBinaryData: vi.fn().mockReturnValue({
			mimeType: 'text/csv',
			fileName: 'report.csv',
			bytes: 12,
			...binaryData,
		}),
		getBinaryStream: vi.fn().mockResolvedValue(Readable.from('a,b\n1,2\n')),
		getBinaryDataBuffer: vi.fn().mockResolvedValue(Buffer.from('a,b\n1,2\n')),
		getProjectFileProxy: proxyAvailable ? vi.fn().mockResolvedValue(proxy) : undefined,
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	context.helpers = helpers as any;

	return { context, helpers, proxy };
}

describe('Add file to project node', () => {
	it('streams a persisted binary instead of buffering it', async () => {
		const { context, helpers, proxy } = setup({ binaryData: { id: 'filesystem-v2:abc' } });

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
		const { context, helpers, proxy } = setup({ binaryData: { id: undefined } });

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
		const { context } = setup({ items: [{ json: { unrelated: true }, binary }] });

		const result = await new ProjectFile().execute.call(context);

		expect(result).toEqual([[{ json: { ...storedFile }, binary, pairedItem: { item: 0 } }]]);
	});

	it('processes every input item', async () => {
		const { context, proxy } = setup({
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
		const { context } = setup({ proxyAvailable: false });

		await expect(new ProjectFile().execute.call(context)).rejects.toThrow(
			'Project files are not available on this instance',
		);
	});

	it('rethrows a store failure', async () => {
		const { context } = setup({
			addFile: vi.fn().mockRejectedValue(new Error("A file named 'report.csv' already exists")),
		});

		await expect(new ProjectFile().execute.call(context)).rejects.toThrow(
			"A file named 'report.csv' already exists",
		);
	});

	it('collects the error on the item when continueOnFail is on', async () => {
		const { context } = setup({
			continueOnFail: true,
			addFile: vi.fn().mockRejectedValue(new Error('Storage limit reached')),
		});

		const result = await new ProjectFile().execute.call(context);

		expect(result).toEqual([
			[{ json: { error: 'Storage limit reached' }, pairedItem: { item: 0 } }],
		]);
	});
});
