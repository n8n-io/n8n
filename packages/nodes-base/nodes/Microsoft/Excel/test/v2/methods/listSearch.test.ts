import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { searchWorkbooks } from '../../../v2/methods/listSearch';
import * as transport from '../../../v2/transport';

jest.mock('../../../v2/transport', () => {
	const actual = jest.requireActual<typeof transport>('../../../v2/transport');
	return {
		...actual,
		microsoftApiRequest: jest.fn(),
	};
});

const mockTransport = transport as jest.Mocked<typeof transport>;

describe('MicrosoftExcelV2 - listSearch', () => {
	let mockLoadOptionsFunctions: jest.Mocked<ILoadOptionsFunctions>;

	beforeEach(() => {
		mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
		jest.clearAllMocks();
		mockTransport.microsoftApiRequest.mockResolvedValue({ value: [] });
	});

	const sentPath = () => String(mockTransport.microsoftApiRequest.mock.calls[0][1]);

	it('builds the search path from the filter', async () => {
		await searchWorkbooks.call(mockLoadOptionsFunctions, 'Budget');

		expect(sentPath()).toBe("/root/search(q='Budget')");
	});

	it('keeps a quote in the filter inside its literal', async () => {
		await searchWorkbooks.call(mockLoadOptionsFunctions, "a'b");

		// Doubled for OData. encodeURIComponent leaves a quote alone — it is
		// unreserved — which is exactly why the escaping cannot be left to it.
		expect(sentPath()).toBe("/root/search(q='a''b')");
	});

	it('percent-encodes a character that would otherwise rewrite the URL', async () => {
		await searchWorkbooks.call(mockLoadOptionsFunctions, 'a?b#c');

		expect(sentPath()).toBe("/root/search(q='a%3Fb%23c')");
	});
});
