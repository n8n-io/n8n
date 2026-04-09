import { mockDeep } from 'jest-mock-extended';
import type { IDataObject, IPollFunctions } from 'n8n-workflow';

import { googleApiRequestAllItems } from '../../v1/GenericFunctions';

describe('googleApiRequestAllItems', () => {
	let mockContext: jest.Mocked<IPollFunctions>;

	beforeEach(() => {
		mockContext = mockDeep<IPollFunctions>();
		mockContext.getNodeParameter.mockReturnValue('oAuth2');
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	it('should advance pageToken across pages and terminate when nextPageToken is absent', async () => {
		const pageTokensReceived: Array<string | undefined> = [];

		(mockContext.helpers.requestOAuth2 as jest.Mock).mockImplementation(
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
		(mockContext.helpers.requestOAuth2 as jest.Mock).mockResolvedValueOnce({
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
