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
import { execute } from '../../v2/manual.mode';

const node: INode = {
	id: '11',
	name: 'Set Node',
	type: 'n8n-nodes-base.set',
	typeVersion: 3.4,
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
		getWorkflowSettings() {
			return {};
		},
		helpers: { constructExecutionMetaData },
		continueOnFail: () => continueOnFail,
	} as unknown as IExecuteFunctions;
	return fakeExecuteFunction;
};

describe('test Set2, manual Mode', () => {
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
	const rawData = {
		num1: 55,
		str1: '42',
		arr1: ['foo', 'bar'],
		obj: {
			key: 'value',
		},
	};

	afterEach(() => jest.resetAllMocks());

	describe('fixed mode', () => {
		const assignments = {
			assignments: [
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					name: 'test',
					value: '{ ok: 1 }',
					type: 'object',
				},
			],
		};
		const fakeExecuteFunction = createMockExecuteFunction({ assignments });

		it('should parse json with the jsonOutput in node parameter and compose a return item', async () => {
			const result = await execute.call(fakeExecuteFunction, item, 0, options, rawData, node);

			expect(result).toEqual({ json: { test: { ok: 1 } }, pairedItem: { item: 0 } });
		});
	});

	describe('error handling', () => {
		const assignments = {
			assignments: [
				{
					// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
					name: 'test',
					value: '{ ok: 1',
					type: 'object',
				},
			],
		};

		it('should return an error object with pairedItem when continueOnFail is true', async () => {
			const fakeExecuteFunction = createMockExecuteFunction({ assignments }, true);

			const output = await execute.call(fakeExecuteFunction, item, 0, options, {}, node);

			expect(output).toEqual({
				json: { error: "'test' expects a object but we got '{ ok: 1' [item 0]" },
				pairedItem: { item: 0 },
			});
		});

		it('should throw an error when continueOnFail is false', async () => {
			const fakeExecuteFunction = createMockExecuteFunction({ assignments }, false);

			await expect(execute.call(fakeExecuteFunction, item, 0, options, {}, node)).rejects.toThrow(
				NodeOperationError,
			);
		});
	});
});
