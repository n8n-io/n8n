import {
	validateNodeParameters,
	assertParamIsString,
	assertParamIsNumber,
	assertParamIsBoolean,
	assertParamIsArray,
	assertParamIsOfAnyTypes,
} from '../../src/node-parameters/parameter-type-validation';
import type { INode } from '../../src/interfaces';

describe('Type assertion functions', () => {
	const mockNode: INode = {
		id: 'test-node-id',
		name: 'TestNode',
		type: 'n8n-nodes-base.testNode',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};

	describe('assertIsNodeParameters', () => {
		it('should pass for valid object with all required parameters', () => {
			const value = {
				name: 'test',
				age: 25,
				active: true,
			};

			const parameters = {
				name: { type: 'string' as const, required: true },
				age: { type: 'number' as const, required: true },
				active: { type: 'boolean' as const, required: true },
			};

			expect(() => validateNodeParameters(value, parameters, mockNode)).not.toThrow();
		});

		it('should pass for valid object with optional parameters present', () => {
			const value = {
				name: 'test',
				description: 'optional description',
			};

			const parameters = {
				name: { type: 'string' as const, required: true },
				description: { type: 'string' as const },
			};

			expect(() => validateNodeParameters(value, parameters, mockNode)).not.toThrow();
		});

		it('should pass for valid object with optional parameters missing', () => {
			const value = {
				name: 'test',
			};

			const parameters = {
				name: { type: 'string' as const, required: true },
				description: { type: 'string' as const },
			};

			expect(() => validateNodeParameters(value, parameters, mockNode)).not.toThrow();
		});

		it('should pass for valid array parameters', () => {
			const value = {
				tags: ['tag1', 'tag2'],
				numbers: [1, 2, 3],
				flags: [true, false],
			};

			const parameters = {
				tags: { type: 'string[]' as const, required: true },
				numbers: { type: 'number[]' as const, required: true },
				flags: { type: 'boolean[]' as const, required: true },
			};

			expect(() => validateNodeParameters(value, parameters, mockNode)).not.toThrow();
		});

		it('should pass for valid resource-locator parameter', () => {
			const value = {
				resource: {
					__rl: true,
					mode: 'list',
					value: 'some-value',
				},
			};

			const parameters = {
				resource: { type: 'resource-locator' as const, required: true },
			};

			expect(() => validateNodeParameters(value, parameters, mockNode)).not.toThrow();
		});

		it('should pass for valid object parameter', () => {
			const value = {
				config: {
					setting1: 'value1',
					setting2: 42,
				},
			};

			const parameters = {
				config: { type: 'object' as const, required: true },
			};

			expect(() => validateNodeParameters(value, parameters, mockNode)).not.toThrow();
		});

		it('should pass for parameter with multiple allowed types', () => {
			const value = {
				multiType: 'string value',
			};

			const parameters = {
				multiType: { type: ['string', 'number'] as Array<'string' | 'number'>, required: true },
			};

			expect(() => validateNodeParameters(value, parameters, mockNode)).not.toThrow();

			// Test with number value
			const value2 = {
				multiType: 42,
			};

			expect(() => validateNodeParameters(value2, parameters, mockNode)).not.toThrow();
		});

		it('should throw for null value', () => {
			const parameters = {
				name: { type: 'string' as const, required: true },
			};

			expect(() => validateNodeParameters(null, parameters, mockNode)).toThrow(
				'Value is not a valid object',
			);
		});

		it('should throw for non-object value', () => {
			const parameters = {
				name: { type: 'string' as const, required: true },
			};

			expect(() => validateNodeParameters('not an object', parameters, mockNode)).toThrow(
				'Value is not a valid object',
			);
			expect(() => validateNodeParameters(123, parameters, mockNode)).toThrow(
				'Value is not a valid object',
			);
			expect(() => validateNodeParameters(true, parameters, mockNode)).toThrow(
				'Value is not a valid object',
			);
		});

		it('should throw for missing required parameter', () => {
			const value = {
				// name is missing
			};

			const parameters = {
				name: { type: 'string' as const, required: true },
			};

			expect(() => validateNodeParameters(value, parameters, mockNode)).toThrow(
				'Required parameter "name" is missing',
			);
		});

		it('should throw for parameter with wrong type', () => {
			const value = {
				name: 123, // should be string
			};

			const parameters = {
				name: { type: 'string' as const, required: true },
			};

			expect(() => validateNodeParameters(value, parameters, mockNode)).toThrow(
				'Parameter "name" does not match any of the expected types: string',
			);
		});

		it('should throw for invalid array parameter', () => {
			const value = {
				tags: 'not an array',
			};

			const parameters = {
				tags: { type: 'string[]' as const, required: true },
			};

			expect(() => validateNodeParameters(value, parameters, mockNode)).toThrow(
				'Parameter "tags" does not match any of the expected types: string[]',
			);
		});

		it('should throw for array with wrong element type', () => {
			const value = {
				tags: ['valid', 123, 'also valid'], // 123 is not a string
			};

			const parameters = {
				tags: { type: 'string[]' as const, required: true },
			};

			expect(() => validateNodeParameters(value, parameters, mockNode)).toThrow(
				'Parameter "tags" does not match any of the expected types: string[]',
			);
		});

		it('should throw for invalid resource-locator parameter', () => {
			const value = {
				resource: {
					// missing required properties
					mode: 'list',
				},
			};

			const parameters = {
				resource: { type: 'resource-locator' as const, required: true },
			};

			expect(() => validateNodeParameters(value, parameters, mockNode)).toThrow(
				'Parameter "resource" does not match any of the expected types: resource-locator',
			);
		});

		it('should throw for invalid object parameter', () => {
			const value = {
				config: 'not an object',
			};

			const parameters = {
				config: { type: 'object' as const, required: true },
			};

			expect(() => validateNodeParameters(value, parameters, mockNode)).toThrow(
				'Parameter "config" does not match any of the expected types: object',
			);
		});

		it('should throw for parameter that matches none of the allowed types', () => {
			const value = {
				multiType: true, // should be string or number
			};

			const parameters = {
				multiType: { type: ['string', 'number'] as Array<'string' | 'number'>, required: true },
			};

			expect(() => validateNodeParameters(value, parameters, mockNode)).toThrow(
				'Parameter "multiType" does not match any of the expected types: string or number',
			);
		});

		it('should handle empty parameter definition', () => {
			const value = {
				extra: 'should be ignored',
			};

			const parameters = {};

			expect(() => validateNodeParameters(value, parameters, mockNode)).not.toThrow();
		});

		it('should handle complex nested scenarios', () => {
			const value = {
				name: 'test',
				tags: ['tag1', 'tag2'],
				config: {
					enabled: true,
					timeout: 5000,
				},
				resource: {
					__rl: true,
					mode: 'id',
					value: '12345',
				},
				optionalField: undefined,
			};

			const parameters = {
				name: { type: 'string' as const, required: true },
				tags: { type: 'string[]' as const, required: true },
				config: { type: 'object' as const, required: true },
				resource: { type: 'resource-locator' as const, required: true },
				optionalField: { type: 'string' as const },
			};

			expect(() => validateNodeParameters(value, parameters, mockNode)).not.toThrow();
		});

		it('should handle empty arrays', () => {
			const value = {
				emptyTags: [],
			};

			const parameters = {
				emptyTags: { type: 'string[]' as const, required: true },
			};

			expect(() => validateNodeParameters(value, parameters, mockNode)).not.toThrow();
		});

		it('should handle null values for optional parameters', () => {
			const value = {
				name: 'test',
				optionalField: null,
			};

			const parameters = {
				name: { type: 'string' as const, required: true },
				optionalField: { type: 'string' as const },
			};

			expect(() => validateNodeParameters(value, parameters, mockNode)).toThrow(
				'Parameter "optionalField" does not match any of the expected types: string',
			);
		});

		it('should handle resource-locator with additional properties', () => {
			const value = {
				resource: {
					__rl: true,
					mode: 'list',
					value: 'some-value',
					extraProperty: 'ignored',
				},
			};

			const parameters = {
				resource: { type: 'resource-locator' as const, required: true },
			};

			expect(() => validateNodeParameters(value, parameters, mockNode)).not.toThrow();
		});
	});

	describe('assertParamIsBoolean', () => {
		it('should pass for valid boolean values', () => {
			expect(() => assertParamIsBoolean('testParam', true, mockNode)).not.toThrow();
			expect(() => assertParamIsBoolean('testParam', false, mockNode)).not.toThrow();
		});

		it('should throw for non-boolean values', () => {
			expect(() => assertParamIsBoolean('testParam', 'true', mockNode)).toThrow(
				'Parameter "testParam" is not boolean',
			);
			expect(() => assertParamIsBoolean('testParam', 1, mockNode)).toThrow(
				'Parameter "testParam" is not boolean',
			);
			expect(() => assertParamIsBoolean('testParam', 0, mockNode)).toThrow(
				'Parameter "testParam" is not boolean',
			);
			expect(() => assertParamIsBoolean('testParam', null, mockNode)).toThrow(
				'Parameter "testParam" is not boolean',
			);
			expect(() => assertParamIsBoolean('testParam', undefined, mockNode)).toThrow(
				'Parameter "testParam" is not boolean',
			);
		});
	});

	describe('assertIsString', () => {
		it('should pass for valid string', () => {
			expect(() => assertParamIsString('testParam', 'hello', mockNode)).not.toThrow();
		});

		it('should throw for non-string values', () => {
			expect(() => assertParamIsString('testParam', 123, mockNode)).toThrow(
				'Parameter "testParam" is not string',
			);
			expect(() => assertParamIsString('testParam', true, mockNode)).toThrow(
				'Parameter "testParam" is not string',
			);
			expect(() => assertParamIsString('testParam', null, mockNode)).toThrow(
				'Parameter "testParam" is not string',
			);
			expect(() => assertParamIsString('testParam', undefined, mockNode)).toThrow(
				'Parameter "testParam" is not string',
			);
		});
	});

	describe('assertIsNumber', () => {
		it('should pass for valid number', () => {
			expect(() => assertParamIsNumber('testParam', 123, mockNode)).not.toThrow();
			expect(() => assertParamIsNumber('testParam', 0, mockNode)).not.toThrow();
			expect(() => assertParamIsNumber('testParam', -5.5, mockNode)).not.toThrow();
		});

		it('should throw for non-number values', () => {
			expect(() => assertParamIsNumber('testParam', '123', mockNode)).toThrow(
				'Parameter "testParam" is not number',
			);
			expect(() => assertParamIsNumber('testParam', true, mockNode)).toThrow(
				'Parameter "testParam" is not number',
			);
			expect(() => assertParamIsNumber('testParam', null, mockNode)).toThrow(
				'Parameter "testParam" is not number',
			);
			expect(() => assertParamIsNumber('testParam', undefined, mockNode)).toThrow(
				'Parameter "testParam" is not number',
			);
		});
	});

	describe('assertIsArray', () => {
		const isString = (val: unknown): val is string => typeof val === 'string';
		const isNumber = (val: unknown): val is number => typeof val === 'number';

		it('should pass for valid array with correct element types', () => {
			expect(() =>
				assertParamIsArray('testParam', ['a', 'b', 'c'], isString, mockNode),
			).not.toThrow();
			expect(() => assertParamIsArray('testParam', [1, 2, 3], isNumber, mockNode)).not.toThrow();
			expect(() => assertParamIsArray('testParam', [], isString, mockNode)).not.toThrow(); // empty array
		});

		it('should throw for non-array values', () => {
			expect(() => assertParamIsArray('testParam', 'not array', isString, mockNode)).toThrow(
				'Parameter "testParam" is not an array',
			);
			expect(() => assertParamIsArray('testParam', { length: 3 }, isString, mockNode)).toThrow(
				'Parameter "testParam" is not an array',
			);
		});

		it('should throw for array with incorrect element types', () => {
			expect(() => assertParamIsArray('testParam', ['a', 1, 'c'], isString, mockNode)).toThrow(
				'Parameter "testParam" has elements that don\'t match expected types',
			);
			expect(() => assertParamIsArray('testParam', [1, 'b', 3], isNumber, mockNode)).toThrow(
				'Parameter "testParam" has elements that don\'t match expected types',
			);
		});
	});

	describe('assertParamIsOfAnyTypes', () => {
		it('should pass for string value when string is in types array', () => {
			expect(() =>
				assertParamIsOfAnyTypes('testParam', 'hello', ['string'], mockNode),
			).not.toThrow();
		});

		it('should pass for number value when number is in types array', () => {
			expect(() => assertParamIsOfAnyTypes('testParam', 42, ['number'], mockNode)).not.toThrow();
		});

		it('should pass for boolean value when boolean is in types array', () => {
			expect(() => assertParamIsOfAnyTypes('testParam', true, ['boolean'], mockNode)).not.toThrow();
			expect(() =>
				assertParamIsOfAnyTypes('testParam', false, ['boolean'], mockNode),
			).not.toThrow();
		});

		it('should pass for string when multiple types include string', () => {
			expect(() =>
				assertParamIsOfAnyTypes('testParam', 'hello', ['string', 'number'], mockNode),
			).not.toThrow();
		});

		it('should pass for number when multiple types include number', () => {
			expect(() =>
				assertParamIsOfAnyTypes('testParam', 42, ['string', 'number'], mockNode),
			).not.toThrow();
		});

		it('should pass for boolean when multiple types include boolean', () => {
			expect(() =>
				assertParamIsOfAnyTypes('testParam', true, ['string', 'boolean'], mockNode),
			).not.toThrow();
		});

		it('should pass for value matching any of three types', () => {
			expect(() =>
				assertParamIsOfAnyTypes('testParam', 'test', ['string', 'number', 'boolean'], mockNode),
			).not.toThrow();
			expect(() =>
				assertParamIsOfAnyTypes('testParam', 123, ['string', 'number', 'boolean'], mockNode),
			).not.toThrow();
			expect(() =>
				assertParamIsOfAnyTypes('testParam', false, ['string', 'number', 'boolean'], mockNode),
			).not.toThrow();
		});

		it('should throw for string when types array does not include string', () => {
			expect(() => assertParamIsOfAnyTypes('testParam', 'hello', ['number'], mockNode)).toThrow(
				'Parameter "testParam" must be number',
			);
		});

		it('should throw for number when types array does not include number', () => {
			expect(() => assertParamIsOfAnyTypes('testParam', 42, ['string'], mockNode)).toThrow(
				'Parameter "testParam" must be string',
			);
		});

		it('should throw for boolean when types array does not include boolean', () => {
			expect(() => assertParamIsOfAnyTypes('testParam', true, ['string'], mockNode)).toThrow(
				'Parameter "testParam" must be string',
			);
		});

		it('should throw for value that matches none of multiple types', () => {
			expect(() =>
				assertParamIsOfAnyTypes('testParam', 'hello', ['number', 'boolean'], mockNode),
			).toThrow('Parameter "testParam" must be number or boolean');
		});

		it('should throw for null value', () => {
			expect(() => assertParamIsOfAnyTypes('testParam', null, ['string'], mockNode)).toThrow(
				'Parameter "testParam" must be string',
			);
			expect(() =>
				assertParamIsOfAnyTypes('testParam', null, ['string', 'number'], mockNode),
			).toThrow('Parameter "testParam" must be string or number');
		});

		it('should throw for undefined value', () => {
			expect(() => assertParamIsOfAnyTypes('testParam', undefined, ['string'], mockNode)).toThrow(
				'Parameter "testParam" must be string',
			);
			expect(() =>
				assertParamIsOfAnyTypes('testParam', undefined, ['boolean', 'number'], mockNode),
			).toThrow('Parameter "testParam" must be boolean or number');
		});

		it('should throw for object when primitive types are expected', () => {
			expect(() =>
				assertParamIsOfAnyTypes('testParam', {}, ['string', 'number'], mockNode),
			).toThrow('Parameter "testParam" must be string or number');
			expect(() => assertParamIsOfAnyTypes('testParam', [], ['boolean'], mockNode)).toThrow(
				'Parameter "testParam" must be boolean',
			);
		});

		it('should handle special number values correctly', () => {
			expect(() => assertParamIsOfAnyTypes('testParam', NaN, ['number'], mockNode)).not.toThrow();
			expect(() =>
				assertParamIsOfAnyTypes('testParam', Infinity, ['number'], mockNode),
			).not.toThrow();
			expect(() =>
				assertParamIsOfAnyTypes('testParam', -Infinity, ['number'], mockNode),
			).not.toThrow();
		});

		it('should handle empty string correctly', () => {
			expect(() => assertParamIsOfAnyTypes('testParam', '', ['string'], mockNode)).not.toThrow();
		});

		it('should handle zero correctly', () => {
			expect(() => assertParamIsOfAnyTypes('testParam', 0, ['number'], mockNode)).not.toThrow();
		});

		it('should format error message correctly for single type', () => {
			expect(() => assertParamIsOfAnyTypes('myParam', 123, ['string'], mockNode)).toThrow(
				'Parameter "myParam" must be string',
			);
		});

		it('should format error message correctly for two types', () => {
			expect(() =>
				assertParamIsOfAnyTypes('myParam', 'test', ['number', 'boolean'], mockNode),
			).toThrow('Parameter "myParam" must be number or boolean');
		});

		it('should format error message correctly for three types', () => {
			expect(() =>
				assertParamIsOfAnyTypes('myParam', {}, ['string', 'number', 'boolean'], mockNode),
			).toThrow('Parameter "myParam" must be string or number or boolean');
		});

		it('should handle readonly array types correctly', () => {
			const types = ['string', 'number'] as const;
			expect(() => assertParamIsOfAnyTypes('testParam', 'hello', types, mockNode)).not.toThrow();
			expect(() => assertParamIsOfAnyTypes('testParam', 42, types, mockNode)).not.toThrow();
			expect(() => assertParamIsOfAnyTypes('testParam', true, types, mockNode)).toThrow(
				'Parameter "testParam" must be string or number',
			);
		});
	});

	describe('Edge cases and additional scenarios', () => {
		describe('validateNodeParameters edge cases', () => {
			it('should handle NaN values correctly', () => {
				const value = {
					number: NaN,
				};

				const parameters = {
					number: { type: 'number' as const, required: true },
				};

				// NaN is of type 'number' in JavaScript
				expect(() => validateNodeParameters(value, parameters, mockNode)).not.toThrow();
			});

			it('should handle Infinity values correctly', () => {
				const value = {
					number: Infinity,
				};

				const parameters = {
					number: { type: 'number' as const, required: true },
				};

				expect(() => validateNodeParameters(value, parameters, mockNode)).not.toThrow();
			});

			it('should handle mixed array types correctly', () => {
				const value = {
					mixed: [1, '2', 3], // Invalid: mixed types in array
				};

				const parameters = {
					mixed: { type: 'number[]' as const, required: true },
				};

				expect(() => validateNodeParameters(value, parameters, mockNode)).toThrow(
					'Parameter "mixed" does not match any of the expected types: number[]',
				);
			});

			it('should handle nested arrays', () => {
				const value = {
					nested: [
						[1, 2],
						[3, 4],
					], // Array of arrays
				};

				const parameters = {
					nested: { type: 'object' as const, required: true },
				};

				expect(() => validateNodeParameters(value, parameters, mockNode)).not.toThrow();
			});

			it('should handle resource-locator with false __rl property', () => {
				const value = {
					resource: {
						__rl: false, // Should still be valid as it has the property
						mode: 'list',
						value: 'some-value',
					},
				};

				const parameters = {
					resource: { type: 'resource-locator' as const, required: true },
				};

				expect(() => validateNodeParameters(value, parameters, mockNode)).not.toThrow();
			});

			it('should handle resource-locator missing __rl property', () => {
				const value = {
					resource: {
						mode: 'list',
						value: 'some-value',
						// __rl is missing
					},
				};

				const parameters = {
					resource: { type: 'resource-locator' as const, required: true },
				};

				expect(() => validateNodeParameters(value, parameters, mockNode)).toThrow(
					'Parameter "resource" does not match any of the expected types: resource-locator',
				);
			});

			it('should handle empty string as valid string parameter', () => {
				const value = {
					name: '',
				};

				const parameters = {
					name: { type: 'string' as const, required: true },
				};

				expect(() => validateNodeParameters(value, parameters, mockNode)).not.toThrow();
			});

			it('should handle zero as valid number parameter', () => {
				const value = {
					count: 0,
				};

				const parameters = {
					count: { type: 'number' as const, required: true },
				};

				expect(() => validateNodeParameters(value, parameters, mockNode)).not.toThrow();
			});

			it('should handle arrays with only false values', () => {
				const value = {
					flags: [false, false, false],
				};

				const parameters = {
					flags: { type: 'boolean[]' as const, required: true },
				};

				expect(() => validateNodeParameters(value, parameters, mockNode)).not.toThrow();
			});

			it('should handle three or more type unions', () => {
				const value = {
					multiType: 'string value',
				};

				const parameters = {
					multiType: {
						type: ['string', 'number', 'boolean'] as Array<'string' | 'number' | 'boolean'>,
						required: true,
					},
				};

				expect(() => validateNodeParameters(value, parameters, mockNode)).not.toThrow();

				// Test with boolean value
				const value2 = {
					multiType: true,
				};

				expect(() => validateNodeParameters(value2, parameters, mockNode)).not.toThrow();
			});

			it('should handle array types in multi-type parameters', () => {
				const value = {
					flexParam: ['a', 'b', 'c'],
				};

				const parameters = {
					flexParam: {
						type: ['string', 'string[]'] as Array<'string' | 'string[]'>,
						required: true,
					},
				};

				expect(() => validateNodeParameters(value, parameters, mockNode)).not.toThrow();

				// Test with single string
				const value2 = {
					flexParam: 'single string',
				};

				expect(() => validateNodeParameters(value2, parameters, mockNode)).not.toThrow();
			});

			it('should handle object with null prototype', () => {
				const value = Object.create(null);
				value.name = 'test';

				const parameters = {
					name: { type: 'string' as const, required: true },
				};

				expect(() => validateNodeParameters(value, parameters, mockNode)).not.toThrow();
			});
		});

		describe('assertParamIsArray edge cases', () => {
			const isString = (val: unknown): val is string => typeof val === 'string';

			it('should handle array-like objects', () => {
				const arrayLike = { 0: 'a', 1: 'b', length: 2 };

				expect(() => assertParamIsArray('testParam', arrayLike, isString, mockNode)).toThrow(
					'Parameter "testParam" is not an array',
				);
			});

			it('should handle sparse arrays', () => {
				const sparse = new Array(3);
				sparse[0] = 'a';
				sparse[2] = 'c';
				// sparse[1] is undefined

				// For loop implementation properly validates sparse arrays and throws on undefined elements
				expect(() => assertParamIsArray('testParam', sparse, isString, mockNode)).toThrow(
					'Parameter "testParam" has elements that don\'t match expected types',
				);
			});

			it('should handle arrays with explicit undefined values', () => {
				const arrayWithUndefined = ['a', undefined, 'c'];

				expect(() =>
					assertParamIsArray('testParam', arrayWithUndefined, isString, mockNode),
				).toThrow('Parameter "testParam" has elements that don\'t match expected types');
			});

			it('should handle very large arrays efficiently', () => {
				const largeArray = new Array(1000).fill('test');

				expect(() => assertParamIsArray('testParam', largeArray, isString, mockNode)).not.toThrow();
			});
		});
	});
});
