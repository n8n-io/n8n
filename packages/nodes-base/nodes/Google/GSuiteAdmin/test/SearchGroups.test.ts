import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { searchGroups } from '../GenericFunctions';

describe('GenericFunctions - searchGroups', () => {
	const mockGoogleApiRequestAllItems = jest.fn();

	const mockContext = {
		helpers: {
			requestOAuth2: mockGoogleApiRequestAllItems,
		},
	} as unknown as ILoadOptionsFunctions;

	beforeEach(() => {
		mockGoogleApiRequestAllItems.mockClear();
	});
	//TODO - this test not works
	it('should return a list of groups when API responds with groups', async () => {
		mockGoogleApiRequestAllItems.mockResolvedValue([
			{
				kind: 'admin#directory#group',
				id: '01302m922pmp3e4',
				email: 'new3@digital-boss.de',
				name: 'New2',
				description: 'new1',
			},
			{
				kind: 'admin#directory#group',
				id: '01x0gk373c9z46j',
				email: 'newoness@digital-boss.de',
				name: 'NewOness',
				description: 'test',
			},
		]);

		const result = await searchGroups.call(mockContext);

		expect(result).toEqual({
			results: [
				{ name: 'New2', value: '01302m922pmp3e4' },
				{ name: 'NewOness', value: '01x0gk373c9z46j' },
			],
		});
	});

	it('should return an empty array when API responds with no groups', async () => {
		mockGoogleApiRequestAllItems.mockResolvedValue([]);

		const result = await searchGroups.call(mockContext);

		expect(result).toEqual({ results: [] });
	});

	it('should warn and return an empty array when no groups are found', async () => {
		mockGoogleApiRequestAllItems.mockResolvedValue([]);

		const result = await searchGroups.call(mockContext);

		expect(result).toEqual({ results: [] });
	});
});
