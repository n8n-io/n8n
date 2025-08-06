import get from 'lodash/get';
import { constructExecutionMetaData } from 'n8n-core';
import type { IDataObject, IExecuteFunctions, IGetNodeParameterOptions, INode } from 'n8n-workflow';

import type { SetNodeOptions } from '../../v2/helpers/interfaces';
import { composeReturnItem, parseJsonParameter, validateEntry } from '../../v2/helpers/utils';

export const node: INode = {
	id: '11',
	name: 'Edit Fields',
	type: 'n8n-nodes-base.set',
	typeVersion: 3,
	position: [42, 42],
	parameters: {
		mode: 'manual',
		fields: {
			values: [],
		},
		include: 'none',
		options: {},
	},
};

export const createMockExecuteFunction = (nodeParameters: IDataObject) => {
	const fakeExecuteFunction = {
		getNodeParameter(
			parameterName: string,
			_itemIndex: number,
			fallbackValue?: IDataObject,
			options?: IGetNodeParameterOptions,
		) {
			const parameter = options?.extractValue ? `${parameterName}.value` : parameterName;
			return get(nodeParameters, parameter, fallbackValue);
		},
		getNode() {
			return node;
		},
		helpers: { constructExecutionMetaData },
		continueOnFail: () => false,
	} as unknown as IExecuteFunctions;
	return fakeExecuteFunction;
};

describe('test Set2, composeReturnItem', () => {
	it('should compose return item including no other fields', () => {
		const fakeExecuteFunction = createMockExecuteFunction({});

		const inputItem = {
			json: {
				input1: 'value1',
				input2: 2,
				input3: [1, 2, 3],
			},
			pairedItem: {
				item: 0,
				input: undefined,
			},
		};

		const newData = {
			num1: 55,
			str1: '42',
			arr1: ['foo', 'bar'],
			obj: {
				key: 'value',
			},
		};

		const options: SetNodeOptions = {
			include: 'none',
		};

		const result = composeReturnItem.call(fakeExecuteFunction, 0, inputItem, newData, options, 3.4);

		expect(result).toEqual({
			json: {
				num1: 55,
				str1: '42',
				arr1: ['foo', 'bar'],
				obj: {
					key: 'value',
				},
			},
			pairedItem: {
				item: 0,
			},
		});
	});

	it('should compose return item including selected fields', () => {
		const fakeExecuteFunction = createMockExecuteFunction({ includeFields: 'input1, input2' });

		const inputItem = {
			json: {
				input1: 'value1',
				input2: 2,
				input3: [1, 2, 3],
			},
			pairedItem: {
				item: 0,
				input: undefined,
			},
		};

		const newData = {
			num1: 55,
			str1: '42',
			arr1: ['foo', 'bar'],
			obj: {
				key: 'value',
			},
		};

		const options: SetNodeOptions = {
			include: 'selected',
		};

		const result = composeReturnItem.call(fakeExecuteFunction, 0, inputItem, newData, options, 3.4);

		expect(result).toEqual({
			json: {
				num1: 55,
				str1: '42',
				arr1: ['foo', 'bar'],
				input1: 'value1',
				input2: 2,
				obj: {
					key: 'value',
				},
			},
			pairedItem: {
				item: 0,
			},
		});
	});

	it('should include binary when expected in version <3.4', () => {
		const fakeExecuteFunction = createMockExecuteFunction({});

		const inputItem = {
			json: {
				input1: 'value1',
				input2: 2,
				input3: [1, 2, 3],
			},
			pairedItem: {
				item: 0,
				input: undefined,
			},
			binary: {
				data: {
					data: 'content',
					mimeType: 'image/jpg',
				},
			},
		};

		const newData = {
			num1: 55,
			str1: '42',
			arr1: ['foo', 'bar'],
			obj: {
				key: 'value',
			},
		};

		const resultWithIncludeBinary = composeReturnItem.call(
			fakeExecuteFunction,
			0,
			inputItem,
			newData,
			{
				include: 'all',
				includeBinary: true,
			},
			3.3,
		);

		expect(resultWithIncludeBinary.binary).toEqual(inputItem.binary);

		const resultWithoutIncludeBinary = composeReturnItem.call(
			fakeExecuteFunction,
			0,
			inputItem,
			newData,
			{
				include: 'all',
			},
			3.3,
		);

		expect(resultWithoutIncludeBinary.binary).toBeUndefined();
	});

	it('should include binary when expected in version >=3.4', () => {
		const fakeExecuteFunction = createMockExecuteFunction({});

		const inputItem = {
			json: {
				input1: 'value1',
				input2: 2,
				input3: [1, 2, 3],
			},
			pairedItem: {
				item: 0,
				input: undefined,
			},
			binary: {
				data: {
					data: 'content',
					mimeType: 'image/jpg',
				},
			},
		};

		const newData = {
			num1: 55,
			str1: '42',
			arr1: ['foo', 'bar'],
			obj: {
				key: 'value',
			},
		};

		const resultWithStripBinary = composeReturnItem.call(
			fakeExecuteFunction,
			0,
			inputItem,
			newData,
			{
				include: 'all',
				stripBinary: true,
			},
			3.4,
		);

		expect(resultWithStripBinary.binary).toBeUndefined();

		const resultWithoutStripBinary = composeReturnItem.call(
			fakeExecuteFunction,
			0,
			inputItem,
			newData,
			{
				include: 'all',
			},
			3.4,
		);

		expect(resultWithoutStripBinary.binary).toEqual(inputItem.binary);
	});
});

describe('test Set2, parseJsonParameter', () => {
	it('should parse valid JSON string', () => {
		const result = parseJsonParameter('{"foo": "bar"}', node, 0, 'test');

		expect(result).toEqual({
			foo: 'bar',
		});
	});

	it('should tolerate single quotes in string', () => {
		const result = parseJsonParameter("{'foo': 'bar'}", node, 0, 'test');

		expect(result).toEqual({
			foo: 'bar',
		});
	});

	it('should tolerate unquoted keys', () => {
		const result = parseJsonParameter("{foo: 'bar'}", node, 0, 'test');

		expect(result).toEqual({
			foo: 'bar',
		});
	});

	it('should tolerate trailing comma', () => {
		const result = parseJsonParameter('{"foo": "bar"},', node, 0, 'test');

		expect(result).toEqual({
			foo: 'bar',
		});
	});

	it('should tolerate trailing commas in objects', () => {
		const result = parseJsonParameter("{foo: 'bar', baz: {'foo': 'bar',}, }", node, 0, 'test');

		expect(result).toEqual({
			foo: 'bar',
			baz: {
				foo: 'bar',
			},
		});
	});
});

describe('test Set2, validateEntry', () => {
	it('should convert number to string', () => {
		const result = validateEntry('foo', 'string', 42 as unknown as string, node, 0);

		expect(result).toEqual({
			name: 'foo',
			value: '42',
		});
	});

	it('should convert array to string', () => {
		const result = validateEntry('foo', 'string', [1, 2, 3] as unknown as string, node, 0);

		expect(result).toEqual({
			name: 'foo',
			value: '[1,2,3]',
		});
	});

	it('should convert object to string', () => {
		const result = validateEntry('foo', 'string', { foo: 'bar' } as unknown as string, node, 0);

		expect(result).toEqual({
			name: 'foo',
			value: '{"foo":"bar"}',
		});
	});

	it('should convert boolean to string', () => {
		const result = validateEntry('foo', 'string', true as unknown as string, node, 0);

		expect(result).toEqual({
			name: 'foo',
			value: 'true',
		});
	});

	it('should convert undefined to string', () => {
		const result = validateEntry('foo', 'string', undefined as unknown as string, node, 0);

		expect(result).toEqual({
			name: 'foo',
			value: 'undefined',
		});
	});
});
