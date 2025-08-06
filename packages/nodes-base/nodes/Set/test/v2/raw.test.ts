import get from 'lodash/get';
import { constructExecutionMetaData } from 'n8n-core';
import {
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type IGetNodeParameterOptions,
	type INode,
} from 'n8n-workflow';

import { type SetNodeOptions } from '../../v2/helpers/interfaces';
import * as utils from '../../v2/helpers/utils';
import { execute } from '../../v2/raw.mode';

const node: INode = {
	id: '11',
	name: 'Set Node',
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

const createMockExecuteFunction = (
	nodeParameters: IDataObject,
	continueOnFail: boolean = false,
) => {
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
		continueOnFail: () => continueOnFail,
	} as unknown as IExecuteFunctions;
	return fakeExecuteFunction;
};

describe('test Set2, rawMode/json Mode', () => {
	const item = {
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

	const options: SetNodeOptions = {
		include: 'none',
	};

	afterEach(() => jest.resetAllMocks());

	describe('fixed mode', () => {
		const jsonData = { jsonData: 1 };
		const fakeExecuteFunction = createMockExecuteFunction({ jsonOutput: jsonData });
		const rawData = {
			num1: 55,
			str1: '42',
			arr1: ['foo', 'bar'],
			obj: {
				key: 'value',
			},
		};

		it('should parse json with the jsonOutput in node parameter and compose a return item', async () => {
			jest.spyOn(utils, 'parseJsonParameter');
			jest.spyOn(utils, 'composeReturnItem');

			const result = await execute.call(fakeExecuteFunction, item, 0, options, rawData, node);

			expect(result).toEqual({ json: jsonData, pairedItem: { item: 0 } });
			expect(utils.parseJsonParameter).toHaveBeenCalledWith(jsonData, node, 0);
			expect(utils.composeReturnItem).toHaveBeenCalledWith(0, item, jsonData, options, 3);
		});
	});

	describe('expression mode', () => {
		const jsonData = { my_field_1: 'value' };
		const jsonDataString = '{"my_field_1": "value"}';
		const fakeExecuteFunction = createMockExecuteFunction({ jsonOutput: jsonDataString });
		const rawData = {
			num1: 55,
			str1: '42',
			arr1: ['foo', 'bar'],
			obj: {
				key: 'value',
			},
			jsonOutput: jsonDataString,
		};

		it('should parse json with resolved expression data and compose a return item', async () => {
			jest.spyOn(utils, 'parseJsonParameter');
			jest.spyOn(utils, 'composeReturnItem');
			jest.spyOn(utils, 'resolveRawData');

			const result = await execute.call(fakeExecuteFunction, item, 0, options, rawData, node);

			expect(utils.parseJsonParameter).toHaveBeenCalledWith(jsonDataString, node, 0);
			expect(utils.composeReturnItem).toHaveBeenCalledWith(0, item, jsonData, options, 3);
			expect(utils.resolveRawData).toHaveBeenCalledWith(jsonDataString, 0);
			expect(result).toEqual({ json: jsonData, pairedItem: { item: 0 } });
		});
	});

	describe('error handling', () => {
		it('should return an error object with pairedItem when continueOnFail is true', async () => {
			const fakeExecuteFunction = createMockExecuteFunction({ jsonOutput: 'jsonData' }, true);

			const output = await execute.call(fakeExecuteFunction, item, 0, options, {}, node);

			expect(output).toEqual({
				json: { error: "The 'JSON Output' in item 0 contains invalid JSON" },
				pairedItem: { item: 0 },
			});
		});

		it('should throw an error when continueOnFail is false', async () => {
			const fakeExecuteFunction = createMockExecuteFunction({ jsonOutput: 'jsonData' }, false);

			await expect(execute.call(fakeExecuteFunction, item, 0, options, {}, node)).rejects.toThrow(
				NodeOperationError,
			);
		});
	});
});
