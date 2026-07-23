import type { IBinaryData, IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { execute } from '../../../v2/actions/file/download.operation';
import { versionDescription } from '../../../v2/actions/versionDescription';
import { MicrosoftSharePointV2 } from '../../../v2/MicrosoftSharePointV2.node';
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
const FILE_BYTES = Buffer.from('col1,col2\n1,2\n');
const DOWNLOAD_URL =
	'https://contoso.sharepoint.com/_layouts/15/download.aspx?UniqueId=abc&tempauth=eyJ0eXAi';

const METADATA_REPLY = {
	id: FILE_ID,
	name: 'report.csv',
	file: { mimeType: 'text/csv' },
	'@microsoft.graph.downloadUrl': DOWNLOAD_URL,
};

const PREPARED_BINARY = {
	data: FILE_BYTES.toString('base64'),
	mimeType: 'text/csv',
	fileName: 'report.csv',
} as IBinaryData;

describe('Microsoft SharePoint v2 — File: Download', () => {
	let ctx: DeepMockProxy<IExecuteFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;

	const setParams = (params: Record<string, unknown>) => {
		ctx.getNodeParameter.mockImplementation(
			(name: string, _itemIndex?: number, fallback?: unknown) =>
				(name in params ? params[name] : fallback) as never,
		);
	};

	const baseParams = {
		site: { mode: 'id', value: SITE_ID },
		folder: '01SPEVVYBKV2ZKHGJASRA2HC7MOGBMUMAA',
		file: FILE_ID,
		binaryPropertyName: 'data',
	};

	beforeEach(() => {
		vi.clearAllMocks();
		ctx = mockDeep<IExecuteFunctions>();
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
		setParams(baseParams);
		apiRequest.mockResolvedValue({ ...METADATA_REPLY });
		ctx.helpers.httpRequest.mockResolvedValue({
			body: FILE_BYTES,
			headers: { 'content-type': 'text/csv' },
		});
		ctx.helpers.prepareBinaryData.mockResolvedValue(PREPARED_BINARY);
	});

	it('downloads the file bytes under the correct name and mime type', async () => {
		const result = await execute.call(ctx, 0);

		// One authenticated call: the metadata GET (downloadUrl arrives by default)
		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			`/v1.0/sites/${ENCODED_SITE_ID}/drive/items/${FILE_ID}`,
		);
		const [payload, fileName, mimeType] = ctx.helpers.prepareBinaryData.mock.calls[0];
		expect((payload as Buffer).equals(FILE_BYTES)).toBe(true);
		expect(fileName).toBe('report.csv');
		expect(mimeType).toBe('text/csv');
		expect(result).toEqual({ json: {}, binary: { data: PREPARED_BINARY } });
	});

	it('never sends sign-in details to the download link', async () => {
		await execute.call(ctx, 0);

		// 1. The content fetch goes through the deliberately unauthenticated
		//    helper. The whole options object is pinned so that credential
		//    material added under ANY field (headers, qs, auth) fails this test.
		expect(ctx.helpers.httpRequest).toHaveBeenCalledTimes(1);
		expect(ctx.helpers.httpRequest.mock.calls[0][0]).toEqual({
			method: 'GET',
			url: DOWNLOAD_URL,
			returnFullResponse: true,
			encoding: 'arraybuffer',
			json: false,
		});

		// 2. The authenticated channel never sees the CDN URL
		for (const call of apiRequest.mock.calls) {
			expect(call[4]).not.toBe(DOWNLOAD_URL);
		}

		// 3. No authenticated helper fires for the content
		expect(ctx.helpers.httpRequestWithAuthentication).not.toHaveBeenCalled();
		expect(ctx.helpers.requestOAuth2).not.toHaveBeenCalled();
		expect(ctx.helpers.requestWithAuthentication).not.toHaveBeenCalled();
	});

	it('reports a failed content fetch without exposing the download link', async () => {
		// Shaped like an axios error: the config carries the full pre-authorized URL
		ctx.helpers.httpRequest.mockRejectedValue(
			Object.assign(new Error('Request failed with status code 403'), {
				config: { url: DOWNLOAD_URL },
			}),
		);

		let thrown: NodeOperationError | undefined;
		try {
			await execute.call(ctx, 0);
		} catch (error) {
			thrown = error as NodeOperationError;
		}

		expect(thrown).toBeInstanceOf(NodeOperationError);
		expect(thrown?.message).toBe(
			'Downloading the file contents failed: Request failed with status code 403',
		);
		expect(thrown?.description).toContain('may have expired');
		// Stored execution errors are a spread of the thrown error — the axios
		// config (and the token in its URL) must not survive the wrap
		expect(thrown?.message).not.toContain(DOWNLOAD_URL);
		expect(Object.getOwnPropertyNames(thrown)).not.toContain('config');
	});

	it('rejects a pasted ID that is not a file, without fetching content', async () => {
		apiRequest.mockResolvedValue({ id: FILE_ID, name: 'A folder', folder: {} });

		await expect(execute.call(ctx, 0)).rejects.toThrow('The selected item is not a file');
		expect(ctx.helpers.httpRequest).not.toHaveBeenCalled();
	});

	it('rejects when Graph provides no download link', async () => {
		apiRequest.mockResolvedValue({ id: FILE_ID, name: 'report.csv', file: {} });

		await expect(execute.call(ctx, 0)).rejects.toThrow('This file has no downloadable content');
		expect(ctx.helpers.httpRequest).not.toHaveBeenCalled();
	});

	it("rejects when the 'File' parameter is empty, before any request", async () => {
		setParams({ ...baseParams, file: '' });

		await expect(execute.call(ctx, 0)).rejects.toThrow("The 'File' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it("falls back to the reply's content type when the metadata has none", async () => {
		apiRequest.mockResolvedValue({ ...METADATA_REPLY, file: {} });

		await execute.call(ctx, 0);

		const [, , mimeType] = ctx.helpers.prepareBinaryData.mock.calls[0];
		expect(mimeType).toBe('text/csv');
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

		it('passes the binary item through untouched, with paired-item data', async () => {
			const node = new MicrosoftSharePointV2(versionDescription);
			setParams({ ...baseParams, resource: 'file', operation: 'download' });

			const result = await node.execute.call(ctx);

			expect(result).toEqual([
				[{ json: {}, binary: { data: PREPARED_BINARY }, pairedItem: { item: 0 } }],
			]);
			// The binary item must not be re-wrapped as { json: item }
			expect(ctx.helpers.returnJsonArray).not.toHaveBeenCalled();
		});
	});
});
