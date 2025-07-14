import type { IDataObject, INodePropertyOptions } from 'n8n-workflow';

import {
	getValue,
	getConditions,
	sortOptions,
	getDefaultFields,
	getQuery,
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
});
