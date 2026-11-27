import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import get from 'lodash/get';
import { NodeConnectionTypes, type INode, type WorkflowTestData } from 'n8n-workflow';

describe('Test Filter Node', () => {
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
							id: 'filter-node',
							name: 'Filter',
							type: 'n8n-nodes-base.filter',
							typeVersion: 2.3,
							position: [400, 0],
						},
						{
							parameters: {},
							id: 'kept-node',
							name: 'Kept',
							type: 'n8n-nodes-base.noOp',
							typeVersion: 1,
							position: [600, 0],
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
								[{ node: 'Filter', type: NodeConnectionTypes.Main, index: 0 }],
							],
						},
						Filter: {
							[NodeConnectionTypes.Main]: [
								[{ node: 'Kept', type: NodeConnectionTypes.Main, index: 0 }],
							],
						},
					},
				},
			},
			output: {
				nodeData: {
					Kept: [[{ json: { value: 'hello' } }]],
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
				const filterNode = deletedNodeTestData.input.workflowData.nodes.find(
					(n) => n.name === 'Filter',
				);
				expect(get(filterNode?.parameters, 'conditions.conditions[0].rightValue')).toBe(
					"={{ $('x').item.json.x }}",
				);
			},
		});

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
