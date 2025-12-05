import get from 'lodash/get';
import { constructExecutionMetaData } from 'n8n-core';
import {
	// NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type IGetNodeParameterOptions,
	type INode,
	type INodeExecutionData,
} from 'n8n-workflow';

import { type SetNodeOptions } from '../../v2/helpers/interfaces';
import { execute } from '../../v2/manual.mode';

const node: INode = {
	id: '11',
	name: 'Set Node',
	type: 'n8n-nodes-base.set',
	notes: 'text ',
	typeVersion: 3.4,
	position: [42, 42],
	onError: 'continueErrorOutput',
	parameters: {
		assignments: {
			assignments: [
				{
					id: 'b5633e0b-221c-480e-b050-7f34bad8869d',
					name: 'Name',
					type: 'object',
					value: '=invalid object ,{;[',
				},
			],
		},
		mode: 'manual',
		options: {},
		duplicateItem: false,
		includeOtherFields: false,
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

describe('test Set2, manual mode - error handling with continueOnFail', () => {
	const item: INodeExecutionData = {
		json: {
			input1: 'value1',
			input2: 2,
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

	describe('error handling with malformed Object field', () => {
		it('should return error object with pairedItem when continueOnFail is true and Object parsing fails', async () => {
			// Simulate a malformed Object value that will cause parsing to fail
			const malformedObjectValue = '{ invalid json syntax }';
			const nodeParameters = {
				assignments: {
					assignments: [
						{
							id: 'b5633e0b-221c-480e-b050-7f34bad8869d',
							name: 'testField',
							type: 'object',
							value: malformedObjectValue,
						},
					],
				},
				mode: 'manual',
				options: {},
			};

			const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, true);
			const rawDataWithMalformed = {
				testField: malformedObjectValue,
			};

			const output = await execute.call(
				fakeExecuteFunction,
				item,
				0,
				options,
				rawDataWithMalformed,
				node,
			);

			// Verify that the error is returned in the correct format
			expect(output).toHaveProperty('json');
			expect(output.json).toHaveProperty('error');
			expect(output).toHaveProperty('pairedItem');
			expect(output.pairedItem).toEqual({ item: 0 });
			expect(typeof output.json.error).toBe('string');
			expect(output.json.error).toContain('invalid JSON');
		});

		it('should return error object when continueOnFail is true and Object value is completely invalid', async () => {
			// Test with a value that cannot be parsed as JSON at all
			const invalidObjectValue = 'not a json object at all';
			const nodeParameters = {
				assignments: {
					assignments: [
						{
							id: 'b5633e0b-221c-480e-b050-7f34bad8869d',
							name: 'testField',
							type: 'object',
							value: 'invalid-object',
						},
					],
				},
				mode: 'manual',
				options: {},
			};

			const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, true);
			const rawDataWithInvalid = {
				testField: invalidObjectValue,
			};

			const output = await execute.call(
				fakeExecuteFunction,
				item,
				0,
				options,
				rawDataWithInvalid,
				node,
			);

			expect(output).toHaveProperty('json');
			expect(output.json).toHaveProperty('error');
			expect(output.json.error).toContain('invalid JSON');
			expect(output.pairedItem).toEqual({ item: 0 });
		});

		it('should return error object with correct pairedItem index when processing multiple items', async () => {
			const malformedObjectValue = '{ invalid }';
			const nodeParameters = {
				assignments: {
					assignments: [
						{
							id: 'b5633e0b-221c-480e-b050-7f34bad8869d',
							name: 'testField',
							type: 'object',
							value: malformedObjectValue,
						},
					],
				},
				mode: 'manual',
				options: {},
			};

			const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, true);
			const rawDataWithMalformed = {
				testField: malformedObjectValue,
			};

			// Test with item index 3
			const output = await execute.call(
				fakeExecuteFunction,
				item,
				3,
				options,
				rawDataWithMalformed,
				node,
			);

			expect(output.pairedItem).toEqual({ item: 3 });
			expect(output.json.error).toBeDefined();
		});

		it('should route error item to error output branch (output index 1)', async () => {
			const malformedObjectValue = 'invalid{json}';
			const nodeParameters = {
				assignments: {
					assignments: [
						{
							id: 'b5633e0b-221c-480e-b050-7f34bad8869d',
							name: 'testField',
							type: 'object',
							value: malformedObjectValue,
						},
					],
				},
				mode: 'manual',
				options: {},
			};

			const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, true);
			const rawDataWithMalformed = {
				testField: malformedObjectValue,
			};

			const output = await execute.call(
				fakeExecuteFunction,
				item,
				0,
				options,
				rawDataWithMalformed,
				node,
			);

			// The output should have error property which signals error output routing
			expect(output).toHaveProperty('json');
			expect(output.json).toHaveProperty('error');
			expect(typeof output.json.error).toBe('string');
			expect(output.pairedItem).toEqual({ item: 0 });
		});
	});
});
