import type { IBinaryData, IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { execute } from '../../../v2/actions/file/update.operation';
import {
	MAX_SIMPLE_UPLOAD_BYTES,
	SHAREPOINT_ILLEGAL_FILE_NAME_CHARS,
} from '../../../v2/helpers/utils';
import * as transport from '../../../v2/transport';
import type * as _importType0 from '../../../v2/transport';

// Real transport module except the network helper, so getSharePointCredentialType
// keeps its real behavior; only microsoftApiRequest is stubbed.
vi.mock('../../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
	};
});

const SITE_ID = 'contoso.sharepoint.com,g1,g2';
const ENCODED_SITE_ID = encodeURIComponent(SITE_ID);
const FILE_ID = '01SPEVVYELNAJ4S3XKNBBIEUJZOWXGE64U';
const ITEM_PATH = `/v1.0/sites/${ENCODED_SITE_ID}/drive/items/${FILE_ID}`;
const FILE_BYTES = Buffer.from('new,contents\n3,4\n');

const PATCH_REPLY = { id: FILE_ID, name: 'renamed.csv' };
const PUT_REPLY = { id: FILE_ID, name: 'renamed.csv', size: FILE_BYTES.byteLength };

describe('Microsoft SharePoint v2 — File: Update', () => {
	let ctx: DeepMockProxy<IExecuteFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;

	const setParams = (params: Record<string, unknown>) => {
		ctx.getNodeParameter.mockImplementation(
			(name: string, _itemIndex?: number, fallback?: unknown) =>
				(name in params ? params[name] : fallback) as never,
		);
	};

	const inMemoryBinary = (overrides: Partial<IBinaryData> = {}): IBinaryData =>
		({
			data: FILE_BYTES.toString('base64'),
			mimeType: 'text/csv',
			fileName: 'original.csv',
			...overrides,
		}) as IBinaryData;

	const baseParams = {
		site: { mode: 'id', value: SITE_ID },
		folder: '01SPEVVYBKV2ZKHGJASRA2HC7MOGBMUMAA',
		file: FILE_ID,
		fileName: '',
		changeFileContent: false,
		binaryPropertyName: 'data',
	};

	beforeEach(() => {
		vi.clearAllMocks();
		ctx = mockDeep<IExecuteFunctions>();
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
		setParams(baseParams);
		ctx.helpers.assertBinaryData.mockReturnValue(inMemoryBinary());
	});

	it('renames without touching the contents', async () => {
		setParams({ ...baseParams, fileName: 'renamed.csv' });
		apiRequest.mockResolvedValue(PATCH_REPLY);

		const result = await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(apiRequest).toHaveBeenCalledWith('PATCH', ITEM_PATH, { name: 'renamed.csv' });
		expect(result).toEqual(PATCH_REPLY);
	});

	it('replaces the contents without renaming', async () => {
		setParams({ ...baseParams, changeFileContent: true });
		apiRequest.mockResolvedValue(PUT_REPLY);

		const result = await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledTimes(1);
		const [method, resource, body, , , headers] = apiRequest.mock.calls[0];
		expect(method).toBe('PUT');
		expect(resource).toBe(`${ITEM_PATH}/content`);
		expect((body as Buffer).equals(FILE_BYTES)).toBe(true);
		expect(headers).toEqual({ 'Content-Type': 'text/csv' });
		expect(result).toEqual(PUT_REPLY);
	});

	it('renames first, then replaces contents, returning the content reply', async () => {
		setParams({ ...baseParams, fileName: 'renamed.csv', changeFileContent: true });
		apiRequest.mockImplementation(async (method: string) =>
			method === 'PATCH' ? PATCH_REPLY : PUT_REPLY,
		);

		const result = await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(apiRequest.mock.calls[0][0]).toBe('PATCH');
		expect(apiRequest.mock.calls[1][0]).toBe('PUT');
		expect(result).toEqual(PUT_REPLY);
	});

	it('names the already-applied rename when replacing contents fails afterwards', async () => {
		setParams({ ...baseParams, fileName: 'renamed.csv', changeFileContent: true });
		apiRequest.mockImplementation(async (method: string) => {
			if (method === 'PATCH') return PATCH_REPLY;
			throw new NodeOperationError(mock<INode>(), 'Graph rejected the upload');
		});

		let thrown: NodeOperationError | undefined;
		try {
			await execute.call(ctx, 0);
		} catch (error) {
			thrown = error as NodeOperationError;
		}

		expect(apiRequest).toHaveBeenCalledTimes(2);
		expect(thrown).toBeInstanceOf(NodeOperationError);
		expect(thrown?.message).toBe(
			'The file was renamed to "renamed.csv", but replacing its contents failed: Graph rejected the upload',
		);
		expect(thrown?.description).toContain('The rename has already taken effect');
	});

	it('rejects an oversized replacement before the rename is sent', async () => {
		// A local failure after a successful PATCH would leave a half-applied
		// update — the size check must run before any request
		setParams({ ...baseParams, fileName: 'renamed.csv', changeFileContent: true });
		ctx.helpers.assertBinaryData.mockReturnValue(inMemoryBinary({ id: 'binary-id', data: '' }));
		ctx.helpers.getBinaryMetadata.mockResolvedValue({
			fileSize: MAX_SIMPLE_UPLOAD_BYTES + 1,
			mimeType: 'application/zip',
			fileName: 'big.zip',
		});

		await expect(execute.call(ctx, 0)).rejects.toThrow(
			'larger than the 250 MB limit for SharePoint uploads',
		);
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it.each(SHAREPOINT_ILLEGAL_FILE_NAME_CHARS)(
		'rejects a new name containing %s before any request',
		async (char) => {
			setParams({ ...baseParams, fileName: `renamed${char}v2.csv` });

			await expect(execute.call(ctx, 0)).rejects.toThrow(
				`contains characters that SharePoint doesn't allow: ${char}`,
			);
			expect(apiRequest).not.toHaveBeenCalled();
		},
	);

	it('rejects when there is nothing to update', async () => {
		await expect(execute.call(ctx, 0)).rejects.toThrow('Nothing to update');
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it("rejects when the 'File' parameter is empty", async () => {
		setParams({ ...baseParams, file: '', fileName: 'renamed.csv' });

		await expect(execute.call(ctx, 0)).rejects.toThrow("The 'File' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});
});
