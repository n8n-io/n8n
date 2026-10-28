import type { IExecuteFunctions } from 'n8n-workflow';

import * as GenericFunctions from '../../../shared/GenericFunctions';
import { router } from '../../../v2/actions/router';

describe('Linear v2 → router', () => {
	const items = [{ json: { id: 'CE-1' } }, { json: { id: 'CE-2' } }];
	let continueOnFail: boolean;
	let mockThis: IExecuteFunctions;

	beforeEach(() => {
		continueOnFail = false;
		mockThis = {
			getInputData: () => items,
			getNode: vi.fn(),
			getNodeParameter: vi.fn((param: string, i: number) => {
				if (param === 'resource') return 'attachment';
				if (param === 'operation') return 'getAll';
				if (param === 'issueId') return items[i].json.id;
				if (param === 'returnAll') return true;
				return undefined;
			}),
			continueOnFail: () => continueOnFail,
			helpers: {
				returnJsonArray: (d: unknown) => [d].flat().map((json) => ({ json })),
				constructExecutionMetaData: (d: object[], { itemData }: { itemData: object }) =>
					d.map((entry) => ({ ...entry, pairedItem: itemData })),
			},
		} as unknown as IExecuteFunctions;
	});

	afterEach(() => vi.restoreAllMocks());

	it('runs the operation for every input item', async () => {
		vi.spyOn(GenericFunctions, 'linearApiRequestAllItems').mockImplementation(
			async (_path, body) => [{ id: `att-${body?.variables?.issueId}` }],
		);

		expect(await router.call(mockThis)).toEqual([
			[
				{ json: { id: 'att-CE-1' }, pairedItem: { item: 0 } },
				{ json: { id: 'att-CE-2' }, pairedItem: { item: 1 } },
			],
		]);
	});

	it('returns an error item per failed input when continueOnFail is enabled', async () => {
		continueOnFail = true;
		vi.spyOn(GenericFunctions, 'linearApiRequestAllItems')
			.mockResolvedValueOnce([{ id: 'att-1' }])
			.mockRejectedValueOnce(new Error('Entity not found'));

		expect(await router.call(mockThis)).toEqual([
			[
				{ json: { id: 'att-1' }, pairedItem: { item: 0 } },
				{ json: { error: 'Entity not found' }, pairedItem: { item: 1 } },
			],
		]);
	});

	it('throws when continueOnFail is disabled', async () => {
		vi.spyOn(GenericFunctions, 'linearApiRequestAllItems').mockRejectedValue(new Error('boom'));

		await expect(router.call(mockThis)).rejects.toThrow('boom');
	});
});
