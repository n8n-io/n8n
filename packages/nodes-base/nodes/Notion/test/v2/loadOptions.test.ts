import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { getDatabaseOptionsFromPage } from '../../v2/methods/loadOptions';

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
});
