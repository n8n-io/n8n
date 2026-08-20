import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import type * as GenericFunctions from '../../shared/GenericFunctions';
import { notionApiRequest } from '../../shared/GenericFunctions';
import { getDatabaseIdFromPage, getDatabaseOptionsFromPage } from '../../v2/methods/loadOptions';

vi.mock('../../shared/GenericFunctions', async () => ({
	...(await vi.importActual<typeof GenericFunctions>('../../shared/GenericFunctions')),
	notionApiRequest: vi.fn(),
}));

const mockNotionApiRequest = notionApiRequest as Mock;

function createLoadOptionsContext(parameters: Record<string, unknown>): ILoadOptionsFunctions {
	return {
		getCurrentNodeParameter: vi.fn((name: string) => parameters[name]),
	} as unknown as ILoadOptionsFunctions;
}

describe('Notion V2 load options', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns no options when database options are requested without a page', async () => {
		const context = createLoadOptionsContext({ pageId: null });

		const result = await getDatabaseOptionsFromPage.call(context);

		expect(result).toEqual([]);
	});

	it('returns no options when the database page resource locator has not been filled in', async () => {
		// `pageId` on databasePage:update is a resourceLocator defaulting to
		// `{ mode: 'url', value: '' }`. When extraction yields no string, that raw
		// object is what the load options handler receives.
		const context = createLoadOptionsContext({ pageId: { mode: 'url', value: '' } });

		await expect(getDatabaseIdFromPage.call(context)).resolves.toEqual([]);
		expect(mockNotionApiRequest).not.toHaveBeenCalled();
	});
});
