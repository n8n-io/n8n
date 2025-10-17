import type { IDataObject, INodePropertyOptions } from 'n8n-workflow';

import {
	getValue,
	getConditions,
	sortOptions,
	getDefaultFields,
	getQuery,
	filterAndManageProcessedItems,
} from '../GenericFunctions';

describe('Salesforce -> GenericFunctions', () => {
	describe('getValue', () => {
		it('should return date string as is', () => {
			const value = '2025-01-01T00:00:00Z';

			const result = getValue(value) as string;

			expect(result).toBe(value);
		});

		it('should return string in single quotes', () => {
			const value = 'foo bar baz';

			const result = getValue(value) as string;

			expect(result).toBe("'foo bar baz'");
		});

		it('should return number as is', () => {
			const value = 123;

			const result = getValue(value) as number;

			expect(result).toBe(value);
		});

		it('should return boolean as is', () => {
			const value = false;

			const result = getValue(value) as boolean;

			expect(result).toBe(value);
		});
	});

	describe('sortOptions', () => {
		it('should sort options alphabetically by name', () => {
			const unsorted: INodePropertyOptions[] = [
				{
					name: 'B Property',
					value: 'foo',
				},
				{
					name: 'C Property',
					value: 'bar',
				},
				{
					name: 'A Property',
					value: 'baz',
				},
			];
			const sorted: INodePropertyOptions[] = [
				{
					name: 'A Property',
					value: 'baz',
				},
				{
					name: 'B Property',
					value: 'foo',
				},
				{
					name: 'C Property',
					value: 'bar',
				},
			];

			sortOptions(unsorted);

			expect(unsorted).toEqual(sorted);
		});
	});

	describe('getConditions', () => {
		it('should handle equals operation', () => {
			const options: IDataObject = {
				conditionsUi: {
					conditionValues: [{ field: 'field_1', operation: 'equal', value: '123' }],
				},
			};

			const result = getConditions(options);

			expect(result).toBe('WHERE field_1 = 123');
		});

		it('should handle other operations', () => {
			const options: IDataObject = {
				conditionsUi: {
					conditionValues: [
						{ field: 'field_1', operation: '>', value: '123' },
						{ field: 'field_2', operation: '<', value: '456' },
						{ field: 'field_3', operation: '>=', value: '789' },
						{ field: 'field_4', operation: '<=', value: '0' },
					],
				},
			};

			const result = getConditions(options);

			expect(result).toBe(
				'WHERE field_1 > 123 AND field_2 < 456 AND field_3 >= 789 AND field_4 <= 0',
			);
		});

		it('should return undefined when constitions is not an array', () => {
			const options: IDataObject = {
				conditionsUi: {
					conditionValues: 'not an array',
				},
			};

			const result = getConditions(options);

			expect(result).toBeUndefined();
		});

		it('should return undefined when constitions is an empty array', () => {
			const options: IDataObject = {
				conditionsUi: {
					conditionValues: [],
				},
			};

			const result = getConditions(options);

			expect(result).toBeUndefined();
		});
	});

	describe('getDefaultFields', () => {
		it('should return default fields', () => {
			expect(getDefaultFields('Account')).toBe('id,name,type');
			expect(getDefaultFields('Lead')).toBe(
				'id,company,firstname,lastname,street,postalCode,city,email,status',
			);
			expect(getDefaultFields('Contact')).toBe('id,firstname,lastname,email');
			expect(getDefaultFields('Opportunity')).toBe('id,accountId,amount,probability,type');
			expect(getDefaultFields('Case')).toBe('id,accountId,contactId,priority,status,subject,type');
			expect(getDefaultFields('Task')).toBe('id,subject,status,priority');
			expect(getDefaultFields('Attachment')).toBe('id,name');
			expect(getDefaultFields('User')).toBe('id,name,email');
		});
	});

	describe('getQuery', () => {
		it('should return query when the fields are comma separated', () => {
			const options: IDataObject = {
				fields: 'id,name,email',
			};

			const result = getQuery(options, 'Account', true);

			expect(result).toBe('SELECT id,name,email FROM Account ');
		});

		it('should return query when the fields are strings in an array', () => {
			const options: IDataObject = {
				fields: ['id', 'name', 'email'],
			};

			const result = getQuery(options, 'Account', true);

			expect(result).toBe('SELECT id,name,email FROM Account ');
		});

		it('should return query with default fields when the fields are missing', () => {
			const options: IDataObject = {};

			const result = getQuery(options, 'Account', true);

			expect(result).toBe('SELECT id,name,type FROM Account ');
		});

		it('should return query with a condition', () => {
			const options: IDataObject = {
				fields: 'id,name,email',
				conditionsUi: {
					conditionValues: [{ field: 'id', operation: 'equal', value: '123' }],
				},
			};

			const result = getQuery(options, 'Account', true);

			expect(result).toBe('SELECT id,name,email FROM Account WHERE id = 123');
		});

		it('should return query with a limit', () => {
			const options: IDataObject = {
				fields: 'id,name,email',
			};

			const result = getQuery(options, 'Account', false, 5);

			expect(result).toBe('SELECT id,name,email FROM Account  LIMIT 5');
		});

		it('should return query with a condition and a limit', () => {
			const options: IDataObject = {
				fields: 'id,name,email',
				conditionsUi: {
					conditionValues: [{ field: 'id', operation: 'equal', value: '123' }],
				},
			};

			const result = getQuery(options, 'Account', false, 5);

			expect(result).toBe('SELECT id,name,email FROM Account WHERE id = 123 LIMIT 5');
		});
	});

	describe('filterAndManageProcessedItems', () => {
		it('should filter out already processed items', () => {
			const responseData: IDataObject[] = [
				{ Id: '001', Name: 'Item 1' },
				{ Id: '002', Name: 'Item 2' },
				{ Id: '003', Name: 'Item 3' },
			];
			const processedIds = ['002'];

			const result = filterAndManageProcessedItems(responseData, processedIds);

			expect(result.newItems).toEqual([
				{ Id: '001', Name: 'Item 1' },
				{ Id: '003', Name: 'Item 3' },
			]);
			// All processed IDs are kept, plus new items are added
			expect(result.updatedProcessedIds).toEqual(['002', '001', '003']);
		});

		it('should handle empty response data', () => {
			const responseData: IDataObject[] = [];
			const processedIds = ['001', '002'];

			const result = filterAndManageProcessedItems(responseData, processedIds);

			expect(result.newItems).toEqual([]);
			expect(result.updatedProcessedIds).toEqual(['001', '002']);
		});

		it('should handle empty processed IDs', () => {
			const responseData: IDataObject[] = [
				{ Id: '001', Name: 'Item 1' },
				{ Id: '002', Name: 'Item 2' },
			];
			const processedIds: string[] = [];

			const result = filterAndManageProcessedItems(responseData, processedIds);

			expect(result.newItems).toEqual(responseData);
			expect(result.updatedProcessedIds).toEqual(['001', '002']);
		});

		it('should handle all items already processed', () => {
			const responseData: IDataObject[] = [
				{ Id: '001', Name: 'Item 1' },
				{ Id: '002', Name: 'Item 2' },
			];
			const processedIds = ['001', '002', '003'];

			const result = filterAndManageProcessedItems(responseData, processedIds);

			expect(result.newItems).toEqual([]);
			// All processed IDs are kept since no new items were found
			expect(result.updatedProcessedIds).toEqual(['001', '002', '003']);
		});

		it('should handle large numbers of processed IDs efficiently', () => {
			// Create 995 existing processed IDs
			const processedIds = Array.from({ length: 995 }, (_, i) => `existing-${i}`);

			// Add 10 new items
			const responseData: IDataObject[] = Array.from({ length: 10 }, (_, i) => ({
				Id: `new-${i}`,
				Name: `New Item ${i}`,
			}));

			const result = filterAndManageProcessedItems(responseData, processedIds);

			expect(result.newItems).toHaveLength(10);
			// Should keep all existing IDs + 10 new IDs (no artificial limit)
			expect(result.updatedProcessedIds).toHaveLength(1005);

			// Should keep all existing IDs + new IDs
			expect(result.updatedProcessedIds.slice(0, 995)).toEqual(processedIds);
			expect(result.updatedProcessedIds.slice(-10)).toEqual(
				responseData.map((item) => item.Id as string),
			);
		});

		it('should handle very large batches of new items', () => {
			const processedIds = ['existing-1', 'existing-2'];

			// Create 1005 new items
			const responseData: IDataObject[] = Array.from({ length: 1005 }, (_, i) => ({
				Id: `new-${i}`,
				Name: `New Item ${i}`,
			}));

			const result = filterAndManageProcessedItems(responseData, processedIds);

			expect(result.newItems).toHaveLength(1005);
			// Should keep all existing IDs + all new IDs (no artificial limit)
			expect(result.updatedProcessedIds).toHaveLength(1007);

			// Should keep all existing IDs + all new IDs
			const expectedIds = processedIds.concat(responseData.map((item) => item.Id as string));
			expect(result.updatedProcessedIds).toEqual(expectedIds);
		});

		it('should trim processed IDs to MAX_IDS limit (10000)', () => {
			// Create 9995 existing processed IDs
			const processedIds = Array.from({ length: 9995 }, (_, i) => `existing-${i}`);

			// Add 10 new items (total would be 10005)
			const responseData: IDataObject[] = Array.from({ length: 10 }, (_, i) => ({
				Id: `new-${i}`,
				Name: `New Item ${i}`,
			}));

			const result = filterAndManageProcessedItems(responseData, processedIds);

			expect(result.newItems).toHaveLength(10);
			// Should be trimmed to exactly 10000 items (MAX_IDS limit)
			expect(result.updatedProcessedIds).toHaveLength(10000);

			// Should keep the last 10000 items (trimmed from the beginning)
			const expectedIds = processedIds
				.slice(-9990)
				.concat(responseData.map((item) => item.Id as string));
			expect(result.updatedProcessedIds).toEqual(expectedIds);
		});

		it('should trim processed IDs when exceeding MAX_IDS with large batch', () => {
			// Create 5000 existing processed IDs
			const processedIds = Array.from({ length: 5000 }, (_, i) => `existing-${i}`);

			// Add 6000 new items (total would be 11000, exceeding MAX_IDS)
			const responseData: IDataObject[] = Array.from({ length: 6000 }, (_, i) => ({
				Id: `new-${i}`,
				Name: `New Item ${i}`,
			}));

			const result = filterAndManageProcessedItems(responseData, processedIds);

			expect(result.newItems).toHaveLength(6000);
			// Should be trimmed to exactly 10000 items (MAX_IDS limit)
			expect(result.updatedProcessedIds).toHaveLength(10000);

			// Should keep the last 10000 items (all new items + last 4000 existing)
			const expectedIds = processedIds
				.slice(-4000)
				.concat(responseData.map((item) => item.Id as string));
			expect(result.updatedProcessedIds).toEqual(expectedIds);
		});

		it('should not trim when under MAX_IDS limit', () => {
			// Create 100 existing processed IDs (well under limit)
			const processedIds = Array.from({ length: 100 }, (_, i) => `existing-${i}`);

			// Add 50 new items
			const responseData: IDataObject[] = Array.from({ length: 50 }, (_, i) => ({
				Id: `new-${i}`,
				Name: `New Item ${i}`,
			}));

			const result = filterAndManageProcessedItems(responseData, processedIds);

			expect(result.newItems).toHaveLength(50);
			// Should keep all items since under limit
			expect(result.updatedProcessedIds).toHaveLength(150);

			// Should keep all existing IDs + all new IDs
			const expectedIds = processedIds.concat(responseData.map((item) => item.Id as string));
			expect(result.updatedProcessedIds).toEqual(expectedIds);
		});

		it('should handle duplicate IDs in response data correctly', () => {
			const responseData: IDataObject[] = [
				{ Id: '001', Name: 'Item 1' },
				{ Id: '002', Name: 'Item 2' },
				{ Id: '001', Name: 'Item 1 Duplicate' }, // Duplicate ID
			];
			const processedIds = ['003'];

			const result = filterAndManageProcessedItems(responseData, processedIds);

			// Should include both items with ID '001' since they're not in processedIds
			expect(result.newItems).toEqual([
				{ Id: '001', Name: 'Item 1' },
				{ Id: '002', Name: 'Item 2' },
				{ Id: '001', Name: 'Item 1 Duplicate' },
			]);
			expect(result.updatedProcessedIds).toEqual(['003', '001', '002', '001']);
		});

		it('should maintain order of processed IDs', () => {
			const responseData: IDataObject[] = [
				{ Id: '003', Name: 'Item 3' },
				{ Id: '001', Name: 'Item 1' },
				{ Id: '004', Name: 'Item 4' },
			];
			const processedIds = ['100', '200'];

			const result = filterAndManageProcessedItems(responseData, processedIds);

			expect(result.updatedProcessedIds).toEqual(['100', '200', '003', '001', '004']);
		});
	});
});
