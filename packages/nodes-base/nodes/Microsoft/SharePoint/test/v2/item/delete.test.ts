import type { IExecuteFunctions, INode } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { DeepMockProxy } from 'vitest-mock-extended';
import { mock, mockDeep } from 'vitest-mock-extended';

import { versionDescription } from '../../../v2/actions/versionDescription';
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
const LIST_ID = 'list1';
const ITEM_ID = 'item1';

describe('Microsoft SharePoint v2 — Item: Delete', () => {
	let node: MicrosoftSharePointV2;
	let ctx: DeepMockProxy<IExecuteFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;

	const setParams = (params: Record<string, unknown>) => {
		ctx.getNodeParameter.mockImplementation(
			(name: string, _itemIndex?: number, fallback?: unknown) =>
				(name in params ? params[name] : fallback) as never,
		);
	};

	beforeEach(() => {
		vi.clearAllMocks();
		node = new MicrosoftSharePointV2(versionDescription);
		ctx = mockDeep<IExecuteFunctions>();
		ctx.getInputData.mockReturnValue([{ json: {} }]);
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
		ctx.continueOnFail.mockReturnValue(false);
		ctx.helpers.returnJsonArray.mockImplementation((data) =>
			(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
		);
		ctx.helpers.constructExecutionMetaData.mockImplementation((inputData, options) =>
			inputData.map((data) => ({ ...data, pairedItem: options?.itemData })),
		);
	});

	it('deletes the item and emits { deleted: true }', async () => {
		setParams({
			resource: 'item',
			operation: 'delete',
			site: { mode: 'id', value: SITE_ID },
			list: LIST_ID,
			item: ITEM_ID,
		});
		// A 204 has no body; the transport resolves to an empty object.
		apiRequest.mockResolvedValue({});

		const result = await node.execute.call(ctx);

		expect(apiRequest).toHaveBeenCalledTimes(1);
		expect(apiRequest).toHaveBeenCalledWith(
			'DELETE',
			`/v1.0/sites/${ENCODED_SITE_ID}/lists/${LIST_ID}/items/${ITEM_ID}`,
		);
		expect(result).toEqual([[{ json: { deleted: true }, pairedItem: { item: 0 } }]]);
	});

	it('rejects an empty Item value', async () => {
		setParams({
			resource: 'item',
			operation: 'delete',
			site: { mode: 'id', value: SITE_ID },
			list: LIST_ID,
			item: '',
		});

		await expect(node.execute.call(ctx)).rejects.toThrow("The 'Item' parameter is empty");
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('surfaces a transport error per item when continueOnFail is on', async () => {
		setParams({
			resource: 'item',
			operation: 'delete',
			site: { mode: 'id', value: SITE_ID },
			list: LIST_ID,
			item: ITEM_ID,
		});
		ctx.continueOnFail.mockReturnValue(true);
		apiRequest.mockRejectedValueOnce(new Error('boom'));

		const result = await node.execute.call(ctx);

		expect(result).toEqual([[{ json: { error: 'boom' }, pairedItem: { item: 0 } }]]);
	});
});
