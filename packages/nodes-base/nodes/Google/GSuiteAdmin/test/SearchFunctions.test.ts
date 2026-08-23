import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { googleApiRequest, googleApiRequestAllItems } from '../GenericFunctions';
import { searchUsers, searchGroups, searchDevices } from '../SearchFunctions';
import type { Mock } from 'vitest';

vi.mock('../GenericFunctions');

describe('searchFunctions', () => {
	let mockContext: ILoadOptionsFunctions;

	beforeEach(() => {
		mockContext = {
			getNodeParameter: vi.fn(),
		} as unknown as ILoadOptionsFunctions;

		vi.clearAllMocks();
	});

	describe('searchUsers', () => {
		it('should return formatted user search results', async () => {
			(googleApiRequestAllItems as Mock).mockResolvedValueOnce([
				{ id: '123', name: { fullName: 'John Doe' } },
				{ id: '456' },
			]);

			const result = await searchUsers.call(mockContext);

			expect(googleApiRequestAllItems).toHaveBeenCalledWith(
				expect.anything(),
				'GET',
				'/directory/v1/users',
				{},
				{ customer: 'my_customer' },
			);
			expect(result).toEqual({
				results: [
					{ name: 'John Doe', value: '123' },
					{ name: '456', value: '456' },
				],
			});
		});

		it('should return an empty array if no users found', async () => {
			(googleApiRequestAllItems as Mock).mockResolvedValueOnce([]);
			const result = await searchUsers.call(mockContext);
			expect(result).toEqual({ results: [] });
		});
	});

	describe('searchGroups', () => {
		it('should return formatted group search results', async () => {
			(googleApiRequestAllItems as Mock).mockResolvedValueOnce([
				{ id: 'group1', name: 'Group One' },
				{ id: 'group2', email: 'group@example.com' },
				{ id: 'group3' },
			]);

			const result = await searchGroups.call(mockContext);

			expect(result).toEqual({
				results: [
					{ name: 'Group One', value: 'group1' },
					{ name: 'group@example.com', value: 'group2' },
					{ name: 'Unnamed Group', value: 'group3' },
				],
			});
		});

		it('should return empty results if no groups found', async () => {
			(googleApiRequestAllItems as Mock).mockResolvedValueOnce([]);
			const result = await searchGroups.call(mockContext);
			expect(result).toEqual({ results: [] });
		});
	});

	describe('searchDevices', () => {
		it('should return formatted device search results', async () => {
			(googleApiRequest as Mock).mockResolvedValueOnce({
				chromeosdevices: [{ deviceId: 'dev1', serialNumber: 'SN123' }, { deviceId: 'Dev2' }],
			});

			const result = await searchDevices.call(mockContext);

			expect(googleApiRequest).toHaveBeenCalledWith(
				'GET',
				'/directory/v1/customer/my_customer/devices/chromeos/',
				{},
				{ customerId: 'my_customer' },
			);
			expect(result).toEqual({
				results: [
					{ name: 'SN123', value: 'dev1' },
					{ name: 'Dev2', value: 'Dev2' },
				],
			});
		});

		it('should return empty results if no devices found', async () => {
			(googleApiRequest as Mock).mockResolvedValueOnce({ chromeosdevices: [] });
			const result = await searchDevices.call(mockContext);
			expect(result).toEqual({ results: [] });
		});
	});
});
