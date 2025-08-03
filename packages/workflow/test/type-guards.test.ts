import {
	isResourceLocatorValue,
	isINodeProperties,
	isINodePropertyOptions,
	isINodePropertyCollection,
	isINodePropertiesList,
	isINodePropertyOptionsList,
	isINodePropertyCollectionList,
	isValidResourceLocatorParameterValue,
	isResourceMapperValue,
	isFilterValue,
} from '../src/type-guards';
import type {
	INodeProperties,
	INodePropertyOptions,
	INodePropertyCollection,
	INodeParameterResourceLocator,
	ResourceMapperValue,
	ResourceMapperField,
	FilterValue,
	FilterConditionValue,
} from '../src/interfaces';

describe('type-guards', () => {
	describe('isResourceLocatorValue', () => {
		it('should return true for valid resource locator', () => {
			const validLocator: INodeParameterResourceLocator = {
				mode: 'list',
				value: 'test-value',
				__rl: true,
			};

			expect(isResourceLocatorValue(validLocator)).toBe(true);
		});

		it('should return false for missing __rl property', () => {
			const invalidLocator = {
				mode: 'list',
				value: 'test-value',
			};

			expect(isResourceLocatorValue(invalidLocator)).toBe(false);
		});

		it('should return false for missing mode property', () => {
			const invalidLocator = {
				value: 'test-value',
				__rl: true,
			};

			expect(isResourceLocatorValue(invalidLocator)).toBe(false);
		});

		it('should return false for missing value property', () => {
			const invalidLocator = {
				mode: 'list',
				__rl: true,
			};

			expect(isResourceLocatorValue(invalidLocator)).toBe(false);
		});

		it('should return false for null', () => {
			expect(isResourceLocatorValue(null)).toBe(false);
		});

		it('should return false for undefined', () => {
			expect(isResourceLocatorValue(undefined)).toBe(false);
		});

		it('should return false for non-object types', () => {
			expect(isResourceLocatorValue('string')).toBe(false);
			expect(isResourceLocatorValue(123)).toBe(false);
			expect(isResourceLocatorValue(true)).toBe(false);
			expect(isResourceLocatorValue([])).toBe(false);
		});
	});

	describe('isINodeProperties', () => {
		it('should return true for valid INodeProperties', () => {
			const nodeProperty: INodeProperties = {
				name: 'testProp',
				type: 'string',
				displayName: 'Test Property',
				default: '',
			};

			expect(isINodeProperties(nodeProperty)).toBe(true);
		});

		it('should return false for INodePropertyOptions (has value)', () => {
			const propertyOption: INodePropertyOptions = {
				name: 'option1',
				value: 'value1',
			};

			expect(isINodeProperties(propertyOption)).toBe(false);
		});

		it('should return false for INodePropertyCollection (has values)', () => {
			const propertyCollection: INodePropertyCollection = {
				name: 'collection1',
				displayName: 'Collection 1',
				values: [],
			};

			expect(isINodeProperties(propertyCollection)).toBe(false);
		});

		it('should return false for objects without name', () => {
			const invalidProperty = {
				type: 'string',
				displayName: 'Test',
			};

			expect(isINodeProperties(invalidProperty as any)).toBe(false);
		});

		it('should return false for objects without type', () => {
			const invalidProperty = {
				name: 'test',
				displayName: 'Test',
			};

			expect(isINodeProperties(invalidProperty as any)).toBe(false);
		});
	});

	describe('isINodePropertyOptions', () => {
		it('should return true for valid INodePropertyOptions', () => {
			const propertyOption: INodePropertyOptions = {
				name: 'option1',
				value: 'value1',
			};

			expect(isINodePropertyOptions(propertyOption)).toBe(true);
		});

		it('should return false for INodeProperties (has displayName)', () => {
			const nodeProperty: INodeProperties = {
				name: 'testProp',
				type: 'string',
				displayName: 'Test Property',
				default: '',
			};

			expect(isINodePropertyOptions(nodeProperty)).toBe(false);
		});

		it('should return false for objects without value', () => {
			const invalidOption = {
				name: 'option1',
			};

			expect(isINodePropertyOptions(invalidOption as any)).toBe(false);
		});

		it('should return false for objects without name', () => {
			const invalidOption = {
				value: 'value1',
			};

			expect(isINodePropertyOptions(invalidOption as any)).toBe(false);
		});
	});

	describe('isINodePropertyCollection', () => {
		it('should return true for valid INodePropertyCollection', () => {
			const propertyCollection: INodePropertyCollection = {
				name: 'collection1',
				displayName: 'Collection 1',
				values: [],
			};

			expect(isINodePropertyCollection(propertyCollection)).toBe(true);
		});

		it('should return false for objects without values', () => {
			const invalidCollection = {
				name: 'collection1',
				displayName: 'Collection 1',
			};

			expect(isINodePropertyCollection(invalidCollection as any)).toBe(false);
		});

		it('should return false for objects without name', () => {
			const invalidCollection = {
				displayName: 'Collection 1',
				values: [],
			};

			expect(isINodePropertyCollection(invalidCollection as any)).toBe(false);
		});

		it('should return false for objects without displayName', () => {
			const invalidCollection = {
				name: 'collection1',
				values: [],
			};

			expect(isINodePropertyCollection(invalidCollection as any)).toBe(false);
		});
	});

	describe('isINodePropertiesList', () => {
		it('should return true for array of INodeProperties', () => {
			const propertiesList: INodeProperties[] = [
				{
					name: 'prop1',
					type: 'string',
					displayName: 'Property 1',
					default: '',
				},
				{
					name: 'prop2',
					type: 'number',
					displayName: 'Property 2',
					default: 0,
				},
			];

			expect(isINodePropertiesList(propertiesList)).toBe(true);
		});

		it('should return true for empty array', () => {
			expect(isINodePropertiesList([])).toBe(true);
		});

		it('should return false for non-array', () => {
			expect(isINodePropertiesList('not an array' as any)).toBe(false);
		});

		it('should return false for array with non-INodeProperties items', () => {
			const mixedArray = [
				{
					name: 'prop1',
					type: 'string',
					displayName: 'Property 1',
					default: '',
				},
				{
					name: 'option1',
					value: 'value1',
				},
			];

			expect(isINodePropertiesList(mixedArray as any)).toBe(false);
		});
	});

	describe('isINodePropertyOptionsList', () => {
		it('should return true for array of INodePropertyOptions', () => {
			const optionsList: INodePropertyOptions[] = [
				{ name: 'option1', value: 'value1' },
				{ name: 'option2', value: 'value2' },
			];

			expect(isINodePropertyOptionsList(optionsList)).toBe(true);
		});

		it('should return true for empty array', () => {
			expect(isINodePropertyOptionsList([])).toBe(true);
		});

		it('should return false for non-array', () => {
			expect(isINodePropertyOptionsList('not an array' as any)).toBe(false);
		});

		it('should return false for array with non-INodePropertyOptions items', () => {
			const mixedArray = [
				{ name: 'option1', value: 'value1' },
				{
					name: 'prop1',
					type: 'string',
					displayName: 'Property 1',
					default: '',
				},
			];

			expect(isINodePropertyOptionsList(mixedArray as any)).toBe(false);
		});
	});

	describe('isINodePropertyCollectionList', () => {
		it('should return true for array of INodePropertyCollection', () => {
			const collectionsList: INodePropertyCollection[] = [
				{
					name: 'collection1',
					displayName: 'Collection 1',
					values: [],
				},
				{
					name: 'collection2',
					displayName: 'Collection 2',
					values: [],
				},
			];

			expect(isINodePropertyCollectionList(collectionsList)).toBe(true);
		});

		it('should return true for empty array', () => {
			expect(isINodePropertyCollectionList([])).toBe(true);
		});

		it('should return false for non-array', () => {
			expect(isINodePropertyCollectionList('not an array' as any)).toBe(false);
		});

		it('should return false for array with non-INodePropertyCollection items', () => {
			const mixedArray = [
				{
					name: 'collection1',
					displayName: 'Collection 1',
					values: [],
				},
				{ name: 'option1', value: 'value1' },
			];

			expect(isINodePropertyCollectionList(mixedArray as any)).toBe(false);
		});
	});

	describe('isValidResourceLocatorParameterValue', () => {
		it('should return true for object with valid string value', () => {
			const locator: INodeParameterResourceLocator = {
				mode: 'list',
				value: 'test-value',
				__rl: true,
			};

			expect(isValidResourceLocatorParameterValue(locator)).toBe(true);
		});

		it('should return true for object with any number value', () => {
			const locatorWithZero: INodeParameterResourceLocator = {
				mode: 'list',
				value: 0,
				__rl: true,
			};

			const locatorWithPositive: INodeParameterResourceLocator = {
				mode: 'list',
				value: 42,
				__rl: true,
			};

			const locatorWithNegative: INodeParameterResourceLocator = {
				mode: 'list',
				value: -1,
				__rl: true,
			};

			expect(isValidResourceLocatorParameterValue(locatorWithZero)).toBe(true);
			expect(isValidResourceLocatorParameterValue(locatorWithPositive)).toBe(true);
			expect(isValidResourceLocatorParameterValue(locatorWithNegative)).toBe(true);
		});

		it('should return false for object with empty string value', () => {
			const locator: INodeParameterResourceLocator = {
				mode: 'list',
				value: '',
				__rl: true,
			};

			expect(isValidResourceLocatorParameterValue(locator)).toBe(false);
		});

		it('should return false for object with null value', () => {
			const locator: INodeParameterResourceLocator = {
				mode: 'list',
				value: null as any,
				__rl: true,
			};

			expect(isValidResourceLocatorParameterValue(locator)).toBe(false);
		});

		it('should return false for object with undefined value', () => {
			const locator: INodeParameterResourceLocator = {
				mode: 'list',
				value: undefined as any,
				__rl: true,
			};

			expect(isValidResourceLocatorParameterValue(locator)).toBe(false);
		});

		it('should return true for truthy non-object value', () => {
			expect(isValidResourceLocatorParameterValue('string-value' as any)).toBe(true);
			expect(isValidResourceLocatorParameterValue(42 as any)).toBe(true);
			expect(isValidResourceLocatorParameterValue(true as any)).toBe(true);
		});

		it('should return false for falsy non-object value', () => {
			expect(isValidResourceLocatorParameterValue('' as any)).toBe(false);
			expect(isValidResourceLocatorParameterValue(false as any)).toBe(false);
			expect(isValidResourceLocatorParameterValue(undefined as any)).toBe(false);
			// Note: 0 and null are handled in the object path since typeof null === 'object'
		});
	});

	describe('isResourceMapperValue', () => {
		it('should return true for valid ResourceMapperValue', () => {
			const mapperValue: ResourceMapperValue = {
				mappingMode: 'defineBelow',
				schema: [] as ResourceMapperField[],
				value: {},
				matchingColumns: [],
				attemptToConvertTypes: false,
				convertFieldsToString: false,
			};

			expect(isResourceMapperValue(mapperValue)).toBe(true);
		});

		it('should return false for object missing mappingMode', () => {
			const invalidValue = {
				schema: {},
				value: {},
			};

			expect(isResourceMapperValue(invalidValue)).toBe(false);
		});

		it('should return false for object missing schema', () => {
			const invalidValue = {
				mappingMode: 'defineBelow',
				value: {},
			};

			expect(isResourceMapperValue(invalidValue)).toBe(false);
		});

		it('should return false for object missing value', () => {
			const invalidValue = {
				mappingMode: 'defineBelow',
				schema: {},
			};

			expect(isResourceMapperValue(invalidValue)).toBe(false);
		});

		it('should return false for null', () => {
			expect(isResourceMapperValue(null)).toBe(false);
		});

		it('should return false for non-object types', () => {
			expect(isResourceMapperValue('string')).toBe(false);
			expect(isResourceMapperValue(123)).toBe(false);
			expect(isResourceMapperValue(true)).toBe(false);
			expect(isResourceMapperValue([])).toBe(false);
		});
	});

	describe('isFilterValue', () => {
		it('should return true for valid FilterValue', () => {
			const filterValue: FilterValue = {
				conditions: [] as FilterConditionValue[],
				combinator: 'and',
				options: {
					caseSensitive: false,
					leftValue: '',
					typeValidation: 'strict',
					version: 2,
				},
			};

			expect(isFilterValue(filterValue)).toBe(true);
		});

		it('should return false for object missing conditions', () => {
			const invalidValue = {
				combinator: 'and',
			};

			expect(isFilterValue(invalidValue)).toBe(false);
		});

		it('should return false for object missing combinator', () => {
			const invalidValue = {
				conditions: {},
			};

			expect(isFilterValue(invalidValue)).toBe(false);
		});

		it('should return false for null', () => {
			expect(isFilterValue(null)).toBe(false);
		});

		it('should return false for non-object types', () => {
			expect(isFilterValue('string')).toBe(false);
			expect(isFilterValue(123)).toBe(false);
			expect(isFilterValue(true)).toBe(false);
			expect(isFilterValue([])).toBe(false);
		});
	});
});
