<<<<<<< HEAD
import { mockDeep } from 'vitest-mock-extended';
import type { IDataObject, IPollFunctions } from 'n8n-workflow';

import { googleApiRequestAllItems } from '../../v1/GenericFunctions';
import type { Mock, Mocked } from 'vitest';

describe('googleApiRequestAllItems', () => {
	let mockContext: Mocked<IPollFunctions>;
=======
import { mockDeep } from 'jest-mock-extended';
import type { IDataObject, IPollFunctions } from 'n8n-workflow';

import { googleApiRequestAllItems } from '../../v1/GenericFunctions';

describe('googleApiRequestAllItems', () => {
	let mockContext: jest.Mocked<IPollFunctions>;
>>>>>>> b964ec958 (fix(Google Drive Node): Fix infinite pagination loop in v1 API request (#28244))

	beforeEach(() => {
		mockContext = mockDeep<IPollFunctions>();
		mockContext.getNodeParameter.mockReturnValue('oAuth2');
	});

	afterEach(() => {
<<<<<<< HEAD
		vi.resetAllMocks();
=======
		jest.resetAllMocks();
>>>>>>> b964ec958 (fix(Google Drive Node): Fix infinite pagination loop in v1 API request (#28244))
	});

	it('should advance pageToken across pages and terminate when nextPageToken is absent', async () => {
		const pageTokensReceived: Array<string | undefined> = [];

<<<<<<< HEAD
		(mockContext.helpers.requestOAuth2 as Mock).mockImplementation(
=======
		(mockContext.helpers.requestOAuth2 as jest.Mock).mockImplementation(
>>>>>>> b964ec958 (fix(Google Drive Node): Fix infinite pagination loop in v1 API request (#28244))
			async (_cred: string, opts: IDataObject) => {
				const qs = opts.qs as IDataObject;
				pageTokensReceived.push(qs.pageToken as string | undefined);

				if (pageTokensReceived.length === 1) {
					return { files: [{ id: '1' }, { id: '2' }], nextPageToken: 'token-page-2' };
				}
				if (pageTokensReceived.length === 2) {
					return { files: [{ id: '3' }], nextPageToken: 'token-page-3' };
				}
				return { files: [{ id: '4' }] };
			},
		);

		const result = await googleApiRequestAllItems.call(
			mockContext,
			'files',
			'GET',
			'/drive/v3/files',
			{},
			{},
		);

		expect(result).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }]);
		expect(mockContext.helpers.requestOAuth2).toHaveBeenCalledTimes(3);
		expect(pageTokensReceived).toEqual([undefined, 'token-page-2', 'token-page-3']);
	});

	it('should handle single page (no nextPageToken)', async () => {
<<<<<<< HEAD
		(mockContext.helpers.requestOAuth2 as Mock).mockResolvedValueOnce({
=======
		(mockContext.helpers.requestOAuth2 as jest.Mock).mockResolvedValueOnce({
>>>>>>> b964ec958 (fix(Google Drive Node): Fix infinite pagination loop in v1 API request (#28244))
			files: [{ id: '1' }],
		});

		const result = await googleApiRequestAllItems.call(
			mockContext,
			'files',
			'GET',
			'/drive/v3/files',
			{},
			{},
		);

		expect(result).toEqual([{ id: '1' }]);
		expect(mockContext.helpers.requestOAuth2).toHaveBeenCalledTimes(1);
	});
});
