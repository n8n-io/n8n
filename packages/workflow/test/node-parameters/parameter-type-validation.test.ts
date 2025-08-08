import {
	validateNodeParameters,
	assertParamIsString,
	assertParamIsNumber,
	assertParamIsBoolean,
	assertParamIsArray,
} from '../../src/node-parameters/parameter-type-validation';

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

			expect(() => validateNodeParameters(value, parameters)).not.toThrow();
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

			expect(() => validateNodeParameters(value, parameters)).not.toThrow();
		});

		it('should pass for valid object with optional parameters missing', () => {
			const value = {
				name: 'test',
			};

			const parameters = {
				name: { type: 'string' as const },
				description: { type: 'string' as const, optional: true },
			};

			expect(() => validateNodeParameters(value, parameters)).not.toThrow();
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

			expect(() => validateNodeParameters(value, parameters)).not.toThrow();
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

			expect(() => validateNodeParameters(value, parameters)).not.toThrow();
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

			expect(() => validateNodeParameters(value, parameters)).not.toThrow();
		});

		it('should pass for parameter with multiple allowed types', () => {
			const value = {
				multiType: 'string value',
			};

			const parameters = {
				multiType: { type: ['string', 'number'] as Array<'string' | 'number'> },
			};

			expect(() => validateNodeParameters(value, parameters)).not.toThrow();

			// Test with number value
			const value2 = {
				multiType: 42,
			};

			expect(() => validateNodeParameters(value2, parameters)).not.toThrow();
		});

		it('should throw for null value', () => {
			const parameters = {
				name: { type: 'string' as const },
			};

			expect(() => validateNodeParameters(null, parameters)).toThrow('Value is not a valid object');
		});

		it('should throw for non-object value', () => {
			const parameters = {
				name: { type: 'string' as const },
			};

			expect(() => validateNodeParameters('not an object', parameters)).toThrow(
				'Value is not a valid object',
			);
			expect(() => validateNodeParameters(123, parameters)).toThrow('Value is not a valid object');
			expect(() => validateNodeParameters(true, parameters)).toThrow('Value is not a valid object');
		});

		it('should throw for missing required parameter', () => {
			const value = {
				// name is missing
			};

			const parameters = {
				name: { type: 'string' as const },
			};

			expect(() => validateNodeParameters(value, parameters)).toThrow(
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

			expect(() => validateNodeParameters(value, parameters)).toThrow(
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

			expect(() => validateNodeParameters(value, parameters)).toThrow(
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

			expect(() => validateNodeParameters(value, parameters)).toThrow(
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

			expect(() => validateNodeParameters(value, parameters)).toThrow(
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

			expect(() => validateNodeParameters(value, parameters)).toThrow(
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

			expect(() => validateNodeParameters(value, parameters)).toThrow(
				'Parameter "multiType" does not match any of the expected types: string or number',
			);
		});

		it('should handle empty parameter definition', () => {
			const value = {
				extra: 'should be ignored',
			};

			const parameters = {};

			expect(() => validateNodeParameters(value, parameters)).not.toThrow();
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

			expect(() => validateNodeParameters(value, parameters)).not.toThrow();
		});

		it('should handle empty arrays', () => {
			const value = {
				emptyTags: [],
			};

			const parameters = {
				emptyTags: { type: 'string[]' as const },
			};

			expect(() => validateNodeParameters(value, parameters)).not.toThrow();
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

			expect(() => validateNodeParameters(value, parameters)).toThrow(
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

			expect(() => validateNodeParameters(value, parameters)).not.toThrow();
		});
	});

	describe('assertParamIsBoolean', () => {
		it('should pass for valid boolean values', () => {
			expect(() => assertParamIsBoolean('testParam', true)).not.toThrow();
			expect(() => assertParamIsBoolean('testParam', false)).not.toThrow();
		});

		it('should throw for non-boolean values', () => {
			expect(() => assertParamIsBoolean('testParam', 'true')).toThrow(
				'Parameter "testParam" is not boolean',
			);
			expect(() => assertParamIsBoolean('testParam', 1)).toThrow(
				'Parameter "testParam" is not boolean',
			);
			expect(() => assertParamIsBoolean('testParam', 0)).toThrow(
				'Parameter "testParam" is not boolean',
			);
			expect(() => assertParamIsBoolean('testParam', null)).toThrow(
				'Parameter "testParam" is not boolean',
			);
			expect(() => assertParamIsBoolean('testParam', undefined)).toThrow(
				'Parameter "testParam" is not boolean',
			);
		});
	});

	describe('assertIsString', () => {
		it('should pass for valid string', () => {
			expect(() => assertParamIsString('testParam', 'hello')).not.toThrow();
		});

		it('should throw for non-string values', () => {
			expect(() => assertParamIsString('testParam', 123)).toThrow(
				'Parameter "testParam" is not string',
			);
			expect(() => assertParamIsString('testParam', true)).toThrow(
				'Parameter "testParam" is not string',
			);
			expect(() => assertParamIsString('testParam', null)).toThrow(
				'Parameter "testParam" is not string',
			);
			expect(() => assertParamIsString('testParam', undefined)).toThrow(
				'Parameter "testParam" is not string',
			);
		});
	});

	describe('assertIsNumber', () => {
		it('should pass for valid number', () => {
			expect(() => assertParamIsNumber('testParam', 123)).not.toThrow();
			expect(() => assertParamIsNumber('testParam', 0)).not.toThrow();
			expect(() => assertParamIsNumber('testParam', -5.5)).not.toThrow();
		});

		it('should throw for non-number values', () => {
			expect(() => assertParamIsNumber('testParam', '123')).toThrow(
				'Parameter "testParam" is not number',
			);
			expect(() => assertParamIsNumber('testParam', true)).toThrow(
				'Parameter "testParam" is not number',
			);
			expect(() => assertParamIsNumber('testParam', null)).toThrow(
				'Parameter "testParam" is not number',
			);
			expect(() => assertParamIsNumber('testParam', undefined)).toThrow(
				'Parameter "testParam" is not number',
			);
		});
	});

	describe('assertIsArray', () => {
		const isString = (val: unknown): val is string => typeof val === 'string';
		const isNumber = (val: unknown): val is number => typeof val === 'number';

		it('should pass for valid array with correct element types', () => {
			expect(() => assertParamIsArray('testParam', ['a', 'b', 'c'], isString)).not.toThrow();
			expect(() => assertParamIsArray('testParam', [1, 2, 3], isNumber)).not.toThrow();
			expect(() => assertParamIsArray('testParam', [], isString)).not.toThrow(); // empty array
		});

		it('should throw for non-array values', () => {
			expect(() => assertParamIsArray('testParam', 'not array', isString)).toThrow(
				'Parameter "testParam" is not an array',
			);
			expect(() => assertParamIsArray('testParam', { length: 3 }, isString)).toThrow(
				'Parameter "testParam" is not an array',
			);
		});

		it('should throw for array with incorrect element types', () => {
			expect(() => assertParamIsArray('testParam', ['a', 1, 'c'], isString)).toThrow(
				'Parameter "testParam" has elements that don\'t match expected types',
			);
			expect(() => assertParamIsArray('testParam', [1, 'b', 3], isNumber)).toThrow(
				'Parameter "testParam" has elements that don\'t match expected types',
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
					number: { type: 'number' as const },
				};

				// NaN is of type 'number' in JavaScript
				expect(() => validateNodeParameters(value, parameters)).not.toThrow();
			});

			it('should handle Infinity values correctly', () => {
				const value = {
					number: Infinity,
				};

				const parameters = {
					number: { type: 'number' as const },
				};

				expect(() => validateNodeParameters(value, parameters)).not.toThrow();
			});

			it('should handle mixed array types correctly', () => {
				const value = {
					mixed: [1, '2', 3], // Invalid: mixed types in array
				};

				const parameters = {
					mixed: { type: 'number[]' as const },
				};

				expect(() => validateNodeParameters(value, parameters)).toThrow(
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
					nested: { type: 'object' as const },
				};

				expect(() => validateNodeParameters(value, parameters)).not.toThrow();
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
					resource: { type: 'resource-locator' as const },
				};

				expect(() => validateNodeParameters(value, parameters)).not.toThrow();
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
					resource: { type: 'resource-locator' as const },
				};

				expect(() => validateNodeParameters(value, parameters)).toThrow(
					'Parameter "resource" does not match any of the expected types: resource-locator',
				);
			});

			it('should handle empty string as valid string parameter', () => {
				const value = {
					name: '',
				};

				const parameters = {
					name: { type: 'string' as const },
				};

				expect(() => validateNodeParameters(value, parameters)).not.toThrow();
			});

			it('should handle zero as valid number parameter', () => {
				const value = {
					count: 0,
				};

				const parameters = {
					count: { type: 'number' as const },
				};

				expect(() => validateNodeParameters(value, parameters)).not.toThrow();
			});

			it('should handle arrays with only false values', () => {
				const value = {
					flags: [false, false, false],
				};

				const parameters = {
					flags: { type: 'boolean[]' as const },
				};

				expect(() => validateNodeParameters(value, parameters)).not.toThrow();
			});

			it('should handle three or more type unions', () => {
				const value = {
					multiType: 'string value',
				};

				const parameters = {
					multiType: {
						type: ['string', 'number', 'boolean'] as Array<'string' | 'number' | 'boolean'>,
					},
				};

				expect(() => validateNodeParameters(value, parameters)).not.toThrow();

				// Test with boolean value
				const value2 = {
					multiType: true,
				};

				expect(() => validateNodeParameters(value2, parameters)).not.toThrow();
			});

			it('should handle array types in multi-type parameters', () => {
				const value = {
					flexParam: ['a', 'b', 'c'],
				};

				const parameters = {
					flexParam: { type: ['string', 'string[]'] as Array<'string' | 'string[]'> },
				};

				expect(() => validateNodeParameters(value, parameters)).not.toThrow();

				// Test with single string
				const value2 = {
					flexParam: 'single string',
				};

				expect(() => validateNodeParameters(value2, parameters)).not.toThrow();
			});

			it('should handle object with null prototype', () => {
				const value = Object.create(null);
				value.name = 'test';

				const parameters = {
					name: { type: 'string' as const },
				};

				expect(() => validateNodeParameters(value, parameters)).not.toThrow();
			});
		});

		describe('assertParamIsArray edge cases', () => {
			const isString = (val: unknown): val is string => typeof val === 'string';

			it('should handle array-like objects', () => {
				const arrayLike = { 0: 'a', 1: 'b', length: 2 };

				expect(() => assertParamIsArray('testParam', arrayLike, isString)).toThrow(
					'Parameter "testParam" is not an array',
				);
			});

			it('should handle sparse arrays', () => {
				const sparse = new Array(3);
				sparse[0] = 'a';
				sparse[2] = 'c';
				// sparse[1] is undefined

				// Note: Array.every() skips sparse/empty indices, so this passes validation
				// This may be unintended behavior but matches current implementation
				expect(() => assertParamIsArray('testParam', sparse, isString)).not.toThrow();
			});

			it('should handle arrays with explicit undefined values', () => {
				const arrayWithUndefined = ['a', undefined, 'c'];

				expect(() => assertParamIsArray('testParam', arrayWithUndefined, isString)).toThrow(
					'Parameter "testParam" has elements that don\'t match expected types',
				);
			});

			it('should handle very large arrays efficiently', () => {
				const largeArray = new Array(1000).fill('test');

				expect(() => assertParamIsArray('testParam', largeArray, isString)).not.toThrow();
			});
		});
	});
});
