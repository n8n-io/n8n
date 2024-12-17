import { filterSortSearchListItems } from '../../v2/helpers/utils';

describe('Test MicrosoftTeamsV2, filterSortSearchListItems', () => {
	it('should filter, sort and search list items', () => {
		const items = [
			{
				name: 'Test1',
				value: 'test1',
			},
			{
				name: 'Test2',
				value: 'test2',
			},
		];

		const result = filterSortSearchListItems(items, 'test1');

		expect(result).toEqual([
			{
				name: 'Test1',
				value: 'test1',
			},
		]);
	});
});
