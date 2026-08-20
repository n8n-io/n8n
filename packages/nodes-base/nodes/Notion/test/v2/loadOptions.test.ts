import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { getDatabaseIdFromPage, getDatabaseOptionsFromPage } from '../../v2/methods/loadOptions';

vi.mock('../../shared/GenericFunctions', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../shared/GenericFunctions')>()),
	notionApiRequest: vi.fn().mockResolvedValue({ parent: {}, properties: {} }),
}));

function createLoadOptionsContext(parameters: Record<string, unknown>): ILoadOptionsFunctions {
	return {
		getCurrentNodeParameter: vi.fn((name: string) => parameters[name]),
	} as unknown as ILoadOptionsFunctions;
}

describe('Notion V2 load options', () => {
	it('returns no options when database options are requested without a page', async () => {
		const context = createLoadOptionsContext({ pageId: null });

		const result = await getDatabaseOptionsFromPage.call(context);

		expect(result).toEqual([]);
	});

	it('does not throw when the page resource locator has not been resolved to a string', async () => {
		// The `pageId` resource locator defaults to `{ mode: 'url', value: '' }`, and
		// `extractValue` leaves it as-is when the value does not match the extraction regexp.
		const context = createLoadOptionsContext({ pageId: { mode: 'url', value: '' } });

		const result = await getDatabaseIdFromPage.call(context).catch((error: unknown) => error);

		expect(result).not.toBeInstanceOf(TypeError);
	});
});
