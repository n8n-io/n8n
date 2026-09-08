import type { IExecuteFunctions } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';

import { versionDescription } from '../../../../v2/actions/versionDescription';
import { MicrosoftTeamsV2 } from '../../../../v2/MicrosoftTeamsV2.node';
import * as transport from '../../../../v2/transport';
import type * as _importType0 from '../../../../v2/transport';
import { createExecuteContext, setParams } from '../helpers';

vi.mock('../../../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequestAllItems: vi.fn(),
	};
});

// `GET /chats` documents a maximum `$top` of 50, and `returnAllOrLimit` defaults the limit
// to 100. The page size and the total are clamped differently, so both are pinned here.
describe('Microsoft Teams V2, chat getAll paging arguments', () => {
	let node: MicrosoftTeamsV2;
	let ctx: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		node = new MicrosoftTeamsV2(versionDescription);
		ctx = createExecuteContext();
		(transport.microsoftApiRequestAllItems as Mock).mockResolvedValue([]);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it.each([
		['asks for a single chat when the limit is zero', { returnAll: false, limit: 0 }, 1, 1],
		['asks for a single chat when the limit is one', { returnAll: false, limit: 1 }, 1, 1],
		['caps the page size but keeps a limit above 50', { returnAll: false, limit: 51 }, 50, 51],
		['caps the page size for the default limit', { returnAll: false, limit: 100 }, 50, 100],
		// Graph rejects a fractional `$top`, and an expression can resolve the limit to one.
		// A fraction below 1 needs no row: the low clamp already returns 1 without the floor.
		['rounds a fractional limit down', { returnAll: false, limit: 2.7 }, 2, 2],
		['asks for a full page and no limit when returning all', { returnAll: true }, 50, undefined],
	])('%s', async (_name, params, expectedTop, expectedLimit) => {
		setParams(ctx, { resource: 'chat', operation: 'getAll', ...params });

		await node.execute.call(ctx);

		expect(transport.microsoftApiRequestAllItems).toHaveBeenCalledWith(
			'value',
			'GET',
			'/v1.0/chats',
			{},
			{ $top: expectedTop },
			expectedLimit,
		);
	});
});
