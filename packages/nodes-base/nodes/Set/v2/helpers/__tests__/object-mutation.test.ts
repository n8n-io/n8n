/**
 * Regression test for CAT-2965
 * Issue: Nested object is unexpectedly mutated across sibling branches during execution
 * https://github.com/n8n-io/n8n/issues/29127
 *
 * When the same nested object is passed into two sibling branches, changing a nested
 * property in one branch should not affect the object seen by the other branch.
 * Each branch should work with an independent copy of the nested object.
 */

import { mock } from 'jest-mock-extended';
import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import type { SetNodeOptions } from '../interfaces';
import { INCLUDE } from '../interfaces';
import { composeReturnItem } from '../utils';

describe('CAT-2965: Object mutation across branches', () => {
	const mockContext = mock<IExecuteFunctions>({
		getNodeParameter: jest.fn().mockReturnValue(''),
	});

	describe('composeReturnItem should deep copy object values', () => {
		it('should not mutate the original object when modifying the output (INCLUDE.NONE)', () => {
			// Simulate an input item from a previous node
			const inputItem: INodeExecutionData = {
				json: { existingField: 'value' },
			};

			// Simulate a nested object that would come from an expression evaluation
			// like {{$json.object}} - this is a reference to an object
			const nestedObject: IDataObject = {
				string_one: 'value_1',
				string_two: 'value_2',
			};

			// newFields contains the object reference (not a copy)
			// This simulates what happens when the Set node evaluates an expression
			const newFields: IDataObject = {
				object: nestedObject,
			};

			const options: SetNodeOptions = {
				include: INCLUDE.NONE,
				dotNotation: true,
				ignoreConversionErrors: false,
				stripBinary: false,
			};

			// Call composeReturnItem to create the new item
			const result = composeReturnItem.call(mockContext, 0, inputItem, newFields, options, 3.4);

			// Modify the nested object in the result
			(result.json.object as IDataObject).string_one = 'new_value';

			// BUG: The original nestedObject should NOT be mutated
			// But currently it is, because composeReturnItem sets the reference directly
			// without deep copying
			expect(nestedObject.string_one).toBe('value_1');
			expect(nestedObject.string_two).toBe('value_2');
		});

		it('should not mutate the original object when modifying the output (INCLUDE.ALL)', () => {
			const inputItem: INodeExecutionData = {
				json: {
					existingField: 'existing_value',
					existingNested: { prop: 'original' },
				},
			};

			const nestedObject: IDataObject = {
				key: 'value',
				nested: { deep: 'data' },
			};

			const newFields: IDataObject = {
				newObject: nestedObject,
			};

			const options: SetNodeOptions = {
				include: INCLUDE.ALL,
				dotNotation: true,
				ignoreConversionErrors: false,
				stripBinary: false,
			};

			const result = composeReturnItem.call(mockContext, 0, inputItem, newFields, options, 3.4);

			// Modify both the new field and existing field in the result
			(result.json.newObject as IDataObject).key = 'modified';
			(result.json.newObject as IDataObject).nested = { deep: 'modified_data' };
			(result.json.existingNested as IDataObject).prop = 'modified_existing';

			// Original objects should not be mutated
			expect(nestedObject.key).toBe('value');
			expect((nestedObject.nested as IDataObject).deep).toBe('data');
			expect((inputItem.json.existingNested as IDataObject).prop).toBe('original');
		});

		it('should handle deeply nested objects without mutation', () => {
			const inputItem: INodeExecutionData = {
				json: {},
			};

			const deeplyNested: IDataObject = {
				level1: {
					level2: {
						level3: {
							value: 'original',
						},
					},
				},
			};

			const newFields: IDataObject = {
				deepObject: deeplyNested,
			};

			const options: SetNodeOptions = {
				include: INCLUDE.NONE,
				dotNotation: true,
				ignoreConversionErrors: false,
				stripBinary: false,
			};

			const result = composeReturnItem.call(mockContext, 0, inputItem, newFields, options, 3.4);

			// Modify deep nested value in result
			const resultDeep = result.json.deepObject as IDataObject;
			const level1 = resultDeep.level1 as IDataObject;
			const level2 = level1.level2 as IDataObject;
			const level3 = level2.level3 as IDataObject;
			level3.value = 'modified';

			// Original should not be mutated
			const origLevel1 = deeplyNested.level1 as IDataObject;
			const origLevel2 = origLevel1.level2 as IDataObject;
			const origLevel3 = origLevel2.level3 as IDataObject;
			expect(origLevel3.value).toBe('original');
		});

		it('should handle arrays within objects without mutation', () => {
			const inputItem: INodeExecutionData = {
				json: {},
			};

			const objectWithArray: IDataObject = {
				items: ['item1', 'item2', 'item3'],
				nested: {
					values: [1, 2, 3],
				},
			};

			const newFields: IDataObject = {
				arrayObject: objectWithArray,
			};

			const options: SetNodeOptions = {
				include: INCLUDE.NONE,
				dotNotation: true,
				ignoreConversionErrors: false,
				stripBinary: false,
			};

			const result = composeReturnItem.call(mockContext, 0, inputItem, newFields, options, 3.4);

			// Modify arrays in result
			const resultObj = result.json.arrayObject as IDataObject;
			(resultObj.items as string[]).push('item4');
			((resultObj.nested as IDataObject).values as number[]).push(4);

			// Original should not be mutated
			expect((objectWithArray.items as string[]).length).toBe(3);
			expect((objectWithArray.items as string[])).toEqual(['item1', 'item2', 'item3']);
			expect(((objectWithArray.nested as IDataObject).values as number[]).length).toBe(3);
		});

		it('should not mutate when multiple object fields are set', () => {
			const inputItem: INodeExecutionData = {
				json: {},
			};

			const obj1: IDataObject = { prop1: 'value1' };
			const obj2: IDataObject = { prop2: 'value2' };
			const obj3: IDataObject = { prop3: 'value3' };

			const newFields: IDataObject = {
				field1: obj1,
				field2: obj2,
				field3: obj3,
			};

			const options: SetNodeOptions = {
				include: INCLUDE.NONE,
				dotNotation: true,
				ignoreConversionErrors: false,
				stripBinary: false,
			};

			const result = composeReturnItem.call(mockContext, 0, inputItem, newFields, options, 3.4);

			// Modify all objects in result
			(result.json.field1 as IDataObject).prop1 = 'modified1';
			(result.json.field2 as IDataObject).prop2 = 'modified2';
			(result.json.field3 as IDataObject).prop3 = 'modified3';

			// None of the originals should be mutated
			expect(obj1.prop1).toBe('value1');
			expect(obj2.prop2).toBe('value2');
			expect(obj3.prop3).toBe('value3');
		});
	});

	describe('Happy path - primitives should work correctly', () => {
		it('should handle primitive values correctly (strings, numbers, booleans)', () => {
			const inputItem: INodeExecutionData = {
				json: {},
			};

			const newFields: IDataObject = {
				stringField: 'test',
				numberField: 42,
				booleanField: true,
				nullField: null,
			};

			const options: SetNodeOptions = {
				include: INCLUDE.NONE,
				dotNotation: true,
				ignoreConversionErrors: false,
				stripBinary: false,
			};

			const result = composeReturnItem.call(mockContext, 0, inputItem, newFields, options, 3.4);

			expect(result.json).toEqual({
				stringField: 'test',
				numberField: 42,
				booleanField: true,
				nullField: null,
			});
		});
	});
});
