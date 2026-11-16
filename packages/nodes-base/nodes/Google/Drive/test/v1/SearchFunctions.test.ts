import type { ILoadOptionsFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import * as transport from '../../v1/GenericFunctions';
import { driveSearch, fileSearch, folderSearch } from '../../v1/SearchFunctions';

vi.mock('../../v1/GenericFunctions');

const mockTransport = transport as Mocked<typeof transport>;

describe('GoogleDriveV1 - SearchFunctions', () => {
	let mockLoadOptionsFunctions: Mocked<ILoadOptionsFunctions>;

	beforeEach(() => {
		mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
		vi.clearAllMocks();
	});

	const sentQuery = () => (mockTransport.googleApiRequest.mock.calls[0][3] as { q: string }).q;

	describe('fileSearch', () => {
		it('builds a name filter from the search term', async () => {
			mockTransport.googleApiRequest.mockResolvedValue({ files: [] });

			await fileSearch.call(mockLoadOptionsFunctions, 'Report');

			expect(sentQuery()).toBe(
				"name contains 'Report' and mimeType != 'application/vnd.google-apps.folder'",
			);
		});

		it('escapes every quote in the search term, not just the first', async () => {
			mockTransport.googleApiRequest.mockResolvedValue({ files: [] });

			await fileSearch.call(mockLoadOptionsFunctions, "a'b'c");

			expect(sentQuery()).toBe(
				"name contains 'a\\'b\\'c' and mimeType != 'application/vnd.google-apps.folder'",
			);
		});

		it('sends no name filter when the search term is empty', async () => {
			mockTransport.googleApiRequest.mockResolvedValue({ files: [] });

			await fileSearch.call(mockLoadOptionsFunctions);

			expect(sentQuery()).toBe("mimeType != 'application/vnd.google-apps.folder'");
		});
	});

	describe('folderSearch', () => {
		it('escapes every quote in the search term', async () => {
			mockTransport.googleApiRequest.mockResolvedValue({ files: [] });

			await folderSearch.call(mockLoadOptionsFunctions, "a'b'c");

			expect(sentQuery()).toContain("name contains 'a\\'b\\'c'");
		});
	});

	describe('driveSearch', () => {
		it('escapes every quote in the search term', async () => {
			mockTransport.googleApiRequest.mockResolvedValue({ drives: [] });

			await driveSearch.call(mockLoadOptionsFunctions, "a'b'c");

			expect(sentQuery()).toBe("name contains 'a\\'b\\'c'");
		});
	});
});
