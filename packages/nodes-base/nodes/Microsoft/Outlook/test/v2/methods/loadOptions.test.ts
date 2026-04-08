import { mockDeep } from 'jest-mock-extended';
import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { getCategoriesNames, getFolders, getCalendarGroups } from '../../../v2/methods/loadOptions';
import * as transport from '../../../v2/transport';

jest.mock('../../../v2/transport');

const mockTransport = transport as jest.Mocked<typeof transport>;

describe('MicrosoftOutlookV2 - loadOptions methods', () => {
	let mockLoadOptionsFunctions: jest.Mocked<ILoadOptionsFunctions>;

	beforeEach(() => {
		mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('getCategoriesNames', () => {
		it('should get categories names successfully', async () => {
			const mockCategories = [
				{ displayName: 'Red Category' },
				{ displayName: 'Blue Category' },
				{ displayName: 'Green Category' },
			];

			mockTransport.microsoftApiRequestAllItems.mockResolvedValue(mockCategories);

			const result = await getCategoriesNames.call(mockLoadOptionsFunctions);

			expect(mockTransport.microsoftApiRequestAllItems).toHaveBeenCalledWith(
				'value',
				'GET',
				'/outlook/masterCategories',
			);
			expect(result).toEqual([
				{ name: 'Red Category', value: 'Red Category' },
				{ name: 'Blue Category', value: 'Blue Category' },
				{ name: 'Green Category', value: 'Green Category' },
			]);
		});

		it('should handle empty categories array', async () => {
			mockTransport.microsoftApiRequestAllItems.mockResolvedValue([]);

			const result = await getCategoriesNames.call(mockLoadOptionsFunctions);

			expect(result).toEqual([]);
		});

		it('should handle categories with missing displayName', async () => {
			const mockCategories = [
				{ displayName: 'Valid Category' },
				{ id: 'category-without-name' },
				{ displayName: null },
			];

			mockTransport.microsoftApiRequestAllItems.mockResolvedValue(mockCategories);

			const result = await getCategoriesNames.call(mockLoadOptionsFunctions);

			expect(result).toEqual([
				{ name: 'Valid Category', value: 'Valid Category' },
				{ name: undefined, value: undefined },
				{ name: null, value: null },
			]);
		});

		it('should handle API errors', async () => {
			const apiError = new Error('Failed to fetch categories');
			mockTransport.microsoftApiRequestAllItems.mockRejectedValue(apiError);

			await expect(getCategoriesNames.call(mockLoadOptionsFunctions)).rejects.toThrow(
				'Failed to fetch categories',
			);
		});

		it('should handle special characters in category names', async () => {
			const mockCategories = [
				{ displayName: 'Category with "quotes"' },
				{ displayName: "Category with 'apostrophes'" },
				{ displayName: 'Category with & symbols' },
				{ displayName: 'Category With Unicode: 🔥' },
			];

			mockTransport.microsoftApiRequestAllItems.mockResolvedValue(mockCategories);

			const result = await getCategoriesNames.call(mockLoadOptionsFunctions);

			expect(result).toEqual([
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				{ name: 'Category with "quotes"', value: 'Category with "quotes"' },
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				{ name: "Category with 'apostrophes'", value: "Category with 'apostrophes'" },
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				{ name: 'Category with & symbols', value: 'Category with & symbols' },
				{ name: 'Category With Unicode: 🔥', value: 'Category With Unicode: 🔥' },
			]);
		});
	});

	describe('getFolders', () => {
		it('should get folders successfully', async () => {
			const mockResponse = [
				{ id: 'folder1', displayName: 'Inbox' },
				{ id: 'folder2', displayName: 'Sent Items' },
			];
			const mockFolders = [
				{ id: 'folder1', displayName: 'Inbox' },
				{ id: 'folder2', displayName: 'Sent Items' },
				{ id: 'subfolder1', displayName: 'Work/Projects' },
			];

			mockTransport.microsoftApiRequestAllItems.mockResolvedValue(mockResponse);
			mockTransport.getSubfolders.mockResolvedValue(mockFolders);

			const result = await getFolders.call(mockLoadOptionsFunctions);

			expect(mockTransport.microsoftApiRequestAllItems).toHaveBeenCalledWith(
				'value',
				'GET',
				'/mailFolders',
				{},
			);
			expect(mockTransport.getSubfolders).toHaveBeenCalledWith(mockResponse);
			expect(result).toEqual([
				{ name: 'Inbox', value: 'folder1' },
				{ name: 'Sent Items', value: 'folder2' },
				{ name: 'Work/Projects', value: 'subfolder1' },
			]);
		});

		it('should handle empty folders response', async () => {
			mockTransport.microsoftApiRequestAllItems.mockResolvedValue([]);
			mockTransport.getSubfolders.mockResolvedValue([]);

			const result = await getFolders.call(mockLoadOptionsFunctions);

			expect(result).toEqual([]);
		});

		it('should handle folders with missing properties', async () => {
			const mockResponse = [
				{ id: 'folder1', displayName: 'Valid Folder' },
				{ displayName: 'Folder without ID' },
				{ id: 'folder3' },
			];
			const mockFolders = [
				{ id: 'folder1', displayName: 'Valid Folder' },
				{ displayName: 'Folder without ID' },
				{ id: 'folder3' },
			];

			mockTransport.microsoftApiRequestAllItems.mockResolvedValue(mockResponse);
			mockTransport.getSubfolders.mockResolvedValue(mockFolders);

			const result = await getFolders.call(mockLoadOptionsFunctions);

			expect(result).toEqual([
				{ name: 'Valid Folder', value: 'folder1' },
				{ name: 'Folder without ID', value: undefined },
				{ name: undefined, value: 'folder3' },
			]);
		});

		it('should handle API errors from microsoftApiRequestAllItems', async () => {
			const apiError = new Error('Failed to fetch mail folders');
			mockTransport.microsoftApiRequestAllItems.mockRejectedValue(apiError);

			await expect(getFolders.call(mockLoadOptionsFunctions)).rejects.toThrow(
				'Failed to fetch mail folders',
			);
		});

		it('should handle errors from getSubfolders', async () => {
			const mockResponse = [{ id: 'folder1', displayName: 'Inbox' }];
			const subfolderError = new Error('Failed to get subfolders');

			mockTransport.microsoftApiRequestAllItems.mockResolvedValue(mockResponse);
			mockTransport.getSubfolders.mockRejectedValue(subfolderError);

			await expect(getFolders.call(mockLoadOptionsFunctions)).rejects.toThrow(
				'Failed to get subfolders',
			);
		});

		it('should handle large number of folders', async () => {
			const largeFolderList = Array.from({ length: 1000 }, (_, i) => ({
				id: `folder${i}`,
				displayName: `Folder ${i}`,
			}));

			mockTransport.microsoftApiRequestAllItems.mockResolvedValue(largeFolderList);
			mockTransport.getSubfolders.mockResolvedValue(largeFolderList);

			const result = await getFolders.call(mockLoadOptionsFunctions);

			expect(result).toHaveLength(1000);
			expect(result[0]).toEqual({ name: 'Folder 0', value: 'folder0' });
			expect(result[999]).toEqual({ name: 'Folder 999', value: 'folder999' });
		});
	});

	describe('getCalendarGroups', () => {
		it('should get calendar groups successfully', async () => {
			const mockCalendars = [
				{ id: 'group1', name: 'My Calendars' },
				{ id: 'group2', name: 'Work Calendars' },
				{ id: 'group3', name: 'Shared Calendars' },
			];

			mockTransport.microsoftApiRequestAllItems.mockResolvedValue(mockCalendars);

			const result = await getCalendarGroups.call(mockLoadOptionsFunctions);

			expect(mockTransport.microsoftApiRequestAllItems).toHaveBeenCalledWith(
				'value',
				'GET',
				'/calendarGroups',
				{},
			);
			expect(result).toEqual([
				{ name: 'My Calendars', value: 'group1' },
				{ name: 'Work Calendars', value: 'group2' },
				{ name: 'Shared Calendars', value: 'group3' },
			]);
		});

		it('should handle empty calendar groups', async () => {
			mockTransport.microsoftApiRequestAllItems.mockResolvedValue([]);

			const result = await getCalendarGroups.call(mockLoadOptionsFunctions);

			expect(result).toEqual([]);
		});

		it('should handle calendar groups with missing properties', async () => {
			const mockCalendars = [
				{ id: 'group1', name: 'Valid Group' },
				{ name: 'Group without ID' },
				{ id: 'group3' },
				{ id: 'group4', name: null },
			];

			mockTransport.microsoftApiRequestAllItems.mockResolvedValue(mockCalendars);

			const result = await getCalendarGroups.call(mockLoadOptionsFunctions);

			expect(result).toEqual([
				{ name: 'Valid Group', value: 'group1' },
				{ name: 'Group without ID', value: undefined },
				{ name: undefined, value: 'group3' },
				{ name: null, value: 'group4' },
			]);
		});

		it('should handle API errors', async () => {
			const apiError = new Error('Failed to fetch calendar groups');
			mockTransport.microsoftApiRequestAllItems.mockRejectedValue(apiError);

			await expect(getCalendarGroups.call(mockLoadOptionsFunctions)).rejects.toThrow(
				'Failed to fetch calendar groups',
			);
		});

		it('should handle special characters in calendar group names', async () => {
			const mockCalendars = [
				{ id: 'group1', name: 'My "Work" Calendar' },
				{ id: 'group2', name: "John's Calendar" },
				{ id: 'group3', name: 'Team & Projects' },
				{ id: 'group4', name: 'Calendar with unicode: =�' },
			];

			mockTransport.microsoftApiRequestAllItems.mockResolvedValue(mockCalendars);

			const result = await getCalendarGroups.call(mockLoadOptionsFunctions);

			expect(result).toEqual([
				{ name: 'My "Work" Calendar', value: 'group1' },
				{ name: "John's Calendar", value: 'group2' },
				{ name: 'Team & Projects', value: 'group3' },
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				{ name: 'Calendar with unicode: =�', value: 'group4' },
			]);
		});

		it('should handle timeout scenarios', async () => {
			const timeoutError = new Error('Request timeout');
			mockTransport.microsoftApiRequestAllItems.mockRejectedValue(timeoutError);

			await expect(getCalendarGroups.call(mockLoadOptionsFunctions)).rejects.toThrow(
				'Request timeout',
			);
		});
	});

	describe('Edge Cases and Integration', () => {
		it('should handle network connectivity issues', async () => {
			const networkError = new Error('Network error');
			mockTransport.microsoftApiRequestAllItems.mockRejectedValue(networkError);

			await expect(getCategoriesNames.call(mockLoadOptionsFunctions)).rejects.toThrow(
				'Network error',
			);
			await expect(getFolders.call(mockLoadOptionsFunctions)).rejects.toThrow('Network error');
			await expect(getCalendarGroups.call(mockLoadOptionsFunctions)).rejects.toThrow(
				'Network error',
			);
		});

		it('should handle malformed API responses', async () => {
			mockTransport.microsoftApiRequestAllItems.mockResolvedValue(null as any);

			await expect(getCategoriesNames.call(mockLoadOptionsFunctions)).rejects.toThrow();
		});

		it('should handle authentication errors', async () => {
			const authError = new Error('Authentication failed');
			mockTransport.microsoftApiRequestAllItems.mockRejectedValue(authError);

			await expect(getCategoriesNames.call(mockLoadOptionsFunctions)).rejects.toThrow(
				'Authentication failed',
			);
		});

		it('should handle rate limiting errors', async () => {
			const rateLimitError = new Error('Rate limit exceeded');
			mockTransport.microsoftApiRequestAllItems.mockRejectedValue(rateLimitError);

			await expect(getCalendarGroups.call(mockLoadOptionsFunctions)).rejects.toThrow(
				'Rate limit exceeded',
			);
		});
	});

	describe('Performance and Memory', () => {
		it('should handle very long displayNames efficiently', async () => {
			const longName = 'A'.repeat(10000);
			const mockCategories = [{ displayName: longName }];

			mockTransport.microsoftApiRequestAllItems.mockResolvedValue(mockCategories);

			const result = await getCategoriesNames.call(mockLoadOptionsFunctions);

			expect(result).toEqual([{ name: longName, value: longName }]);
		});

		it('should handle empty strings in response data', async () => {
			const mockCategories = [
				{ displayName: '' },
				{ displayName: '' },
				{ displayName: 'Valid Category' },
			];

			mockTransport.microsoftApiRequestAllItems.mockResolvedValue(mockCategories);

			const result = await getCategoriesNames.call(mockLoadOptionsFunctions);

			expect(result).toEqual([
				{ name: '', value: '' },
				{ name: '', value: '' },
				{ name: 'Valid Category', value: 'Valid Category' },
			]);
		});
	});
});
