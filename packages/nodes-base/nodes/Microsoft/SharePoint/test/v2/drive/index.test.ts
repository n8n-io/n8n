import type { ILoadOptionsFunctions, INode } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { versionDescription } from '../../../v2/actions/versionDescription';
import { getDrives } from '../../../v2/drive';
import { MicrosoftSharePointV2 } from '../../../v2/MicrosoftSharePointV2.node';
import * as transport from '../../../transport';
import type * as _importType0 from '../../../transport';

vi.mock('../../../transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../../transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
	};
});

const SITE_ID =
	'contoso.sharepoint.com,2C712604-1370-44E7-A1F5-426573FDA80A,2D2244C3-251A-49EA-93A8-39E1C3A060FE';
const ENCODED_SITE_ID = encodeURIComponent(SITE_ID);

const MIXED = {
	value: [
		{ id: 'b!docs', name: 'Documents' },
		{ id: 'b!hold', name: 'Preservation Hold Library', system: {} },
		{ id: 'b!policies', name: 'Policies' },
		{ name: 'No id at all' },
	],
};

describe('Microsoft SharePoint v2 — drive search', () => {
	let ctx: DeepMockProxy<ILoadOptionsFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;

	beforeEach(() => {
		vi.clearAllMocks();
		ctx = mockDeep<ILoadOptionsFunctions>();
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
		ctx.getNodeParameter.mockImplementation(
			(name: string, fallback?: unknown) =>
				(name === 'site' ? { mode: 'id', value: SITE_ID } : fallback) as never,
		);
	});

	it('selects the system facet, which Graph omits unless asked for', async () => {
		apiRequest.mockResolvedValue({ value: [] });

		await getDrives.call(ctx);

		expect(apiRequest).toHaveBeenCalledWith(
			'GET',
			`/v1.0/sites/${ENCODED_SITE_ID}/drives`,
			{},
			{ $select: 'id,name,system' },
		);
	});

	it.each([
		[
			'drops system libraries',
			undefined,
			[
				{ name: 'Documents', value: 'b!docs' },
				{ name: 'Policies', value: 'b!policies' },
			],
		],
		['filters by typed text', 'pol', [{ name: 'Policies', value: 'b!policies' }]],
		['matches case-insensitively', 'DOCU', [{ name: 'Documents', value: 'b!docs' }]],
		['returns nothing when no name matches', 'zzz', []],
	])('%s', async (_name, filter, expected) => {
		apiRequest.mockResolvedValue(MIXED);

		expect((await getDrives.call(ctx, filter)).results).toEqual(expected);
	});

	it('requests a next page exactly as returned, without re-sending the query', async () => {
		const nextLink = 'https://graph.microsoft.com/v1.0/sites/x/drives?$skiptoken=abc';
		apiRequest.mockResolvedValueOnce({ value: [], '@odata.nextLink': nextLink });
		const firstPage = await getDrives.call(ctx);

		apiRequest.mockResolvedValueOnce({ value: [{ id: 'b!next', name: 'Later' }] });
		const secondPage = await getDrives.call(ctx, undefined, firstPage.paginationToken);

		expect(firstPage.paginationToken).toBe(nextLink);
		expect(apiRequest).toHaveBeenLastCalledWith('GET', '', {}, {}, nextLink);
		expect(secondPage.results).toEqual([{ name: 'Later', value: 'b!next' }]);
	});

	it('rejects an empty Site value before calling Graph', async () => {
		ctx.getNodeParameter.mockImplementation(
			(name: string, fallback?: unknown) =>
				(name === 'site' ? { mode: 'list', value: '' } : fallback) as never,
		);

		await expect(getDrives.call(ctx)).rejects.toThrow("The 'Site' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('is wired into the node as a list-search method', () => {
		const node = new MicrosoftSharePointV2(versionDescription);

		expect(node.methods?.listSearch?.getDrives).toBe(getDrives);
	});
});
