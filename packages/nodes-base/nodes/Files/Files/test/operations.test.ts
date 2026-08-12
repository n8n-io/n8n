import type {
	IBinaryData,
	IExecuteFunctions,
	INode,
	IProjectFilesService,
	ProjectFileMetadata,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { Readable } from 'node:stream';
import { mock } from 'vitest-mock-extended';

import * as deleteOperation from '../actions/file/deleteFile.operation';
import * as downloadOperation from '../actions/file/download.operation';
import * as getManyOperation from '../actions/file/getMany.operation';
import * as uploadOperation from '../actions/file/upload.operation';

const mockNode: INode = {
	id: 'test-node',
	name: 'Files',
	type: 'n8n-nodes-base.files',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const metadata: ProjectFileMetadata = {
	id: 'file-1',
	name: 'pricing.csv',
	mimeType: 'text/csv',
	sizeBytes: 18,
	createdAt: new Date('2026-08-01T00:00:00Z'),
	updatedAt: new Date('2026-08-10T00:00:00Z'),
};

let ctx: ReturnType<typeof mock<IExecuteFunctions>>;
let proxy: ReturnType<typeof mock<IProjectFilesService>>;
let parameters: Record<string, unknown>;

beforeEach(() => {
	ctx = mock<IExecuteFunctions>();
	proxy = mock<IProjectFilesService>();
	parameters = {};

	ctx.getNode.mockReturnValue(mockNode);
	ctx.getNodeParameter.mockImplementation(
		(name: string, _index: number, fallback?: unknown) => (parameters[name] ?? fallback) as never,
	);

	ctx.helpers = {
		getProjectFilesProxy: vi.fn().mockResolvedValue(proxy),
		prepareBinaryData: vi.fn(),
		assertBinaryData: vi.fn(),
		getBinaryStream: vi.fn(),
	} as any;
});

describe('download operation', () => {
	it('resolves by-name locators and copies the stream into execution binary data', async () => {
		parameters.fileId = { mode: 'name', value: 'pricing.csv' };
		parameters.binaryPropertyOutput = 'data';
		const stream = Readable.from(Buffer.from('sku,price'));
		const binary = mock<IBinaryData>();
		proxy.findByName.mockResolvedValue(metadata);
		proxy.download.mockResolvedValue({ metadata, stream });
		vi.mocked(ctx.helpers.prepareBinaryData).mockResolvedValue(binary);

		const result = await downloadOperation.execute.call(ctx, 0);

		expect(proxy.findByName).toHaveBeenCalledWith('pricing.csv');
		expect(proxy.download).toHaveBeenCalledWith('file-1');
		expect(ctx.helpers.prepareBinaryData).toHaveBeenCalledWith(stream, 'pricing.csv', 'text/csv');
		expect(result).toEqual([
			{
				json: expect.objectContaining({ id: 'file-1', name: 'pricing.csv', sizeBytes: 18 }),
				binary: { data: binary },
				pairedItem: { item: 0 },
			},
		]);
	});

	it('throws a NodeOperationError for an unknown name', async () => {
		parameters.fileId = { mode: 'name', value: 'gone.csv' };
		proxy.findByName.mockResolvedValue(null);

		await expect(downloadOperation.execute.call(ctx, 0)).rejects.toThrow(NodeOperationError);
	});

	it('passes id-mode locator values through unresolved', async () => {
		parameters.fileId = { mode: 'id', value: 'file-9' };
		proxy.download.mockResolvedValue({ metadata, stream: Readable.from('x') });
		vi.mocked(ctx.helpers.prepareBinaryData).mockResolvedValue(mock<IBinaryData>());

		await downloadOperation.execute.call(ctx, 0);

		expect(proxy.findByName).not.toHaveBeenCalled();
		expect(proxy.download).toHaveBeenCalledWith('file-9');
	});
});

describe('upload operation', () => {
	it('streams stored binary data through to the proxy with the conflict mode', async () => {
		parameters.binaryPropertyName = 'data';
		parameters.fileName = 'report.xlsx';
		parameters.conflictMode = 'keepBoth';
		const stream = Readable.from(Buffer.from('bytes'));
		vi.mocked(ctx.helpers.assertBinaryData).mockReturnValue({
			id: 'binary-id',
			mimeType: 'application/vnd.ms-excel',
			data: '',
		} as IBinaryData);
		vi.mocked(ctx.helpers.getBinaryStream).mockResolvedValue(stream);
		proxy.upload.mockResolvedValue(metadata);

		const result = await uploadOperation.execute.call(ctx, 0);

		expect(ctx.helpers.getBinaryStream).toHaveBeenCalledWith('binary-id');
		expect(proxy.upload).toHaveBeenCalledWith(
			'report.xlsx',
			stream,
			{ mimeType: 'application/vnd.ms-excel' },
			'keepBoth',
		);
		expect(result[0].json).toMatchObject({ id: 'file-1', name: 'pricing.csv' });
	});

	it('falls back to a buffer for in-memory binary data and to the binary file name', async () => {
		parameters.binaryPropertyName = 'data';
		parameters.fileName = '';
		parameters.conflictMode = 'replace';
		vi.mocked(ctx.helpers.assertBinaryData).mockReturnValue({
			mimeType: 'text/plain',
			fileName: 'notes.txt',
			data: Buffer.from('hello').toString('base64'),
		} as IBinaryData);
		proxy.upload.mockResolvedValue(metadata);

		await uploadOperation.execute.call(ctx, 0);

		expect(ctx.helpers.getBinaryStream).not.toHaveBeenCalled();
		expect(proxy.upload).toHaveBeenCalledWith(
			'notes.txt',
			Buffer.from('hello'),
			{ mimeType: 'text/plain' },
			'replace',
		);
	});
});

describe('getMany operation', () => {
	it('lists metadata with filter, sort, and limit', async () => {
		parameters.returnAll = false;
		parameters.limit = 5;
		parameters.options = { filterName: 'csv', sortField: 'sizeBytes', sortOrder: 'asc' };
		proxy.getManyAndCount.mockResolvedValue({ count: 1, data: [metadata] });

		const result = await getManyOperation.execute.call(ctx, 0);

		expect(proxy.getManyAndCount).toHaveBeenCalledWith({
			sortBy: 'sizeBytes:asc',
			filter: { name: 'csv' },
			take: 5,
		});
		expect(result).toHaveLength(1);
		expect(result[0].json).toMatchObject({ id: 'file-1', name: 'pricing.csv' });
		expect(result[0].json).not.toHaveProperty('content');
	});
});

describe('deleteFile operation', () => {
	it('deletes by resolved id and returns the name', async () => {
		parameters.fileId = { mode: 'id', value: 'file-1' };
		proxy.deleteFile.mockResolvedValue({ name: 'pricing.csv' });

		const result = await deleteOperation.execute.call(ctx, 0);

		expect(proxy.deleteFile).toHaveBeenCalledWith('file-1');
		expect(result[0].json).toEqual({ deleted: true, name: 'pricing.csv' });
	});
});

describe('module disabled', () => {
	it('fails with the disabled-module message when the helper is missing', async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		ctx.helpers = {} as any;
		parameters.fileId = { mode: 'id', value: 'file-1' };

		await expect(downloadOperation.execute.call(ctx, 0)).rejects.toThrow(
			'File storage is disabled on this instance.',
		);
	});
});
