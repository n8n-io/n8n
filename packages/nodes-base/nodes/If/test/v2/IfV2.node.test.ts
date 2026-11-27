import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { mock } from 'vitest-mock-extended';
import get from 'lodash/get';
import {
	NodeConnectionTypes,
	NodeOperationError,
	type IExecuteFunctions,
	type INode,
	type INodeTypeDescription,
	type IDataObject,
	type IGetNodeParameterOptions,
	type WorkflowTestData,
} from 'n8n-workflow';

import * as IfV2 from '../../V2/IfV2.node';

vi.mock('lodash/set', () => ({ default: vi.fn() }));

describe('Test IF v2 Node Tests', () => {
	afterEach(() => vi.resetAllMocks());

	describe('Test IF v2 Node Workflow Tests', () => {
		const testHarness = new NodeTestHarness();
		testHarness.setupTests();

		describe('Single-value operator with hidden rightValue (NODE-5984)', () => {
			const createSingleValueWorkflowTest = ({
				description,
				rightValue,
				extraNodes = [],
			}: {
				description: string;
				rightValue: string;
				extraNodes?: INode[];
			}): WorkflowTestData => ({
				description,
				input: {
					workflowData: {
						nodes: [
							{
								parameters: {},
								id: 'trigger-node',
								name: 'When clicking "Execute workflow"',
								type: 'n8n-nodes-base.manualTrigger',
								typeVersion: 1,
								position: [0, 0],
							},
							{
								parameters: {
									data: [{ value: 'hello' }, {}],
								},
								id: 'data-node',
								name: 'TestData',
								type: 'n8n-nodes-testing.testData',
								typeVersion: 1,
								position: [200, 0],
							},
							{
								parameters: {
									conditions: {
										options: {
											caseSensitive: true,
											leftValue: '',
											typeValidation: 'strict',
											version: 3,
										},
										conditions: [
											{
												id: '277c454f-6cdb-4699-857b-3e676998c8a2',
												leftValue: '={{ $json.value }}',
												rightValue,
												operator: {
													type: 'string',
													operation: 'exists',
													singleValue: true,
												},
											},
										],
										combinator: 'and',
									},
									options: {},
								},
								id: 'if-node',
								name: 'If',
								type: 'n8n-nodes-base.if',
								typeVersion: 2.3,
								position: [400, 0],
							},
							{
								parameters: {},
								id: 'then-node',
								name: 'Then',
								type: 'n8n-nodes-base.noOp',
								typeVersion: 1,
								position: [600, -100],
							},
							{
								parameters: {},
								id: 'else-node',
								name: 'Else',
								type: 'n8n-nodes-base.noOp',
								typeVersion: 1,
								position: [600, 100],
							},
							...extraNodes,
						],
						connections: {
							'When clicking "Execute workflow"': {
								[NodeConnectionTypes.Main]: [
									[{ node: 'TestData', type: NodeConnectionTypes.Main, index: 0 }],
								],
							},
							TestData: {
								[NodeConnectionTypes.Main]: [
									[{ node: 'If', type: NodeConnectionTypes.Main, index: 0 }],
								],
							},
							If: {
								[NodeConnectionTypes.Main]: [
									[{ node: 'Then', type: NodeConnectionTypes.Main, index: 0 }],
									[{ node: 'Else', type: NodeConnectionTypes.Main, index: 0 }],
								],
							},
						},
					},
				},
				output: {
					nodeData: {
						Then: [[{ json: { value: 'hello' } }]],
						Else: [[{ json: {} }]],
					},
				},
			});

			// Happy path control test to prove the workflow setup executes as expected
			testHarness.setupTest(
				createSingleValueWorkflowTest({
					description: 'evaluates single-value exists operator when rightValue is empty',
					rightValue: '',
				}),
			);

			// NODE-5984: hidden rightValue referencing a deleted node should be ignored when singleValue is true
			const deletedNodeTestData = createSingleValueWorkflowTest({
				description:
					'ignores hidden rightValue referencing a deleted node for single-value operator (NODE-5984)',
				rightValue: "={{ $('x').item.json.x }}",
			});
			testHarness.setupTest(deletedNodeTestData, {
				customAssertions: () => {
					const ifNode = deletedNodeTestData.input.workflowData.nodes.find((n) => n.name === 'If');
					expect(get(ifNode?.parameters, 'conditions.conditions[0].rightValue')).toBe(
						"={{ $('x').item.json.x }}",
					);
				},
			});

			// NODE-5984: hidden rightValue referencing an unexecuted node should also be ignored
			testHarness.setupTest(
				createSingleValueWorkflowTest({
					description:
						'ignores hidden rightValue referencing an unexecuted node for single-value operator (NODE-5984)',
					rightValue: "={{ $('Unexecuted').first().json.x }}",
					extraNodes: [
						{
							parameters: {},
							id: 'unexecuted-node',
							name: 'Unexecuted',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [200, 200],
						},
					],
				}),
			);
		});
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
