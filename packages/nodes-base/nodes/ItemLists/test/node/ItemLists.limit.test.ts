import type { INodeType } from 'n8n-workflow';

import type { WorkflowTestData } from '../../../../test/nodes/types';

import * as Helpers from '../../../../test/nodes/Helpers';
import { executeWorkflow } from '../../../../test/nodes/ExecuteWorkflow';

import { ManualTrigger } from '../../../ManualTrigger/ManualTrigger.node';
import { Code } from '../../../Code/Code.node';
import { ItemLists } from '../../ItemLists.node';

describe('Execute ItemLists Node', () => {
	const tests: WorkflowTestData[] = [
		{
			description: 'should execute ItemLists limit operation',
			input: {
				workflowData: Helpers.readJsonFileSync(
					'nodes/ItemLists/test/node/ItemLists.limit.workflow.json',
				),
			},
			output: {
				nodeData: {
					'Item Lists limit first': [
						[
							{
								entry: 1,
							},
						],
					],
					'Item Lists limit last': [
						[
							{
								entry: 5,
							},
						],
					],
				},
			},
		},
	];

	const nodes: INodeType[] = [new ManualTrigger(), new Code(), new ItemLists()];
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
