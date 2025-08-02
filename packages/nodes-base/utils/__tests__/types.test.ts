import { assertIsNodeParameters, assertIsString, assertIsNumber, assertIsArray } from '../types';

describe('Type assertion functions', () => {
	describe('assertIsNodeParameters', () => {
		it('should pass for valid object with all required parameters', () => {
			const value = {
				name: 'test',
				age: 25,
				active: true,
			};

			const parameters = {
				name: { type: 'string' as const },
				age: { type: 'number' as const },
				active: { type: 'boolean' as const },
			};

			expect(() => assertIsNodeParameters(value, parameters)).not.toThrow();
		});

		it('should pass for valid object with optional parameters present', () => {
			const value = {
				name: 'test',
				description: 'optional description',
			};

			const parameters = {
				name: { type: 'string' as const },
				description: { type: 'string' as const, optional: true },
			};

			expect(() => assertIsNodeParameters(value, parameters)).not.toThrow();
		});

		it('should pass for valid object with optional parameters missing', () => {
			const value = {
				name: 'test',
			};

			const parameters = {
				name: { type: 'string' as const },
				description: { type: 'string' as const, optional: true },
			};

			expect(() => assertIsNodeParameters(value, parameters)).not.toThrow();
		});

		it('should pass for valid array parameters', () => {
			const value = {
				tags: ['tag1', 'tag2'],
				numbers: [1, 2, 3],
				flags: [true, false],
			};

			const parameters = {
				tags: { type: 'string[]' as const },
				numbers: { type: 'number[]' as const },
				flags: { type: 'boolean[]' as const },
			};

			expect(() => assertIsNodeParameters(value, parameters)).not.toThrow();
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
				resource: { type: 'resource-locator' as const },
			};

			expect(() => assertIsNodeParameters(value, parameters)).not.toThrow();
		});

		it('should pass for valid object parameter', () => {
			const value = {
				config: {
					setting1: 'value1',
					setting2: 42,
				},
			};

			const parameters = {
				config: { type: 'object' as const },
			};

			expect(() => assertIsNodeParameters(value, parameters)).not.toThrow();
		});

		it('should pass for parameter with multiple allowed types', () => {
			const value = {
				multiType: 'string value',
			};

			const parameters = {
				multiType: { type: ['string', 'number'] as Array<'string' | 'number'> },
			};

			expect(() => assertIsNodeParameters(value, parameters)).not.toThrow();

			// Test with number value
			const value2 = {
				multiType: 42,
			};

			expect(() => assertIsNodeParameters(value2, parameters)).not.toThrow();
		});

		it('should throw for null value', () => {
			const parameters = {
				name: { type: 'string' as const },
			};

			expect(() => assertIsNodeParameters(null, parameters)).toThrow('Value is not a valid object');
		});

		it('should throw for non-object value', () => {
			const parameters = {
				name: { type: 'string' as const },
			};

			expect(() => assertIsNodeParameters('not an object', parameters)).toThrow(
				'Value is not a valid object',
			);
			expect(() => assertIsNodeParameters(123, parameters)).toThrow('Value is not a valid object');
			expect(() => assertIsNodeParameters(true, parameters)).toThrow('Value is not a valid object');
		});

		it('should throw for missing required parameter', () => {
			const value = {
				// name is missing
			};

			const parameters = {
				name: { type: 'string' as const },
			};

			expect(() => assertIsNodeParameters(value, parameters)).toThrow(
				'Required parameter "name" is missing',
			);
		});

		it('should throw for parameter with wrong type', () => {
			const value = {
				name: 123, // should be string
			};

			const parameters = {
				name: { type: 'string' as const },
			};

			expect(() => assertIsNodeParameters(value, parameters)).toThrow(
				'Parameter "name" does not match any of the expected types: string',
			);
		});

		it('should throw for invalid array parameter', () => {
			const value = {
				tags: 'not an array',
			};

			const parameters = {
				tags: { type: 'string[]' as const },
			};

			expect(() => assertIsNodeParameters(value, parameters)).toThrow(
				'Parameter "tags" does not match any of the expected types: string[]',
			);
		});

		it('should throw for array with wrong element type', () => {
			const value = {
				tags: ['valid', 123, 'also valid'], // 123 is not a string
			};

			const parameters = {
				tags: { type: 'string[]' as const },
			};

			expect(() => assertIsNodeParameters(value, parameters)).toThrow(
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
				resource: { type: 'resource-locator' as const },
			};

			expect(() => assertIsNodeParameters(value, parameters)).toThrow(
				'Parameter "resource" does not match any of the expected types: resource-locator',
			);
		});

		it('should throw for invalid object parameter', () => {
			const value = {
				config: 'not an object',
			};

			const parameters = {
				config: { type: 'object' as const },
			};

			expect(() => assertIsNodeParameters(value, parameters)).toThrow(
				'Parameter "config" does not match any of the expected types: object',
			);
		});

		it('should throw for parameter that matches none of the allowed types', () => {
			const value = {
				multiType: true, // should be string or number
			};

			const parameters = {
				multiType: { type: ['string', 'number'] as Array<'string' | 'number'> },
			};

			expect(() => assertIsNodeParameters(value, parameters)).toThrow(
				'Parameter "multiType" does not match any of the expected types: string or number',
			);
		});

		it('should handle empty parameter definition', () => {
			const value = {
				extra: 'should be ignored',
			};

			const parameters = {};

			expect(() => assertIsNodeParameters(value, parameters)).not.toThrow();
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
				name: { type: 'string' as const },
				tags: { type: 'string[]' as const },
				config: { type: 'object' as const },
				resource: { type: 'resource-locator' as const },
				optionalField: { type: 'string' as const, optional: true },
			};

			expect(() => assertIsNodeParameters(value, parameters)).not.toThrow();
		});

		it('should handle empty arrays', () => {
			const value = {
				emptyTags: [],
			};

			const parameters = {
				emptyTags: { type: 'string[]' as const },
			};

			expect(() => assertIsNodeParameters(value, parameters)).not.toThrow();
		});

		it('should handle null values for optional parameters', () => {
			const value = {
				name: 'test',
				optionalField: null,
			};

			const parameters = {
				name: { type: 'string' as const },
				optionalField: { type: 'string' as const, optional: true },
			};

			expect(() => assertIsNodeParameters(value, parameters)).toThrow(
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
				resource: { type: 'resource-locator' as const },
			};

			expect(() => assertIsNodeParameters(value, parameters)).not.toThrow();
		});
	});

	describe('assertIsString', () => {
		it('should pass for valid string', () => {
			expect(() => assertIsString('testParam', 'hello')).not.toThrow();
		});

		it('should throw for non-string values', () => {
			expect(() => assertIsString('testParam', 123)).toThrow('Parameter "testParam" is not string');
			expect(() => assertIsString('testParam', true)).toThrow(
				'Parameter "testParam" is not string',
			);
			expect(() => assertIsString('testParam', null)).toThrow(
				'Parameter "testParam" is not string',
			);
			expect(() => assertIsString('testParam', undefined)).toThrow(
				'Parameter "testParam" is not string',
			);
		});
	});

	describe('assertIsNumber', () => {
		it('should pass for valid number', () => {
			expect(() => assertIsNumber('testParam', 123)).not.toThrow();
			expect(() => assertIsNumber('testParam', 0)).not.toThrow();
			expect(() => assertIsNumber('testParam', -5.5)).not.toThrow();
		});

		it('should throw for non-number values', () => {
			expect(() => assertIsNumber('testParam', '123')).toThrow(
				'Parameter "testParam" is not number',
			);
			expect(() => assertIsNumber('testParam', true)).toThrow(
				'Parameter "testParam" is not number',
			);
			expect(() => assertIsNumber('testParam', null)).toThrow(
				'Parameter "testParam" is not number',
			);
			expect(() => assertIsNumber('testParam', undefined)).toThrow(
				'Parameter "testParam" is not number',
			);
		});
	});

	describe('assertIsArray', () => {
		const isString = (val: unknown): val is string => typeof val === 'string';
		const isNumber = (val: unknown): val is number => typeof val === 'number';

		it('should pass for valid array with correct element types', () => {
			expect(() => assertIsArray('testParam', ['a', 'b', 'c'], isString)).not.toThrow();
			expect(() => assertIsArray('testParam', [1, 2, 3], isNumber)).not.toThrow();
			expect(() => assertIsArray('testParam', [], isString)).not.toThrow(); // empty array
		});

		it('should throw for non-array values', () => {
			expect(() => assertIsArray('testParam', 'not array', isString)).toThrow(
				'Parameter "testParam" is not an array',
			);
			expect(() => assertIsArray('testParam', { length: 3 }, isString)).toThrow(
				'Parameter "testParam" is not an array',
			);
		});

		it('should throw for array with incorrect element types', () => {
			expect(() => assertIsArray('testParam', ['a', 1, 'c'], isString)).toThrow(
				'Parameter "testParam" has elements that don\'t match expected types',
			);
			expect(() => assertIsArray('testParam', [1, 'b', 3], isNumber)).toThrow(
				'Parameter "testParam" has elements that don\'t match expected types',
			);
		});
	});
});
