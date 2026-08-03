import {
	isNodeParameterValue,
	isNodeParameters,
	isValidNodeParameterValueType,
	assertIsValidNodeParameterValueType,
	isAssignmentCollectionValue,
} from '../../src/node-parameters/node-parameter-value-type-guard';

describe('node-parameter-value-type-guard', () => {
	describe('isNodeParameterValue', () => {
		it('should return true for primitives', () => {
			expect(isNodeParameterValue('string')).toBe(true);
			expect(isNodeParameterValue(42)).toBe(true);
			expect(isNodeParameterValue(true)).toBe(true);
			expect(isNodeParameterValue(false)).toBe(true);
			expect(isNodeParameterValue(null)).toBe(true);
			expect(isNodeParameterValue(undefined)).toBe(true);
		});

		it('should return false for non-primitives', () => {
			expect(isNodeParameterValue({})).toBe(false);
			expect(isNodeParameterValue([])).toBe(false);
			expect(isNodeParameterValue(() => {})).toBe(false);
			expect(isNodeParameterValue(Symbol('test'))).toBe(false);
		});
	});

	describe('isNodeParameters', () => {
		it('should return true for valid INodeParameters objects', () => {
			expect(isNodeParameters({})).toBe(true);
			expect(isNodeParameters({ key: 'value' })).toBe(true);
			expect(isNodeParameters({ key: 123 })).toBe(true);
			expect(isNodeParameters({ key: true })).toBe(true);
			expect(isNodeParameters({ nested: { key: 'value' } })).toBe(true);
		});

		it('should return false for non-objects', () => {
			expect(isNodeParameters('string')).toBe(false);
			expect(isNodeParameters(123)).toBe(false);
			expect(isNodeParameters(null)).toBe(false);
			expect(isNodeParameters(undefined)).toBe(false);
			expect(isNodeParameters([])).toBe(false);
		});

		it('should return false for objects with invalid values', () => {
			expect(isNodeParameters({ key: () => {} })).toBe(false);
			expect(isNodeParameters({ key: Symbol('test') })).toBe(false);
			expect(isNodeParameters({ key: new Date() })).toBe(false);
		});

		it('should handle nested objects', () => {
			expect(
				isNodeParameters({
					level1: {
						level2: {
							level3: 'value',
						},
					},
				}),
			).toBe(true);

			expect(
				isNodeParameters({
					level1: {
						level2: {
							level3: () => {},
						},
					},
				}),
			).toBe(false);
		});
	});

	describe('isAssignmentCollectionValue', () => {
		it('should return true for valid assignment collections', () => {
			expect(
				isAssignmentCollectionValue({
					assignments: [
						{
							id: '1',
							name: 'test',
							value: 'value',
						},
					],
				}),
			).toBe(true);

			expect(isAssignmentCollectionValue({ assignments: [] })).toBe(true);
		});

		it('should return false for invalid assignment collections', () => {
			expect(isAssignmentCollectionValue({})).toBe(false);
			expect(isAssignmentCollectionValue({ assignments: 'not-array' })).toBe(false);
			expect(
				isAssignmentCollectionValue({
					assignments: [
						{
							id: '1',
							// missing name and value
						},
					],
				}),
			).toBe(false);
		});
	});

	describe('isValidNodeParameterValueType', () => {
		it('should return true for all valid types', () => {
			// Primitives
			expect(isValidNodeParameterValueType('string')).toBe(true);
			expect(isValidNodeParameterValueType(123)).toBe(true);
			expect(isValidNodeParameterValueType(true)).toBe(true);
			expect(isValidNodeParameterValueType(null)).toBe(true);
			expect(isValidNodeParameterValueType(undefined)).toBe(true);

			// Objects
			expect(isValidNodeParameterValueType({})).toBe(true);
			expect(isValidNodeParameterValueType({ key: 'value' })).toBe(true);

			// Arrays
			expect(isValidNodeParameterValueType([])).toBe(true);
			expect(isValidNodeParameterValueType(['string'])).toBe(true);
			expect(isValidNodeParameterValueType([1, 2, 3])).toBe(true);
			expect(isValidNodeParameterValueType([{ key: 'value' }])).toBe(true);

			// Resource locator
			expect(
				isValidNodeParameterValueType({
					__rl: true,
					mode: 'id',
					value: '123',
				}),
			).toBe(true);

			// Resource mapper
			expect(
				isValidNodeParameterValueType({
					mappingMode: 'defineBelow',
					schema: [],
					value: {},
				}),
			).toBe(true);

			// Filter value
			expect(
				isValidNodeParameterValueType({
					conditions: [],
					combinator: 'and',
				}),
			).toBe(true);

			// Assignment collection
			expect(
				isValidNodeParameterValueType({
					assignments: [{ id: '1', name: 'test', value: 'value' }],
				}),
			).toBe(true);
		});

		it('should return false for invalid types', () => {
			expect(isValidNodeParameterValueType(() => {})).toBe(false);
			expect(isValidNodeParameterValueType(Symbol('test'))).toBe(false);
			expect(isValidNodeParameterValueType(new Date())).toBe(false);
			expect(isValidNodeParameterValueType({ key: () => {} })).toBe(false);
			expect(isValidNodeParameterValueType([() => {}])).toBe(false);
		});
	});

	describe('assertIsValidNodeParameterValueType', () => {
		it('should not throw for valid values', () => {
			expect(() => assertIsValidNodeParameterValueType('string')).not.toThrow();
			expect(() => assertIsValidNodeParameterValueType(123)).not.toThrow();
			expect(() => assertIsValidNodeParameterValueType({})).not.toThrow();
		});

		it('should throw for invalid values', () => {
			expect(() => assertIsValidNodeParameterValueType(() => {})).toThrow(
				'Value is not a valid NodeParameterValueType',
			);
			expect(() => assertIsValidNodeParameterValueType(Symbol('test'))).toThrow();
			expect(() => assertIsValidNodeParameterValueType(new Date())).toThrow();
		});

		it('should support custom error messages', () => {
			expect(() => assertIsValidNodeParameterValueType(() => {}, 'Custom error')).toThrow(
				'Custom error',
			);
		});
	});
});
