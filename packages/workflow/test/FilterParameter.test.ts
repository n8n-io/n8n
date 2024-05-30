import { executeFilter } from '@/NodeParameters/FilterParameter';
import type { FilterConditionValue, FilterValue } from '@/Interfaces';
import merge from 'lodash/merge';
import { DateTime } from 'luxon';

type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

const filterFactory = (data: DeepPartial<FilterValue> = {}): FilterValue =>
	merge(
		{
			combinator: 'and',
			conditions: [],
			options: {
				leftValue: '',
				caseSensitive: false,
				typeValidation: 'strict',
			},
		} as FilterValue,
		data,
	);

describe('FilterParameter', () => {
	describe('executeFilter', () => {
		it('should support and/or combinators', () => {
			const falseCondition: FilterConditionValue = {
				id: '1',
				leftValue: 'foo',
				rightValue: 'bar',
				operator: { operation: 'equals', type: 'string' },
			};
			const trueCondition: FilterConditionValue = {
				id: '2',
				leftValue: 'foo',
				rightValue: 'foo',
				operator: { operation: 'equals', type: 'string' },
			};

			const andResult = executeFilter(
				filterFactory({ combinator: 'and', conditions: [falseCondition, trueCondition] }),
			);
			expect(andResult).toBe(false);

			const orResult = executeFilter(
				filterFactory({ combinator: 'or', conditions: [falseCondition, trueCondition] }),
			);
			expect(orResult).toBe(true);
		});

		describe('options.caseSensitive', () => {
			it('should evaluate strings case insensitive (=default)', () => {
				const result = executeFilter(
					filterFactory({
						combinator: 'and',
						conditions: [
							{
								id: '1',
								leftValue: 'FOO',
								rightValue: 'foo',
								operator: { operation: 'equals', type: 'string' },
							},
							{
								id: '2',
								leftValue: 'foobarbaz',
								rightValue: 'BAR',
								operator: { operation: 'contains', type: 'string' },
							},
						],
						options: { caseSensitive: false },
					}),
				);
				expect(result).toBe(true);
			});

			it('should evaluate strings case sensitive', () => {
				const result = executeFilter(
					filterFactory({
						combinator: 'or',
						conditions: [
							{
								id: '1',
								leftValue: 'Foo',
								rightValue: 'FOO',
								operator: { operation: 'equals', type: 'string' },
							},
							{
								id: '2',
								leftValue: 'foobarbaz',
								rightValue: 'BAR',
								operator: { operation: 'contains', type: 'string' },
							},
						],
						options: { caseSensitive: true },
					}),
				);
				expect(result).toBe(false);
			});
		});

		describe('options.typeValidation', () => {
			describe('strict (=default)', () => {
				it('should throw an error when types are not as expected (primitives)', () => {
					expect(() =>
						executeFilter(
							filterFactory({
								conditions: [
									{
										id: '1',
										leftValue: '15',
										rightValue: true,
										operator: { operation: 'equals', type: 'number' },
									},
								],
								options: { typeValidation: 'strict' },
							}),
						),
					).toThrowError(
						"Wrong type: '15' is a string but was expecting a number [condition 0, item 0]",
					);
				});

				it('should throw an error when types are not as expected (arrays)', () => {
					expect(() =>
						executeFilter(
							filterFactory({
								conditions: [
									{
										id: '1',
										leftValue: '[]',
										rightValue: 0,
										operator: { operation: 'lengthEquals', type: 'array', rightType: 'number' },
									},
								],
								options: { typeValidation: 'strict' },
							}),
						),
					).toThrowError(
						"Wrong type: '[]' is a string but was expecting an array [condition 0, item 0]",
					);
				});

				it('should throw an error when types are not as expected (objects)', () => {
					expect(() =>
						executeFilter(
							filterFactory({
								conditions: [
									{
										id: '1',
										leftValue: '{}',
										operator: { operation: 'empty', type: 'object', singleValue: true },
									},
								],
								options: { typeValidation: 'strict' },
							}),
						),
					).toThrowError(
						"Wrong type: '{}' is a string but was expecting an object [condition 0, item 0]",
					);
				});
			});

			describe('loose', () => {
				it('should evaluate conditions when type can be converted', () => {
					const result = executeFilter(
						filterFactory({
							combinator: 'and',
							conditions: [
								{
									id: '1',
									leftValue: '15',
									rightValue: 15,
									operator: { operation: 'equals', type: 'number' },
								},
								{
									id: '2',
									leftValue: 'true',
									operator: { operation: 'true', type: 'boolean' },
								},
								{
									id: '3',
									leftValue: '',
									operator: { operation: 'false', type: 'boolean' },
								},

								{
									id: '4',
									leftValue: 0,
									operator: { operation: 'false', type: 'boolean' },
								},
								{
									id: '5',
									leftValue: 1,
									operator: { operation: 'true', type: 'boolean' },
								},
								{
									id: '6',
									leftValue: 'a string',
									operator: { operation: 'true', type: 'boolean' },
								},
							],
							options: { typeValidation: 'loose' },
						}),
					);
					expect(result).toBe(true);
				});

				it('should throw an error when types cannot be converted', () => {
					expect(() =>
						executeFilter(
							filterFactory({
								combinator: 'and',
								conditions: [
									{
										id: '1',
										leftValue: 'a string',
										rightValue: 15,
										operator: { operation: 'equals', type: 'number' },
									},
								],
								options: { typeValidation: 'loose' },
							}),
						),
					).toThrowError(
						"Conversion error: the string 'a string' can't be converted to a number [condition 0, item 0]",
					);
				});
			});
		});

		describe('operators', () => {
			describe('exists', () => {
				it.each([
					{ left: '', expected: true },
					{ left: null, expected: false },
					{ left: undefined, expected: false },
					{ left: 'foo', expected: true },
				])('string:exists($left) === $expected', ({ left, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left as string,
									operator: { operation: 'exists', type: 'string' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: '', expected: false },
					{ left: null, expected: true },
					{ left: undefined, expected: true },
					{ left: 'foo', expected: false },
				])('string:notExists($left) === $expected', ({ left, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left as string,
									operator: { operation: 'notExists', type: 'string' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});
			});

			describe('string', () => {
				it.each([
					{ left: null, expected: true },
					{ left: undefined, expected: true },
					{ left: '', expected: true },
					{ left: '🐛', expected: false },
				])('string:empty($left) === $expected', ({ left, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{ id: '1', leftValue: left, operator: { operation: 'empty', type: 'string' } },
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: null, expected: false },
					{ left: undefined, expected: false },
					{ left: '', expected: false },
					{ left: '🐛', expected: true },
				])('string:notEmpty($left) === $expected', ({ left, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{ id: '1', leftValue: left, operator: { operation: 'notEmpty', type: 'string' } },
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: 'first string', right: 'first string', expected: true },
					{ left: 'first string', right: 'second string', expected: false },
					{ left: '', right: '🐛', expected: false },
					{ left: '🐛', right: '🐛', expected: true },
				])('string:equals("$left","$right") === $expected', ({ left, right, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									rightValue: right,
									operator: { operation: 'equals', type: 'string' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: 'first string', right: 'first string', expected: false },
					{ left: 'first string', right: 'second string', expected: true },
					{ left: '', right: '🐛', expected: true },
					{ left: '🐛', right: '🐛', expected: false },
				])('string:notEquals("$left","$right") === $expected', ({ left, right, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									rightValue: right,
									operator: { operation: 'notEquals', type: 'string' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: 'first string', right: 'first string', expected: true },
					{ left: 'first string', right: 'first', expected: true },
					{ left: 'first string', right: 'irs', expected: true },
					{ left: 'first string', right: '', expected: true },
					{ left: 'first string', right: '?', expected: false },
				])('string:contains("$left","$right") === $expected', ({ left, right, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									rightValue: right,
									operator: { operation: 'contains', type: 'string' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: 'first string', right: 'first string', expected: false },
					{ left: 'first string', right: 'first', expected: false },
					{ left: 'first string', right: 'irs', expected: false },
					{ left: 'first string', right: '', expected: false },
					{ left: 'first string', right: '?', expected: true },
				])('string:notContains("$left","$right") === $expected', ({ left, right, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									rightValue: right,
									operator: { operation: 'notContains', type: 'string' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: 'first string', right: 'first string', expected: true },
					{ left: 'first string', right: 'first', expected: true },
					{ left: 'first string', right: 'irs', expected: false },
					{ left: 'first string', right: '', expected: true },
					{ left: 'first string', right: '?', expected: false },
				])('string:startsWith("$left","$right") === $expected', ({ left, right, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									rightValue: right,
									operator: { operation: 'startsWith', type: 'string' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: 'first string', right: 'first string', expected: false },
					{ left: 'first string', right: 'first', expected: false },
					{ left: 'first string', right: 'irs', expected: true },
					{ left: 'first string', right: '', expected: false },
					{ left: 'first string', right: '?', expected: true },
				])('string:notStartsWith("$left","$right") === $expected', ({ left, right, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									rightValue: right,
									operator: { operation: 'notStartsWith', type: 'string' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: 'first string', right: 'first string', expected: true },
					{ left: 'first string', right: 'string', expected: true },
					{ left: 'first string', right: 'g', expected: true },
					{ left: 'first string', right: '', expected: true },
					{ left: 'first string', right: '?', expected: false },
				])('string:endsWith("$left","$right") === $expected', ({ left, right, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									rightValue: right,
									operator: { operation: 'endsWith', type: 'string' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: 'first string', right: 'first string', expected: false },
					{ left: 'first string', right: 'string', expected: false },
					{ left: 'first string', right: 'g', expected: false },
					{ left: 'first string', right: '', expected: false },
					{ left: 'first string', right: '?', expected: true },
				])('string:notEndsWith("$left","$right") === $expected', ({ left, right, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									rightValue: right,
									operator: { operation: 'notEndsWith', type: 'string' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: 'first string', right: 'first', expected: true },
					{ left: 'first string', right: 'second', expected: false },
					{ left: 'first string', right: '.*', expected: true },
					{ left: 'any string', right: '[0-9]', expected: false },
					{ left: 'any string', right: '[a-z]', expected: true },
					{ left: 'lowercase', right: '[A-Z]', expected: false },
					{ left: 'foo', right: '/^fo{2}$/g', expected: true },
				])('string:regex("$left","$right") === $expected', ({ left, right, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									rightValue: right,
									operator: { operation: 'regex', type: 'string' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: 'first string', right: 'first', expected: false },
					{ left: 'first string', right: 'second', expected: true },
					{ left: 'first string', right: '.*', expected: false },
					{ left: 'any string', right: '[0-9]', expected: true },
					{ left: 'any string', right: '[a-z]', expected: false },
					{ left: 'lowercase', right: '[A-Z]', expected: true },
					{ left: 'foo', right: '/^fo{2}$/g', expected: false },
				])('string:notRegex("$left","$right") === $expected', ({ left, right, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									rightValue: right,
									operator: { operation: 'notRegex', type: 'string' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});
			});

			describe('number', () => {
				it.each([
					{ left: 0, expected: true },
					{ left: 15, expected: true },
					{ left: -15.4, expected: true },
					{ left: NaN, expected: false },
					{ left: null, expected: false },
				])('number:exists($left) === $expected', ({ left, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									operator: { operation: 'exists', type: 'number' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: 0, expected: false },
					{ left: 15, expected: false },
					{ left: -15.4, expected: false },
					{ left: NaN, expected: true },
					{ left: null, expected: true },
				])('number:notExists($left) === $expected', ({ left, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									operator: { operation: 'notExists', type: 'number' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: 0, right: 0, expected: true },
					{ left: 15, right: 15, expected: true },
					{ left: 15.34, right: 15.34, expected: true },
					{ left: 15, right: 15.3249038, expected: false },
					{ left: 15, right: NaN, expected: false },
					{ left: NaN, right: NaN, expected: false },
				])('number:equals($left,$right) === $expected', ({ left, right, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									rightValue: right,
									operator: { operation: 'equals', type: 'number' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: 0, right: 0, expected: false },
					{ left: 15, right: 15, expected: false },
					{ left: 15.34, right: 15.34, expected: false },
					{ left: 15, right: 15.3249038, expected: true },
					{ left: 15, right: NaN, expected: true },
					{ left: NaN, right: NaN, expected: true },
				])('number:notEquals($left,$right) === $expected', ({ left, right, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									rightValue: right,
									operator: { operation: 'notEquals', type: 'number' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: 0, right: 0, expected: false },
					{ left: 15, right: 16, expected: false },
					{ left: 16, right: 15, expected: true },
					{ left: 15.34001, right: 15.34, expected: true },
					{ left: 15, right: NaN, expected: false },
				])('number:gt($left,$right) === $expected', ({ left, right, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									rightValue: right,
									operator: { operation: 'gt', type: 'number' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: 0, right: 0, expected: false },
					{ left: 15, right: 16, expected: true },
					{ left: 16, right: 15, expected: false },
					{ left: 15.34001, right: 15.34, expected: false },
					{ left: 15, right: NaN, expected: false },
				])('number:lt($left,$right) === $expected', ({ left, right, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									rightValue: right,
									operator: { operation: 'lt', type: 'number' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: 0, right: 0, expected: true },
					{ left: 15, right: 16, expected: false },
					{ left: 16, right: 15, expected: true },
					{ left: 15.34001, right: 15.34, expected: true },
					{ left: 15, right: NaN, expected: false },
				])('number:gte($left,$right) === $expected', ({ left, right, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									rightValue: right,
									operator: { operation: 'gte', type: 'number' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: 0, right: 0, expected: true },
					{ left: 15, right: 16, expected: true },
					{ left: 16, right: 15, expected: false },
					{ left: 15.34001, right: 15.34, expected: false },
					{ left: 15, right: NaN, expected: false },
				])('number:lte($left,$right) === $expected', ({ left, right, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									rightValue: right,
									operator: { operation: 'lte', type: 'number' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});
			});

			describe('dateTime', () => {
				it.each([
					{ left: '2023-11-15T17:10:49.113Z', right: '2023-11-15T17:10:49.113Z', expected: true },
					{ left: '2023-11-15T17:10:49.113Z', right: '2023-11-15T17:12:49.113Z', expected: false },
				])('dateTime:equals("$left", "$right") === $expected', ({ left, right, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									rightValue: right,
									operator: { operation: 'equals', type: 'dateTime' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: '2023-11-15T17:10:49.113Z', right: '2023-11-15T17:10:49.113Z', expected: false },
					{ left: '2023-11-15T17:10:49.113Z', right: '2023-11-15T17:12:49.113Z', expected: true },
				])('dateTime:notEquals("$left", "$right") === $expected', ({ left, right, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									rightValue: right,
									operator: { operation: 'notEquals', type: 'dateTime' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: '2023-11-15T17:10:49.113Z', right: '2023-11-15T17:10:49.113Z', expected: false },
					{ left: '2023-11-15T17:10:49.113Z', right: '2023-11-15T17:12:49.113Z', expected: false },
					{ left: '2023-11-15T17:10:49.113Z', right: '2023-01-01T00:00:00.000Z', expected: true },
					{ left: '2024-01-01', right: new Date('2023-01-01T00:00:00.000Z'), expected: true },
					{
						left: DateTime.fromFormat('2024-01-01', 'yyyy-MM-dd'),
						right: '1-Feb-2024',
						expected: false,
					},
				])('dateTime:after("$left", "$right") === $expected', ({ left, right, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									rightValue: right,
									operator: { operation: 'after', type: 'dateTime' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: '2023-11-15T17:10:49.113Z', right: '2023-11-15T17:10:49.113Z', expected: false },
					{ left: '2023-11-15T17:10:49.113Z', right: '2023-11-15T17:12:49.113Z', expected: true },
					{ left: '2023-11-15T17:10:49.113Z', right: '2023-01-01T00:00:00.000Z', expected: false },
				])('dateTime:before("$left", "$right") === $expected', ({ left, right, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									rightValue: right,
									operator: { operation: 'before', type: 'dateTime' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: '2023-11-15T17:10:49.113Z', right: '2023-11-15T17:10:49.113Z', expected: true },
					{ left: '2023-11-15T17:10:49.113Z', right: '2023-11-15T17:12:49.113Z', expected: false },
					{ left: '2023-11-15T17:10:49.113Z', right: '2023-01-01T00:00:00.000Z', expected: true },
				])(
					'dateTime:afterOrEquals("$left", "$right") === $expected',
					({ left, right, expected }) => {
						const result = executeFilter(
							filterFactory({
								conditions: [
									{
										id: '1',
										leftValue: left,
										rightValue: right,
										operator: { operation: 'afterOrEquals', type: 'dateTime' },
									},
								],
							}),
						);
						expect(result).toBe(expected);
					},
				);

				it.each([
					{ left: '2023-11-15T17:10:49.113Z', right: '2023-11-15T17:10:49.113Z', expected: true },
					{ left: '2023-11-15T17:10:49.113Z', right: '2023-11-15T17:12:49.113Z', expected: true },
					{ left: '2023-11-15T17:10:49.113Z', right: '2023-01-01T00:00:00.000Z', expected: false },
				])(
					'dateTime:beforeOrEquals("$left", "$right") === $expected',
					({ left, right, expected }) => {
						const result = executeFilter(
							filterFactory({
								conditions: [
									{
										id: '1',
										leftValue: left,
										rightValue: right,
										operator: { operation: 'beforeOrEquals', type: 'dateTime' },
									},
								],
							}),
						);
						expect(result).toBe(expected);
					},
				);
			});

			describe('boolean', () => {
				it.each([
					{ left: true, expected: true },
					{ left: false, expected: false },
				])('boolean:true($left) === $expected', ({ left, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									operator: { operation: 'true', type: 'boolean' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: true, expected: false },
					{ left: false, expected: true },
				])('boolean:false($left) === $expected', ({ left, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									operator: { operation: 'false', type: 'boolean' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: true, right: true, expected: true },
					{ left: false, right: false, expected: true },
					{ left: true, right: false, expected: false },
				])('boolean:equals($left,$right) === $expected', ({ left, right, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									rightValue: right,
									operator: { operation: 'equals', type: 'boolean' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: true, right: true, expected: false },
					{ left: false, right: false, expected: false },
					{ left: true, right: false, expected: true },
				])('boolean:notEquals($left,$right) === $expected', ({ left, right, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									rightValue: right,
									operator: { operation: 'notEquals', type: 'boolean' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});
			});

			describe('array', () => {
				it.each([
					{ left: ['foo', 'bar'], right: 'foo', expected: true },
					{ left: ['foo', 'bar'], right: 'ba', expected: false },
				])('array:contains($left,$right) === $expected', ({ left, right, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									rightValue: right,
									operator: { operation: 'contains', type: 'array', rightType: 'any' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: ['foo', 'bar'], right: 'foo', expected: false },
					{ left: ['foo', 'bar'], right: 'ba', expected: true },
				])('array:notContains($left,$right) === $expected', ({ left, right, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									rightValue: right,
									operator: { operation: 'notContains', type: 'array', rightType: 'any' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: ['foo', 'bar'], right: 2, expected: true },
					{ left: [], right: 0, expected: true },
					{ left: ['foo', 'bar'], right: 1, expected: false },
				])('array:lengthEquals($left,$right) === $expected', ({ left, right, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									rightValue: right,
									operator: { operation: 'lengthEquals', type: 'array', rightType: 'number' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: ['foo', 'bar'], right: 2, expected: false },
					{ left: [], right: 0, expected: false },
					{ left: ['foo', 'bar'], right: 1, expected: true },
				])('array:lengthNotEquals($left,$right) === $expected', ({ left, right, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									rightValue: right,
									operator: { operation: 'lengthNotEquals', type: 'array', rightType: 'number' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: ['foo', 'bar'], right: 2, expected: false },
					{ left: [], right: 0, expected: false },
					{ left: ['foo', 'bar'], right: 1, expected: true },
				])('array:lengthGt($left,$right) === $expected', ({ left, right, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									rightValue: right,
									operator: { operation: 'lengthGt', type: 'array', rightType: 'number' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: ['foo', 'bar'], right: 2, expected: false },
					{ left: [], right: 0, expected: false },
					{ left: ['foo', 'bar'], right: 1, expected: false },
					{ left: ['foo', 'bar'], right: 3, expected: true },
				])('array:lengthLt($left,$right) === $expected', ({ left, right, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									rightValue: right,
									operator: { operation: 'lengthLt', type: 'array', rightType: 'number' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: ['foo', 'bar'], right: 2, expected: true },
					{ left: [], right: 0, expected: true },
					{ left: ['foo', 'bar'], right: 1, expected: true },
					{ left: ['foo', 'bar'], right: 3, expected: false },
				])('array:lengthGte($left,$right) === $expected', ({ left, right, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									rightValue: right,
									operator: { operation: 'lengthGte', type: 'array', rightType: 'number' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: ['foo', 'bar'], right: 2, expected: true },
					{ left: [], right: 0, expected: true },
					{ left: ['foo', 'bar'], right: 1, expected: false },
					{ left: ['foo', 'bar'], right: 3, expected: true },
				])('array:lengthLte($left,$right) === $expected', ({ left, right, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left,
									rightValue: right,
									operator: { operation: 'lengthLte', type: 'array', rightType: 'number' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});
			});

			describe('object', () => {
				it.each([
					{ left: {}, expected: true },
					{ left: { foo: 'bar' }, expected: false },
					{ left: undefined, expected: true },
					{ left: null, expected: true },
				])('object:empty($left) === $expected', ({ left, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left as string,
									operator: { operation: 'empty', type: 'object' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});

				it.each([
					{ left: {}, expected: false },
					{ left: { foo: 'bar' }, expected: true },
					{ left: undefined, expected: false },
					{ left: null, expected: false },
				])('object:notEmpty($left) === $expected', ({ left, expected }) => {
					const result = executeFilter(
						filterFactory({
							conditions: [
								{
									id: '1',
									leftValue: left as string,
									operator: { operation: 'notEmpty', type: 'object' },
								},
							],
						}),
					);
					expect(result).toBe(expected);
				});
			});
		});
	});
});
