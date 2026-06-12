import * as genericFunctions from '../../GenericFunctions';
import { GoogleDocs } from '../../GoogleDocs.node';
import { createLoadOptionsThis, docsNode } from '../helpers';

const googleApiRequestAllItemsMock =
	genericFunctions.googleApiRequestAllItems as jest.MockedFunction<
		typeof genericFunctions.googleApiRequestAllItems
	>;

jest.mock('../../GenericFunctions', () => {
	const originalModule = jest.requireActual('../../GenericFunctions');
	return {
		...originalModule,
		googleApiRequestAllItems: jest.fn(),
	};
});

describe('GoogleDocs loadOptions.getDrives', () => {
	it('should return default options and drives from API', async () => {
		const node = new GoogleDocs();

		googleApiRequestAllItemsMock.mockResolvedValueOnce([
			{ id: 'drive-1', name: 'Engineering' },
			{ id: 'drive-2', name: 'Marketing' },
		]);

		const result = await node.methods.loadOptions.getDrives.call(
			createLoadOptionsThis({}, docsNode),
		);

		// First two entries should be My Drive and Shared with me
		expect(result[0]).toEqual({
			name: 'My Drive',
			value: 'myDrive',
		});
		expect(result[1]).toEqual({
			name: 'Shared with me',
			value: 'sharedWithMe',
		});

		// Then drives from the API
		expect(result).toContainEqual({ name: 'Engineering', value: 'drive-1' });
		expect(result).toContainEqual({ name: 'Marketing', value: 'drive-2' });

		expect(googleApiRequestAllItemsMock).toHaveBeenCalledTimes(1);
		expect(googleApiRequestAllItemsMock).toHaveBeenCalledWith(
			expect.anything(), // this
			'GET',
			'',
			{},
			{},
			'https://www.googleapis.com/drive/v3/drives',
		);
	});
});
