import type { IExecuteFunctions } from 'n8n-workflow';

import * as GenericFunctions from '../../../shared/GenericFunctions';
import * as attachmentGetAll from '../../../v2/actions/attachment/getAll.operation';

describe('Linear v2 → Attachment', () => {
	afterEach(() => vi.restoreAllMocks());

	it('getAll fetches attachments for every input item', async () => {
		const spy = vi
			.spyOn(GenericFunctions, 'linearApiRequestAllItems')
			.mockImplementation(async (_path, body) => [{ id: `att-${body?.variables?.issueId}` }]);
		const items = [{ json: { id: 'CE-1' } }, { json: { id: 'CE-2' } }];
		const mockThis = {
			getNodeParameter: vi.fn((param: string, i: number) => {
				if (param === 'issueId') return items[i].json.id;
				if (param === 'returnAll') return true;
				return undefined;
			}),
			continueOnFail: vi.fn().mockReturnValue(false),
			helpers: {
				returnJsonArray: vi.fn((d: unknown[]) => d.map((json) => ({ json }))),
				constructExecutionMetaData: vi.fn((d: unknown[], { itemData }) =>
					d.map((entry) => ({ ...(entry as object), pairedItem: itemData })),
				),
			},
		} as unknown as IExecuteFunctions;

		const result = await attachmentGetAll.execute.call(mockThis, items);

		expect(spy).toHaveBeenCalledTimes(2);
		expect(result).toEqual([
			{ json: { id: 'att-CE-1' }, pairedItem: { item: 0 } },
			{ json: { id: 'att-CE-2' }, pairedItem: { item: 1 } },
		]);
	});
});
