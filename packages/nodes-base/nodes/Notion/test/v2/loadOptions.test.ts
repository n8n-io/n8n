import type { ILoadOptionsFunctions } from 'n8n-workflow';
import type { Mock } from 'vitest';

import * as GenericFunctions from '../../shared/GenericFunctions';
import { getDatabaseIdFromPage, getDatabaseOptionsFromPage } from '../../v2/methods/loadOptions';

vi.mock('../../shared/GenericFunctions', async () => ({
	...(await vi.importActual<typeof GenericFunctions>('../../shared/GenericFunctions')),
	notionApiRequest: vi.fn(),
}));

const mockNotionApiRequest = GenericFunctions.notionApiRequest as Mock;

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

	it('returns no options when database keys are requested without a page', async () => {
		// `pageId` is a resource locator defaulting to `{ mode: 'url', value: '' }`. When
		// extraction yields no string, that object is what the handler receives.
		const context = createLoadOptionsContext({ pageId: { mode: 'url', value: '' } });

		const result = await getDatabaseIdFromPage.call(context);

		expect(result).toEqual([]);
		expect(mockNotionApiRequest).not.toHaveBeenCalled();
	});
});
