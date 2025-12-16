import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { mock } from 'jest-mock-extended';
import get from 'lodash/get';
import {
	NodeOperationError,
	type IExecuteFunctions,
	type INodeTypeDescription,
	type IDataObject,
	type IGetNodeParameterOptions,
} from 'n8n-workflow';

import * as IfV2 from '../../V2/IfV2.node';

jest.mock('lodash/set', () => jest.fn());

describe('Test IF v2 Node Tests', () => {
	afterEach(() => jest.resetAllMocks());

	describe('Test IF v2 Node Workflow Tests', () => {
		new NodeTestHarness().setupTests();
	});

	describe('Test IF V2 Node Unit Tests', () => {
		const node = new IfV2.IfV2(mock<INodeTypeDescription>());

		const input = [{ json: {} }];

		const createMockExecuteFunction = (
			nodeParameters: IDataObject,
			continueOnFail: boolean = false,
		) => {
			const fakeExecuteFunction = {
				getNodeParameter(
					parameterName: string,
					itemIndex: number,
					fallbackValue?: IDataObject,
					options?: IGetNodeParameterOptions,
				) {
					const parameter = options?.extractValue ? `${parameterName}.value` : parameterName;

					const parameterValue = get(nodeParameters, parameter, fallbackValue);

					if ((parameterValue as IDataObject)?.nodeOperationError) {
						throw new NodeOperationError(mock(), 'Get Options Error', { itemIndex });
					}

					return parameterValue;
				},
				getNode() {
					return node;
				},
				continueOnFail: () => continueOnFail,
				getInputData: () => input,
			} as unknown as IExecuteFunctions;
			return fakeExecuteFunction;
		};

		it('should return items if continue on fail is true', async () => {
			const fakeExecuteFunction = createMockExecuteFunction(
				{ options: { nodeOperationError: true } },
				true,
			);

			const output = await node.execute.call(fakeExecuteFunction);
			expect(output).toEqual([[], input]);
		});

		it('should throw an error if continue on fail is false and if there is an error', async () => {
			const fakeExecuteFunction = createMockExecuteFunction(
				{ options: { nodeOperationError: true } },
				false,
			);

			await expect(node.execute.call(fakeExecuteFunction)).rejects.toThrow(NodeOperationError);
		});

		it('should assign a paired item if paired item is undefined', async () => {
			const fakeExecuteFunction = createMockExecuteFunction(
				{ options: {}, conditions: true },
				false,
			);

			const output = await node.execute.call(fakeExecuteFunction);
			expect(output).toEqual([[], [{ json: {}, pairedItem: { item: 0 } }]]);
		});
	});
});
