import type { INodeType } from 'n8n-workflow';
import type { WorkflowTestData } from '../../../../test/nodes/types';

import * as Helpers from '../../../../test/nodes/Helpers';
import { executeWorkflow } from '../../../../test/nodes/ExecuteWorkflow';
import { ManualTrigger } from '../../../ManualTrigger/ManualTrigger.node';
import { Code } from '../../../Code/Code.node';
import { Set } from '../../../Set/Set.node';
import { If } from '../../../If/If.node';
import { NoOp } from '../../../NoOp/NoOp.node';

describe('Execute ItemLists Node', () => {
	const tests: WorkflowTestData[] = [
		{
			description: 'should execute IF node true/false boolean',
			input: {
				workflowData: Helpers.readJsonFileSync(
					'nodes/ItemLists/test/node/ItemLists.limit.workflow.json',
				),
			},
			output: {
				nodeData: {
					'On True': [
						[
							{
								value: true,
							},
						],
					],
					'On False': [
						[
							{
								value: false,
							},
						],
					],
				},
			},
		},
	];

	const nodes: INodeType[] = [new ManualTrigger(), new Code(), new Set(), new If(), new NoOp()];
	const nodeTypes = Helpers.setup(nodes);

	const executeTest = async (testData: WorkflowTestData) => {
		// execute workflow
		const { result } = await executeWorkflow(testData, nodeTypes);

		// check if result node data matches expected test data
		const resultNodeData = Helpers.getResultNodeData(result, testData);

		resultNodeData.forEach(({ nodeName, resultData }) =>
			expect(resultData).toEqual(testData.output.nodeData[nodeName]),
		);

		expect(result.finished).toEqual(true);
	};

	for (const testData of tests) {
		test(testData.description, async () => executeTest(testData));
	}
});
