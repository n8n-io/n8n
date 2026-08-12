import type {
	IBinaryData,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	IProjectFileService,
	ProjectFileNodeOutput,
} from 'n8n-workflow';
import { Readable } from 'node:stream';
import type { Mock } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';

export const node: INode = {
	id: 'test-node',
	name: 'Project file',
	type: 'n8n-nodes-base.projectFile',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

export const STORED_FILE: ProjectFileNodeOutput = {
	id: 'file-id',
	name: 'report.csv',
	mimeType: 'text/csv',
	fileSizeBytes: 12,
	projectId: 'project-id',
	createdAt: '2026-08-12T00:00:00.000Z',
	updatedAt: '2026-08-12T00:00:00.000Z',
};

type SetupOptions = {
	operation: 'write' | 'read' | 'delete';
	items?: INodeExecutionData[];
	binaryData?: Partial<IBinaryData>;
	parameters?: Record<string, unknown>;
	proxyAvailable?: boolean;
	continueOnFail?: boolean;
	proxyOverrides?: Partial<IProjectFileService>;
};

/** Named explicitly: the inferred shape references types that cannot be named. */
type SetupResult = {
	context: MockProxy<IExecuteFunctions>;
	helpers: {
		assertBinaryData: Mock;
		getBinaryStream: Mock;
		getBinaryDataBuffer: Mock;
		prepareBinaryData: Mock;
		getProjectFileProxy: Mock | undefined;
	};
	proxy: MockProxy<IProjectFileService>;
	preparedBinary: IBinaryData;
};

export function setup({
	operation,
	items = [{ json: {}, binary: { data: mock<IBinaryData>() } }],
	binaryData = {},
	parameters = {},
	proxyAvailable = true,
	continueOnFail = false,
	proxyOverrides = {},
}: SetupOptions): SetupResult {
	const context = mock<IExecuteFunctions>();

	const preparedBinary = mock<IBinaryData>({ id: 'filesystem-v2:execution-copy' });

	const proxy = mock<IProjectFileService>({
		addFile: vi.fn().mockResolvedValue({ ...STORED_FILE, overwritten: false }),
		getFile: vi.fn().mockResolvedValue({ file: STORED_FILE, stream: Readable.from('a,b\n1,2\n') }),
		deleteFile: vi.fn().mockResolvedValue({ id: STORED_FILE.id, name: STORED_FILE.name }),
		listFiles: vi.fn().mockResolvedValue({ count: 1, data: [STORED_FILE] }),
		...proxyOverrides,
	});

	const resolvedParameters: Record<string, unknown> = {
		operation,
		binaryPropertyName: 'data',
		fileName: 'report.csv',
		overwrite: true,
		outputFieldName: 'data',
		file: { mode: 'list', value: 'file-id' },
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
		prepareBinaryData: vi.fn().mockResolvedValue(preparedBinary),
		getProjectFileProxy: proxyAvailable ? vi.fn().mockResolvedValue(proxy) : undefined,
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	context.helpers = helpers as any;

	return { context, helpers, proxy, preparedBinary };
}
