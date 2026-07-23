import type { IBinaryData, IExecuteFunctions, INode } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { execute } from '../../../v2/actions/file/upload.operation';
import { versionDescription } from '../../../v2/actions/versionDescription';
import {
	MAX_SIMPLE_UPLOAD_BYTES,
	SHAREPOINT_ILLEGAL_FILE_NAME_CHARS,
} from '../../../v2/helpers/utils';
import { MicrosoftSharePointV2 } from '../../../v2/MicrosoftSharePointV2.node';
import * as transport from '../../../v2/transport';
import type * as _importType0 from '../../../v2/transport';

vi.mock('../../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
	};
});

const SITE_ID = 'contoso.sharepoint.com,g1,g2';
const ENCODED_SITE_ID = encodeURIComponent(SITE_ID);
const FOLDER_ID = '01SPEVVYBKV2ZKHGJASRA2HC7MOGBMUMAA';
const FILE_BYTES = Buffer.from('col1,col2\n1,2\n');

const DRIVE_ITEM_REPLY = {
	id: '01SPEVVYELNAJ4S3XKNBBIEUJZOWXGE64U',
	name: 'report.csv',
	size: FILE_BYTES.byteLength,
	webUrl: 'https://contoso.sharepoint.com/sites/mysite/Shared%20Documents/report.csv',
};

describe('Microsoft SharePoint v2 — File: Upload', () => {
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
		folder: FOLDER_ID,
		fileName: 'report.csv',
		binaryPropertyName: 'data',
	};

	beforeEach(() => {
		vi.clearAllMocks();
		ctx = mockDeep<IExecuteFunctions>();
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
		setParams(baseParams);
		ctx.helpers.assertBinaryData.mockReturnValue(inMemoryBinary());
		apiRequest.mockResolvedValue(DRIVE_ITEM_REPLY);
	});

	it('uploads the binary bytes to the chosen folder and returns the drive item', async () => {
		const response = await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledTimes(1);
		const [method, resource, body, , , headers] = apiRequest.mock.calls[0];
		expect(method).toBe('PUT');
		expect(resource).toBe(
			`/v1.0/sites/${ENCODED_SITE_ID}/drive/items/${FOLDER_ID}:/report.csv:/content`,
		);
		expect(Buffer.isBuffer(body)).toBe(true);
		expect((body as Buffer).equals(FILE_BYTES)).toBe(true);
		expect(headers).toEqual({ 'Content-Type': 'text/csv' });
		expect(response).toEqual(DRIVE_ITEM_REPLY);
	});

	it('encodes the file name and folder ID into their path segments', async () => {
		setParams({ ...baseParams, folder: 'weird folder#id', fileName: 'Q1 report #final.csv' });

		await execute.call(ctx, 0);

		const [, resource] = apiRequest.mock.calls[0];
		expect(resource).toBe(
			`/v1.0/sites/${ENCODED_SITE_ID}/drive/items/weird%20folder%23id:/Q1%20report%20%23final.csv:/content`,
		);
	});

	it('falls back to an octet-stream content type when the binary has none', async () => {
		ctx.helpers.assertBinaryData.mockReturnValue(
			inMemoryBinary({ mimeType: undefined as unknown as string }),
		);

		await execute.call(ctx, 0);

		const [, , , , , headers] = apiRequest.mock.calls[0];
		expect(headers).toEqual({ 'Content-Type': 'application/octet-stream' });
	});

	it('reads filesystem-mode binary data through the buffer helper after the size check', async () => {
		ctx.helpers.assertBinaryData.mockReturnValue(
			inMemoryBinary({ id: 'binary-data-id', data: '' }),
		);
		ctx.helpers.getBinaryMetadata.mockResolvedValue({
			fileSize: FILE_BYTES.byteLength,
			mimeType: 'text/csv',
			fileName: 'original.csv',
		});
		ctx.helpers.getBinaryDataBuffer.mockResolvedValue(FILE_BYTES);

		await execute.call(ctx, 0);

		expect(ctx.helpers.getBinaryMetadata).toHaveBeenCalledWith('binary-data-id');
		expect(ctx.helpers.getBinaryDataBuffer).toHaveBeenCalledWith(0, 'data');
		const [, , body] = apiRequest.mock.calls[0];
		expect((body as Buffer).equals(FILE_BYTES)).toBe(true);
	});

	describe('filename validation (before anything is sent)', () => {
		it.each(SHAREPOINT_ILLEGAL_FILE_NAME_CHARS)(
			'rejects a file name containing %s and names the character',
			async (char) => {
				setParams({ ...baseParams, fileName: `report${char}v2.csv` });

				await expect(execute.call(ctx, 0)).rejects.toThrow(
					`contains characters that SharePoint doesn't allow: ${char}`,
				);
				expect(apiRequest).not.toHaveBeenCalled();
			},
		);

		it('rejects an empty file name', async () => {
			setParams({ ...baseParams, fileName: '   ' });

			await expect(execute.call(ctx, 0)).rejects.toThrow('File name must be set!');
			expect(apiRequest).not.toHaveBeenCalled();
		});
	});

	describe('size cap (before anything is sent)', () => {
		it('rejects an oversized file from its metadata, without reading it', async () => {
			ctx.helpers.assertBinaryData.mockReturnValue(
				inMemoryBinary({ id: 'binary-data-id', data: '' }),
			);
			ctx.helpers.getBinaryMetadata.mockResolvedValue({
				fileSize: MAX_SIMPLE_UPLOAD_BYTES + 1,
				mimeType: 'application/zip',
				fileName: 'big.zip',
			});

			await expect(execute.call(ctx, 0)).rejects.toThrow(
				'The file is 251 MB, which is larger than the 250 MB limit for SharePoint uploads',
			);
			expect(ctx.helpers.getBinaryDataBuffer).not.toHaveBeenCalled();
			expect(apiRequest).not.toHaveBeenCalled();
		});

		it('accepts a file exactly at the limit', async () => {
			ctx.helpers.assertBinaryData.mockReturnValue(
				inMemoryBinary({ id: 'binary-data-id', data: '' }),
			);
			ctx.helpers.getBinaryMetadata.mockResolvedValue({
				fileSize: MAX_SIMPLE_UPLOAD_BYTES,
				mimeType: 'application/zip',
				fileName: 'exactly-250mb.zip',
			});
			ctx.helpers.getBinaryDataBuffer.mockResolvedValue(FILE_BYTES);

			await expect(execute.call(ctx, 0)).resolves.toEqual(DRIVE_ITEM_REPLY);
		});
	});

	it("rejects when the 'Site' parameter is empty", async () => {
		setParams({ ...baseParams, site: { mode: 'id', value: '' } });

		await expect(execute.call(ctx, 0)).rejects.toThrow("The 'Site' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it("rejects when the 'Parent Folder' parameter is empty", async () => {
		setParams({ ...baseParams, folder: '' });

		await expect(execute.call(ctx, 0)).rejects.toThrow("The 'Parent Folder' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('resolves a pasted site URL before uploading', async () => {
		setParams({
			...baseParams,
			site: { mode: 'url', value: 'https://contoso.sharepoint.com/sites/mysite' },
		});
		apiRequest.mockImplementation(async (_method: string, resource: string) =>
			resource.startsWith('/v1.0/sites/contoso.sharepoint.com:')
				? { id: SITE_ID }
				: DRIVE_ITEM_REPLY,
		);

		const response = await execute.call(ctx, 0);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			'/v1.0/sites/contoso.sharepoint.com:/sites/mysite',
			{},
			{ $select: 'id' },
		);
		expect(response).toEqual(DRIVE_ITEM_REPLY);
	});

	describe('router wiring', () => {
		beforeEach(() => {
			ctx.getInputData.mockReturnValue([{ json: {} }]);
			ctx.continueOnFail.mockReturnValue(false);
			ctx.helpers.returnJsonArray.mockImplementation((data) =>
				(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
			);
			ctx.helpers.constructExecutionMetaData.mockImplementation((inputData, options) =>
				inputData.map((data) => ({ ...data, pairedItem: options?.itemData })),
			);
		});

		it('routes resource file / operation upload and wraps the drive item with paired-item data', async () => {
			const node = new MicrosoftSharePointV2(versionDescription);
			setParams({ ...baseParams, resource: 'file', operation: 'upload' });

			const result = await node.execute.call(ctx);

			expect(result).toEqual([[{ json: DRIVE_ITEM_REPLY, pairedItem: { item: 0 } }]]);
		});

		it('rejects an unsupported file operation', async () => {
			const node = new MicrosoftSharePointV2(versionDescription);
			setParams({ ...baseParams, resource: 'file', operation: 'delete' });

			await expect(node.execute.call(ctx)).rejects.toThrow(
				'The operation "delete" is not supported!',
			);
		});
	});
});
